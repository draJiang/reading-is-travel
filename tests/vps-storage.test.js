import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('VPS storage persists posts and images and enforces author ownership', async t => {
  let createStorage;
  try { ({ createStorage } = await import('../src/vps-storage.js')); }
  catch (error) {
    if (error.code === 'ERR_UNKNOWN_BUILTIN_MODULE') return t.skip('node:sqlite requires Node 22.13+ with SQLite enabled');
    throw error;
  }
  const directory = mkdtempSync(path.join(tmpdir(), 'reading-storage-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const alice = { id: `reader-${'a'.repeat(64)}`, name: 'Alice' };
  const bob = { id: `reader-${'b'.repeat(64)}`, name: 'Bob' };
  const image = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const data = { text: '  A reading  ', cityId: 'paris', image: `data:image/jpeg;base64,${image.toString('base64')}` };
  let store = createStorage(directory);
  const post = store.publishPost(alice, data);
  assert.equal(post.text, 'A reading');
  assert.deepEqual(store.readImage(post.id), image);
  assert.deepEqual(store.listPosts().users, [alice]);
  assert.throws(() => store.deletePost(bob, post.id), /only delete your own/);
  assert.throws(() => store.publishPost(alice, { ...data, cityId: 'unlisted' }), /Pick a city/);
  assert.throws(() => store.publishPost(alice, { ...data, image: 'data:image/jpeg;base64,////' }), /usable compressed JPEG/);
  store.close();
  store = createStorage(directory);
  assert.equal(store.listPosts().posts[0].id, post.id);
  store.deletePost(alice, post.id);
  assert.equal(store.readImage(post.id), null);
  assert.equal(existsSync(path.join(directory, 'images', `${post.id}.jpg`)), false);
  assert.deepEqual(store.listPosts(), { posts: [], users: [] });
  store.close();
});
