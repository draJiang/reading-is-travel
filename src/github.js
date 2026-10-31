import { randomUUID } from 'node:crypto';
import { getCity } from './cities.js';

const repo = 'draJiang/reading-is-travel';
const base = `https://api.github.com/repos/${repo}/contents/`;
const headers = () => ({ Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28' });
const imagePattern = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;
const idPattern = /^[a-f0-9-]{36}$/;

async function request(path, options = {}) {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not configured.');
  const response = await fetch(base + path, { ...options, headers: { ...headers(), ...options.headers }, cache: 'no-store' });
  if (response.status === 404 && options.missingOk) return null;
  if (!response.ok) throw new Error(`GitHub storage request failed (${response.status}).`);
  return response.json();
}
async function file(path) { return request(path, { missingOk: true }); }
function decode(item) { return Buffer.from(item.content.replace(/\s/g, ''), 'base64').toString('utf8'); }
async function put(path, content, message, sha) {
  return request(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, content: Buffer.from(content).toString('base64'), ...(sha ? { sha } : {}) }) });
}
function publicUser(id, name) { return { id, name }; }
function publicPost(post) {
  const { id, authorId, text, cityId, createdAt, image } = post;
  return { id, authorId, text, cityId, createdAt, image };
}

export async function listPosts() {
  const entries = await request('content/posts', { missingOk: true });
  if (!entries) return { users: [], posts: [] };
  if (!Array.isArray(entries)) throw new Error('Unexpected posts directory.');
  const records = await Promise.all(entries.filter(item => item.type === 'file' && /^[a-f0-9-]{36}\.json$/.test(item.name)).slice(0, 500).map(async item => {
    const content = await file(`content/posts/${item.name}`);
    return JSON.parse(decode(content));
  }));
  const users = [...new Map(records.map(post => [post.authorId, publicUser(post.authorId, post.authorName)])).values()];
  return { users, posts: records.map(publicPost).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
}

export async function publishPost(user, { text, image, cityId = null }) {
  if (typeof text !== 'string' || !text.trim() || text.trim().length > 6000) throw new Error('Enter between 1 and 6000 characters of text.');
  if (cityId !== null && !getCity(cityId)) throw new Error('Pick a city from the list, or clear the location.');
  const match = typeof image === 'string' && image.length <= 700000 && image.match(imagePattern);
  if (!match || Buffer.from(match[1], 'base64').length > 525000) throw new Error('Choose a usable compressed JPEG image.');
  const id = randomUUID();
  const imagePath = `content/images/${id}.jpg`;
  await put(imagePath, Buffer.from(match[1], 'base64'), `Add image for reading ${id}`);
  const post = { id, authorId: user.id, authorName: user.name, text: text.trim(), cityId, createdAt: new Date().toISOString(), image: `/api/images/${id}` };
  try { await put(`content/posts/${id}.json`, JSON.stringify(post, null, 2) + '\n', `Publish reading ${id}`); }
  catch (error) {
    try { const saved = await file(imagePath); await request(imagePath, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Clean up image ${id}`, sha: saved.sha }) }); }
    catch { /* A failed cleanup leaves an orphan image in the public repository. */ }
    throw error;
  }
  return publicPost(post);
}

export async function deletePost(user, id) {
  if (!idPattern.test(id)) throw new Error('Invalid reading ID.');
  const path = `content/posts/${id}.json`;
  const saved = await file(path);
  if (!saved) throw new Error('This post no longer exists.');
  const post = JSON.parse(decode(saved));
  if (post.authorId !== user.id) throw new Error('You can only delete your own posts.');
  await request(path, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Delete reading ${id}`, sha: saved.sha }) });
  const imagePath = `content/images/${id}.jpg`;
  const image = await file(imagePath);
  if (image) await request(imagePath, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Delete image ${id}`, sha: image.sha }) });
}

export async function readImage(id) {
  if (!idPattern.test(id)) return null;
  const saved = await file(`content/images/${id}.jpg`);
  return saved ? Buffer.from(saved.content.replace(/\s/g, ''), 'base64') : null;
}
