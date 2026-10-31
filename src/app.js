import { cities, getCity, cityLabel, findCity, projectCity } from './cities.js';
import { demoPosts, demoUsers } from './demo.js';

const $ = selector => document.querySelector(selector);
const main = $('#main');
const dialogs = { login: $('#login-dialog'), publish: $('#publish-dialog'), confirm: $('#publish-confirm-dialog'), detail: $('#detail-dialog'), delete: $('#delete-dialog') };
let state;
let pendingDelete = null;
let returnFocus = null;
let pendingLoginAction = null;
let previewUrl = null;
let lastImage = null;
let noticeTimer;
let publishBusy = false;
let pendingPublish = null;
let sessionUser = null;
let googleReady = false;
let shared = { users: [], posts: [] };
const localDemo = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const visiblePosts = () => [...state.posts, ...(localDemo ? demoPosts : [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const visibleUsers = () => [...state.users, ...(localDemo ? demoUsers : [])];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'hidden') node.hidden = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) node.append(child);
  return node;
}

function notice(message) {
  const box = $('#notice');
  box.textContent = message;
  box.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => box.hidden = true, 6000);
}

function openDialog(dialog) {
  returnFocus = document.activeElement;
  dialog.showModal();
}

for (const dialog of Object.values(dialogs)) {
  dialog.addEventListener('click', event => {
    if ((dialog === dialogs.publish || dialog === dialogs.confirm) && publishBusy) return;
    if (event.target === dialog || event.target.closest('[data-close]')) dialog.close();
  });
  dialog.addEventListener('cancel', event => { if ((dialog === dialogs.publish || dialog === dialogs.confirm) && publishBusy) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    if (dialog === dialogs.publish && !dialogs.confirm.open && !pendingPublish) clearPreview();
    if (dialog === dialogs.confirm && !publishBusy && pendingPublish && !dialogs.publish.open) {
      pendingPublish = null;
      clearPreview();
    }
    if (dialog === dialogs.login) pendingLoginAction = null;
    if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  });
}

function refresh() {
  state = { users: [...shared.users], posts: shared.posts, currentUserId: sessionUser?.id || null };
  if (sessionUser && !state.users.some(item => item.id === sessionUser.id)) state.users.push(sessionUser);
  $('#publish-button').disabled = false;
  renderAccount();
  renderRoute();
}

function renderAccount() {
  const account = $('#account');
  const user = sessionUser && state.users.find(item => item.id === sessionUser.id);
  account.replaceChildren();
  if (!user) {
    const login = el('button', { type: 'button', text: 'Sign in with Google' });
    login.addEventListener('click', () => { openDialog(dialogs.login); setupGoogle(); });
    account.append(login);
    return;
  }
  const logout = el('button', { type: 'button', text: 'Log out' });
  logout.addEventListener('click', async () => {
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Could not sign out. Please try again.');
      sessionUser = null;
      window.google?.accounts.id.disableAutoSelect();
      refresh(); notice('Signed out.');
    }
    catch (error) { notice(error.message); }
  });
  account.append(el('a', { href: `#/user/${encodeURIComponent(user.id)}`, text: user.name }), logout);
}

function navigate(hash) {
  if (location.hash === hash) renderRoute();
  else location.hash = hash;
}

function route() {
  const segments = location.hash.replace(/^#\/?/, '').split('/');
  if (segments[0] === 'map') return { page: 'map', cityId: segments[1] || null };
  if (segments[0] === 'user') return { page: 'user', userId: segments[1] || '' };
  return { page: 'square' };
}

function renderRoute() {
  if (!state) return;
  const current = route();
  $('#square-link').removeAttribute('aria-current');
  if (current.page === 'square') $('#square-link').setAttribute('aria-current', 'page');
  if (current.page === 'user') renderUser(current.userId);
  else if (current.page === 'map') renderMap(current.cityId);
  else renderSquare();
}

function heading(title, subtitle) {
  return el('div', { className: 'page-heading' }, el('h1', { text: title }), el('p', { text: subtitle }));
}

function empty(title, description, action) {
  const section = el('section', { className: 'empty' }, el('h2', { text: title }), el('p', { text: description }));
  if (action) {
    const button = el('button', { type: 'button', text: action });
    button.addEventListener('click', startPublish);
    section.append(button);
  }
  return section;
}

function cards(posts) {
  return el('div', { className: 'posts' }, ...posts.map(post => {
    const author = visibleUsers().find(user => user.id === post.authorId);
    const card = el('article', { className: 'post' });
    const open = el('button', { className: 'post-open', type: 'button', 'aria-label': `View reading by ${author.name}` },
      el('img', { src: post.image, alt: 'Uploaded reading image', loading: 'lazy', width: '320' }),
      el('p', { text: post.text }));
    open.addEventListener('click', () => showDetail(post.id));
    const meta = el('div', { className: 'meta' },
      el('a', { href: `#/user/${encodeURIComponent(author.id)}`, text: author.name }),
      el('time', { datetime: post.createdAt, text: formatDate(post.createdAt) }));
    if (post.cityId) meta.append(el('a', { className: 'city-link', href: `#/map/${post.cityId}`, text: cityLabel(getCity(post.cityId)) }));
    card.append(el('div', { className: 'post-card' }, open, meta));
    return card;
  }));
}

function formatDate(date) { return new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(date)); }

function renderSquare() {
  const posts = visiblePosts();
  main.replaceChildren(
    posts.length ? cards(posts) : empty('No stories yet', 'Share a photo and a few words to begin your reading trip.', 'Write the first one'));
}

function renderUser(id) {
  const user = visibleUsers().find(item => item.id === id);
  if (!user) {
    main.replaceChildren(empty('Author not found', 'This author does not exist, or the link is no longer valid.'), el('a', { href: '#/square', text: 'Back to Square' }));
    return;
  }
  const posts = visiblePosts().filter(post => post.authorId === id);
  main.replaceChildren(
    el('section', { className: 'profile' }, el('h1', { text: user.name }), el('p', { text: `${posts.length} reading${posts.length === 1 ? '' : 's'} · ${id === state.currentUserId ? 'Your profile' : 'Author profile'}` })),
    posts.length ? cards(posts) : empty('No readings yet', 'This author has not posted anything.'));
}

function renderMap(cityId) {
  const selected = getCity(cityId);
  const count = new Map();
  const posts = visiblePosts();
  for (const post of posts) if (post.cityId) count.set(post.cityId, (count.get(post.cityId) || 0) + 1);
  const map = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  map.setAttribute('viewBox', '0 0 1000 500');
  map.setAttribute('class', 'world-map');
  map.setAttribute('width', '100%');
  map.setAttribute('role', 'img');
  map.setAttribute('aria-label', 'Simplified world map. Use the city list below to choose cities with posts.');
  const bg = document.createElementNS(map.namespaceURI, 'image');
  bg.setAttribute('href', './assets/world.svg');
  bg.setAttribute('width', '1000'); bg.setAttribute('height', '500');
  map.append(bg);
  for (const [id, amount] of count) {
    const city = getCity(id);
    const { x, y } = projectCity(city);
    const group = document.createElementNS(map.namespaceURI, 'g');
    group.setAttribute('class', 'map-marker');
    group.setAttribute('tabindex', '0');
    group.setAttribute('role', 'button');
    group.setAttribute('aria-label', `${cityLabel(city)}, ${amount} reading${amount === 1 ? '' : 's'}`);
    group.setAttribute('aria-pressed', String(selected?.id === id));
    group.setAttribute('transform', `translate(${x} ${y})`);
    const circle = document.createElementNS(map.namespaceURI, 'circle');
    circle.setAttribute('r', '14');
    circle.setAttribute('fill', '#8a3b25');
    circle.setAttribute('stroke', 'white');
    circle.setAttribute('stroke-width', '2');
    const text = document.createElementNS(map.namespaceURI, 'text');
    text.setAttribute('y', '4');
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-size', '12');
    text.textContent = String(amount);
    group.append(circle, text);
    group.addEventListener('click', () => navigate(`#/map/${id}`));
    group.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`#/map/${id}`); }
    });
    map.append(group);
  }
  const choices = el('select', { id: 'map-city', 'aria-label': 'Filter by city' }, el('option', { value: '', text: 'All linked cities' }));
  for (const [id, amount] of [...count].sort((a, b) => cityLabel(getCity(a[0])).localeCompare(cityLabel(getCity(b[0])), 'en'))) {
    choices.append(el('option', { value: id, text: `${cityLabel(getCity(id))} · ${amount}` }));
  }
  choices.value = selected?.id || '';
  choices.addEventListener('change', () => navigate(choices.value ? `#/map/${choices.value}` : '#/map'));
  const clear = el('a', { href: '#/map', text: 'Clear filter' });
  const linkedCount = selected ? count.get(selected.id) || 0 : posts.filter(post => post.cityId).length;
  main.replaceChildren(heading('Map', 'Somewhere in the world, another life on the page.'),
    el('div', { className: 'map-wrap' }, map),
    el('div', { className: 'map-controls' }, el('label', { for: 'map-city', text: 'Linked city:' }), choices, ...(selected ? [clear] : [])),
    el('p', { className: 'map-note', text: 'The map shows approximate city positions; nearby markers may overlap—use the city list to select. Places are chosen freely by authors. Posts without a city still appear on Square.' }),
    heading(selected ? `Readings in ${selected.english}` : 'Readings with a place', `${linkedCount}`),
    ...(selected ? [count.has(selected.id) ? cards(posts.filter(post => post.cityId === selected.id)) : empty('No readings in this city', 'Browse Square for other reading trips.')]
      : [count.size ? cards(posts.filter(post => post.cityId)) : empty('No markers yet', 'Link a city when you publish, and the first marker will appear.', 'Share a reading')]));
}

function showDetail(id) {
  const post = visiblePosts().find(item => item.id === id);
  if (!post) return notice('This post no longer exists.');
  const author = visibleUsers().find(item => item.id === post.authorId);
  const profile = el('a', { href: `#/user/${encodeURIComponent(author.id)}`, text: author.name });
  profile.addEventListener('click', () => dialogs.detail.close());
  const meta = el('div', { className: 'meta' }, profile, el('time', { datetime: post.createdAt, text: formatDate(post.createdAt) }));
  if (post.cityId) {
    const city = el('a', { href: `#/map/${post.cityId}`, text: cityLabel(getCity(post.cityId)) });
    city.addEventListener('click', () => dialogs.detail.close());
    meta.append(city);
  }
  const article = $('#detail-content');
  article.replaceChildren(el('img', { className: 'detail-image', src: post.image, alt: 'Uploaded reading image', width: '480' }), el('p', { className: 'detail-text', text: post.text }), meta);
  if (post.authorId === state.currentUserId) {
    const remove = el('button', { type: 'button', text: 'Delete my reading' });
    remove.addEventListener('click', () => {
      dialogs.detail.close();
      pendingDelete = post.id;
      $('#delete-error').textContent = '';
      requestAnimationFrame(() => openDialog(dialogs.delete));
    });
    article.append(el('div', { className: 'actions' }, remove));
  }
  openDialog(dialogs.detail);
}

function startPublish() {
  if (sessionUser && state?.currentUserId === sessionUser.id) openDialog(dialogs.publish);
  else {
    pendingLoginAction = 'publish';
    openDialog(dialogs.login);
    setupGoogle();
  }
}

async function setupGoogle() {
  const error = $('#login-error');
  if (googleReady) return;
  try {
    const config = await fetch('/api/config').then(response => response.json());
    if (!config.clientId) throw new Error('Google sign-in is not configured. Set GOOGLE_CLIENT_ID on the server.');
    if (!window.google?.accounts?.id) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Could not load Google sign-in. Check your connection.'));
        document.head.append(script);
      });
    }
    window.google.accounts.id.initialize({ client_id: config.clientId, callback: handleGoogleCredential, auto_select: false });
    window.google.accounts.id.renderButton($('#google-button'), { theme: 'outline', size: 'large', text: 'signin_with' });
    googleReady = true;
    error.textContent = '';
  } catch (failure) { error.textContent = failure.message; }
}

async function handleGoogleCredential({ credential }) {
  try {
    const response = await fetch('/api/auth/google', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Google sign-in failed.');
    sessionUser = result.user;
    const next = pendingLoginAction;
    dialogs.login.close();
    refresh();
    notice('Signed in with Google.');
    if (next === 'publish') openDialog(dialogs.publish);
  } catch (error) { $('#login-error').textContent = error.message; }
}

function clearPreview() {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  lastImage = null;
  $('#image-preview').hidden = true;
}

$('#publish-button').addEventListener('click', startPublish);
$('#post-image').addEventListener('change', event => {
  clearPreview();
  const file = event.target.files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
    $('#publish-error').textContent = 'Choose a JPG, PNG, or WebP image up to 15 MB.';
    event.target.value = '';
    return;
  }
  $('#publish-error').textContent = '';
  lastImage = file;
  previewUrl = URL.createObjectURL(file);
  $('#image-preview').src = previewUrl;
  $('#image-preview').hidden = false;
});
$('#post-text').addEventListener('input', event => $('#text-count').textContent = `${event.target.value.length} / 6000`);

async function compressImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1440 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not process the image. Try another one.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.5, 0.35]) {
      const result = canvas.toDataURL('image/jpeg', quality);
      if (result.length <= 700000) return result;
    }
    throw new Error('The image is still too large after compression. Try a simpler picture.');
  } catch (error) {
    if (error.message.includes('image') || error.message.includes('picture')) throw error;
    throw new Error('Could not decode this image. Try a JPG, PNG, or WebP file.');
  } finally { URL.revokeObjectURL(url); }
}

$('#publish-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#submit-post');
  if (button.disabled) return;
  button.disabled = true;
  publishBusy = true;
  $('#publish-error').textContent = '';
  try {
    const cityValue = $('#post-city').value.trim();
    const city = cityValue ? findCity(cityValue) : null;
    if (cityValue && !city) throw new Error('Pick a city from the list, or leave the city blank.');
    const file = $('#post-image').files[0];
    if (!file || file !== lastImage || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) throw new Error('Choose a JPG, PNG, or WebP image up to 15 MB.');
    const image = await compressImage(file);
    pendingPublish = { image, text: $('#post-text').value, cityId: city?.id || null };
    publishBusy = false;
    dialogs.publish.close();
    requestAnimationFrame(() => openDialog(dialogs.confirm));
  } catch (error) { $('#publish-error').textContent = error.message; }
  finally { button.disabled = false; publishBusy = false; }
});

function backToPublish() {
  pendingPublish = null;
  dialogs.confirm.close();
  requestAnimationFrame(() => openDialog(dialogs.publish));
}

$('#publish-back').addEventListener('click', backToPublish);
$('#confirm-publish').addEventListener('click', async () => {
  if (!pendingPublish || publishBusy) return;
  const button = $('#confirm-publish');
  publishBusy = true;
  button.disabled = true;
  $('#publish-confirm-error').textContent = '';
  try {
    const response = await fetch('/api/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pendingPublish) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Publishing failed.');
    shared.posts.unshift(result.post);
    shared.users = shared.users.filter(user => user.id !== sessionUser.id).concat(sessionUser);
    pendingPublish = null;
    $('#publish-form').reset();
    $('#text-count').textContent = '0 / 6000';
    dialogs.confirm.close();
    clearPreview();
    navigate('#/square');
    refresh();
    notice('Your reading is now public.');
  } catch (error) { $('#publish-confirm-error').textContent = error.message; }
  finally { button.disabled = false; publishBusy = false; }
});

$('#delete-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(pendingDelete)}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Deletion failed.');
    shared.posts = shared.posts.filter(post => post.id !== pendingDelete);
    pendingDelete = null;
    dialogs.delete.close();
    refresh();
    notice('Reading removed from our server.');
  } catch (error) { $('#delete-error').textContent = error.message; }
});

$('#city-options').append(...cities.map(city => el('option', { value: cityLabel(city) })));
window.addEventListener('hashchange', renderRoute);
Promise.all(['/api/session', ...(localDemo ? [] : ['/api/posts'])].map(async url => {
  const response = await fetch(url);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load the community.');
  return result;
})).then(([session, posts]) => {
  sessionUser = session.user;
  if (posts) shared = posts;
  refresh();
}).catch(error => {
  if (localDemo) {
    refresh();
    notice(`Local preview is available, but sign-in could not be checked: ${error.message}`);
  } else {
    main.replaceChildren(empty('Could not load shared readings', error.message));
    $('#publish-button').disabled = true;
    notice(error.message);
  }
});
