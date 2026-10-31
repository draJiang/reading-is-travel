import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, STORAGE_KEY } from '../src/store.js';
import { findCity, projectCity } from '../src/cities.js';

const image = `data:image/jpeg;base64,${Buffer.from('sample').toString('base64')}`;
function fixture() {
  const data = new Map();
  let count = 0;
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  return { storage, data, store: createStore(storage, () => `id-${++count}`) };
}

test('login, publishing, refresh and owner deletion persist in storage', () => {
  const { store, storage } = fixture();
  assert.deepEqual(store.read().posts, []);
  const alice = store.login({ id: 'google-123', name: 'Alice' }).currentUserId;
  const post = store.publish({ text: '  A little story  ', image, cityId: 'paris' });
  assert.equal(post.text, 'A little story');
  assert.equal(createStore(storage).read().posts[0].id, post.id);
  assert.equal(store.login({ id: 'google-123', name: 'Alice' }).currentUserId, alice);
  store.login({ id: 'google-456', name: 'Bob' });
  assert.throws(() => store.deletePost(post.id), /only delete your own/);
  assert.throws(() => store.publish({ text: 'A', image, cityId: 'unknown' }), /city/);
  store.login({ id: 'google-123', name: 'Alice' });
  store.deletePost(post.id);
  assert.equal(store.read().posts.length, 0);
  store.logout();
  assert.throws(() => store.publish({ text: 'A', image }), /Sign in/);
});

test('same display name cannot impersonate another Google account', () => {
  const { store } = fixture();
  const first = store.login({ id: 'google-123', name: 'Alice' }).currentUserId;
  const second = store.login({ id: 'google-456', name: 'Alice' }).currentUserId;
  assert.notEqual(first, second);
  assert.throws(() => store.login('Alice'), /Invalid verified/);
});

test('failed writes leave existing content intact', () => {
  const { store, storage, data } = fixture();
  store.login({ id: 'google-123', name: 'Alice' });
  const old = data.get(STORAGE_KEY);
  storage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => store.publish({ text: 'test', image }), /Save failed/);
  assert.equal(data.get(STORAGE_KEY), old);
});

test('corrupt data is not overwritten by new login', () => {
  const { store, data } = fixture();
  data.set(STORAGE_KEY, '{invalid');
  assert.throws(() => store.login({ id: 'google-123', name: 'Alice' }), /paused/);
  assert.equal(data.get(STORAGE_KEY), '{invalid');
});

test('city matching and projected coordinates', () => {
  assert.equal(findCity('巴黎 Paris')?.id, 'paris');
  assert.equal(findCity('Paris')?.id, 'paris');
  assert.equal(findCity('not a city'), undefined);
  const point = projectCity(findCity('Beijing'));
  assert.ok(point.x > 500 && point.x < 1000 && point.y > 0 && point.y < 250);
});
