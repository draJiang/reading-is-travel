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

const samples = [
  ['lisbon', 'LISBON', '#e9dfd2', '#986d4f', 'A tram crossed the hill while I read about the sea. The story stayed with me longer than the view.', 'lisbon'],
  ['kyoto', 'KYOTO', '#dce2d6', '#627763', 'One page described a garden after rain. I slowed down at every sentence, as if walking along its stones.', 'kyoto'],
  ['istanbul', 'ISTANBUL', '#dfdad0', '#705952', 'The ferry in the book arrived at dusk. I closed it and listened for water outside my own window.', 'istanbul'],
  ['berlin', 'BERLIN', '#e6dfd5', '#776057', 'A character kept a notebook of ordinary streets. It made the walk home feel worth remembering.', 'berlin'],
  ['rome', 'ROME', '#e5ddd0', '#8b6651', 'Between two chapters, a city appeared in the margins: warm stone, late light, and a quiet square.', 'rome'],
  ['newyork', 'NEW YORK', '#dce0db', '#526a68', 'I found a stranger reading on a train in the novel. We both missed our stop, at least for a moment.', 'newyork'],
  ['seoul', 'SEOUL', '#e4dedb', '#7c6269', 'The last chapter began in a small library. I wished I could stay there until the lights went out.', 'seoul'],
  ['prague', 'PRAGUE', '#e1ddd3', '#746558', 'A bridge appeared only once in the story, but I kept returning to it in my imagination.', 'prague'],
  ['mumbai', 'MUMBAI', '#e7dfcb', '#887047', 'The novel made room for the sound of a crowded morning. I could almost hear it between the lines.', 'mumbai'],
  ['cairo', 'CAIRO', '#e9e0d0', '#967652', 'I read about a letter carried across a city. Its destination mattered less than the hands it passed through.', 'cairo'],
  ['sydney', 'SYDNEY', '#dce3e0', '#567674', 'An ocean filled the chapter without a single map. I turned the page and felt farther from shore.', 'sydney'],
  ['mexicocity', 'MEXICO CITY', '#e8dbd2', '#935e4c', 'The book mentioned a market at noon. Color and conversation seemed to spill out of the paragraph.', 'mexicocity'],
  ['amsterdam', 'AMSTERDAM', '#dde2dc', '#5c746a', 'A bicycle leaned against a door in the story. That small detail made the whole street real.', 'amsterdam'],
  ['bangkok', 'BANGKOK', '#e9dfd0', '#907052', 'Rain interrupted the conversation in the book. For a while, the weather became the narrator.', 'bangkok'],
  ['shanghai', 'SHANGHAI', '#dce0dc', '#626f6c', 'I read the final page on my way home. The city outside the train had changed without moving at all.', 'shanghai'],
];

// Extra cards appear only on localhost; none are sent to the storage service.
demoPosts.push(...samples.map(([slug, label, background, accent, text, cityId], index) => {
  const number = index + 6;
  return {
    id: `demo-post-${number}`,
    authorId: demoUsers[index % demoUsers.length].id,
    cityId,
    createdAt: new Date(Date.UTC(2026, 9, 11 - index, 12, 0)).toISOString(),
    text,
    image: image(background, accent, `${label} / ${String(number).padStart(2, '0')}`, '<path d="M112 498h736M175 498V298l130-95 130 95v200M435 498V251l125-100 128 100v247M688 498V315h96v183M235 498v-98h70v98M508 498V357h72v141M160 342h250M472 299h180" fill="none" stroke="' + accent + '" stroke-width="11" stroke-linejoin="round"/>'),
  };
}));
