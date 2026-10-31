import { getCity } from './cities.js';

export const STORAGE_KEY = 'reading-travel:v1';
export const MAX_STORAGE_CHARS = 4 * 1024 * 1024;
const emptyState = () => ({ version: 1, users: [], posts: [], currentUserId: null });
const idPattern = /^[a-zA-Z0-9-]{1,80}$/;
const imagePattern = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;

export function createStore(storage, uuid = () => crypto.randomUUID()) {
  function read() {
    let raw;
    try { raw = storage.getItem(STORAGE_KEY); }
    catch { throw new Error('This browser blocked local storage. Check privacy settings or try a normal window.'); }
    if (!raw) return emptyState();
    try {
      const state = JSON.parse(raw);
      if (state.version !== 1 || !Array.isArray(state.users) || !Array.isArray(state.posts)) throw new Error();
      const userIds = new Set();
      for (const user of state.users) {
        if (!idPattern.test(user.id) || userIds.has(user.id) || typeof user.name !== 'string' || !user.name.trim() || user.name.length > 30) throw new Error();
        userIds.add(user.id);
      }
      const postIds = new Set();
      for (const post of state.posts) {
        if (!idPattern.test(post.id) || postIds.has(post.id) || !userIds.has(post.authorId) || typeof post.text !== 'string' || !post.text.trim() || post.text.length > 6000 || typeof post.image !== 'string' || !imagePattern.test(post.image) || post.image.length > 700000 || !Number.isFinite(Date.parse(post.createdAt)) || (post.cityId !== null && !getCity(post.cityId))) throw new Error();
        postIds.add(post.id);
      }
      if (state.currentUserId !== null && !userIds.has(state.currentUserId)) throw new Error();
      return state;
    } catch { throw new Error('Local data could not be read. Operations are paused to avoid overwriting it. Back up the reading-travel:v1 data in this browser first.'); }
  }

  function write(state) {
    const raw = JSON.stringify(state);
    if (raw.length > MAX_STORAGE_CHARS) throw new Error('Local storage is full. Delete some of your posts, then try again.');
    try { storage.setItem(STORAGE_KEY, raw); }
    catch { throw new Error('Save failed: storage is full or disabled. Existing content was not changed. Check browser settings.'); }
    return state;
  }

  return {
    read,
    login(user) {
      if (!user || !/^google-\d{1,64}$/.test(user.id) || typeof user.name !== 'string' || !user.name.trim() || user.name.length > 30) throw new Error('Invalid verified Google account.');
      const state = read();
      const existing = state.users.find(item => item.id === user.id);
      if (existing) existing.name = user.name;
      else state.users.push({ id: user.id, name: user.name });
      state.currentUserId = user.id;
      return write(state);
    },
    logout() { const state = read(); state.currentUserId = null; return write(state); },
    publish({ text, image, cityId = null }) {
      const state = read();
      if (!state.currentUserId) throw new Error('Sign in with Google before publishing.');
      text = text.trim();
      if (!text || text.length > 6000) throw new Error('Enter between 1 and 6000 characters of text.');
      if (typeof image !== 'string' || !imagePattern.test(image) || image.length > 700000) throw new Error('Choose a usable image again.');
      if (cityId !== null && !getCity(cityId)) throw new Error('Pick a city from the list, or clear the location.');
      const post = { id: uuid(), authorId: state.currentUserId, text, image, cityId, createdAt: new Date().toISOString() };
      state.posts.unshift(post);
      write(state);
      return post;
    },
    deletePost(id) {
      const state = read();
      const post = state.posts.find(item => item.id === id);
      if (!post) throw new Error('This post no longer exists.');
      if (!state.currentUserId || post.authorId !== state.currentUserId) throw new Error('You can only delete your own posts.');
      state.posts = state.posts.filter(item => item.id !== id);
      return write(state);
    },
  };
}
