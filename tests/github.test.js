import test from 'node:test';
import assert from 'node:assert/strict';
import { listPosts, publishPost, deletePost } from '../src/github.js';

const image = `data:image/jpeg;base64,${Buffer.from('test image').toString('base64')}`;
test('publishes to GitHub and only the author can remove the post', async t => {
  const oldFetch = globalThis.fetch;
  const oldToken = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'test-token';
  const files = new Map();
  globalThis.fetch = async (url, options = {}) => {
    const path = url.split('/contents/')[1];
    const method = options.method || 'GET';
    if (method === 'GET' && path === 'content/posts') return { ok: true, json: async () => [...files.keys()].filter(key => key.startsWith('content/posts/')).map(key => ({ name: key.split('/').pop(), type: 'file' })) };
    if (method === 'GET' && !files.has(path)) return { status: 404, ok: false };
    if (method === 'GET') return { ok: true, json: async () => ({ content: files.get(path), sha: 'sha' }) };
    if (method === 'PUT') files.set(path, JSON.parse(options.body).content);
    if (method === 'DELETE') files.delete(path);
    return { ok: true, json: async () => ({}) };
  };
  t.after(() => { globalThis.fetch = oldFetch; if (oldToken === undefined) delete process.env.GITHUB_TOKEN; else process.env.GITHUB_TOKEN = oldToken; });
  const user = { id: 'google-123', name: 'Reader' };
  const post = await publishPost(user, { text: ' A book ', image, cityId: 'paris' });
  assert.equal(post.authorId, user.id);
  assert.equal(post.text, 'A book');
  assert.equal(files.size, 2);
  const listing = await listPosts();
  assert.equal(listing.posts[0].id, post.id);
  assert.deepEqual(listing.users, [user]);
  await assert.rejects(deletePost({ id: 'google-456' }, post.id), /only delete your own/);
  await deletePost(user, post.id);
  assert.equal(files.size, 0);
});
