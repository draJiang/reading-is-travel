// Demo content stays separate from localStorage and is never treated as a signed-in user's posts.
export const demoUsers = [
  { id: 'demo-lin', name: 'Forest Reader' },
  { id: 'demo-yu', name: 'Rain Study' },
  { id: 'demo-he', name: 'River Letters' },
];

const image = (background, accent, label, motif) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720"><rect width="960" height="720" fill="${background}"/><circle cx="768" cy="148" r="78" fill="${accent}" opacity=".55"/>${motif}<rect x="52" y="565" width="856" height="1" fill="${accent}"/><text x="58" y="630" fill="${accent}" font-family="Georgia,serif" font-size="48" letter-spacing="3">${label}</text><text x="58" y="675" fill="${accent}" font-family="Georgia,serif" font-size="18" letter-spacing="5">READING IS TRAVEL</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

export const demoPosts = [
  {
    id: 'demo-post-1', authorId: 'demo-lin', cityId: 'paris', createdAt: '2026-10-28T09:20:00.000Z',
    text: 'Reading A Moveable Feast, what stayed with me was not the cafés of Paris, but the freedom of walking into a city with a book under your arm.\n\nMaybe travel begins off the map: the moment someone opens a page.',
    image: image('#e9e0cf', '#784b3c', 'PARIS / 01', '<path d="M160 531h645M251 531l226-365 227 365M309 433h336M352 359h245M419 261h118M477 166v-48" fill="none" stroke="#784b3c" stroke-width="12" stroke-linecap="round"/><path d="M429 531V402h96v129" fill="none" stroke="#784b3c" stroke-width="9"/>'),
  },
  {
    id: 'demo-post-2', authorId: 'demo-yu', cityId: 'tokyo', createdAt: '2026-10-26T14:40:00.000Z',
    text: 'In a novel I found an old bookstore open late. Rain on the window; someone turning pages slowly inside.\n\nI like that Tokyo: not a destination, just a lamp briefly lit in the story.',
    image: image('#d9dfd7', '#546a5c', 'TOKYO / 02', '<path d="M127 530h705M170 500V278h160v222M380 500V210h185v290M620 500V330h175v170M171 343h159M380 290h185M380 371h185M620 397h175" fill="none" stroke="#546a5c" stroke-width="10"/><rect x="447" y="400" width="54" height="100" fill="#546a5c"/>'),
  },
  {
    id: 'demo-post-3', authorId: 'demo-he', cityId: 'dali', createdAt: '2026-10-22T03:15:00.000Z',
    text: 'I read someone writing about wind: down from the mountains, across the lake, into a letter never sent.\n\nClosing the book, I thought of Dali. The city was not named there—but reading lets you take a path of your own.',
    image: image('#e5e4d4', '#657b76', 'DALI / 03', '<path d="M70 438 239 246l97 122 140-206 165 244 89-118 159 150M70 438h819M80 490q120-40 240 0t240 0 240 0M90 537q120-40 240 0t240 0 240 0" fill="none" stroke="#657b76" stroke-width="11" stroke-linecap="round"/>'),
  },
  {
    id: 'demo-post-4', authorId: 'demo-lin', cityId: 'london', createdAt: '2026-10-17T08:00:00.000Z',
    text: 'From A Room of One’s Own I kept not only the room, but the thoughts that arrive while crossing a lawn.\n\nSome journeys need no departure—only a door you can close for thinking.',
    image: image('#ddd9cf', '#694e48', 'LONDON / 04', '<path d="M174 528h594M245 528V243h125v285M435 528V182h128v346M625 528V293h90v235M435 268h128M435 355h128M245 344h125M458 181l40-72 43 72" fill="none" stroke="#694e48" stroke-width="10"/><circle cx="500" cy="224" r="18" fill="#694e48"/>'),
  },
  {
    id: 'demo-post-5', authorId: 'demo-yu', cityId: null, createdAt: '2026-10-12T11:30:00.000Z',
    text: 'Today I read: “Some roads are for going home; some are for learning where home is.”\n\nI gave it no city. It could happen almost anywhere—or at the desk where anyone turns a page.',
    image: image('#e6ddd1', '#806957', 'ELSEWHERE / 05', '<path d="M170 225q155-60 305 16v271q-145-76-305-16ZM475 241q150-76 305-16v271q-150-60-305 16ZM475 241v271M207 275q110-24 230 25M207 330q110-24 230 25M514 302q110-48 228-28M514 359q110-48 228-28" fill="none" stroke="#806957" stroke-width="10" stroke-linejoin="round"/>'),
  },
];
