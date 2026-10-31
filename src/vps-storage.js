import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getCity } from './cities.js';

const idPattern = /^[a-f0-9-]{36}$/;
const userPattern = /^reader-[a-f0-9]{64}$/;
const imagePattern = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})$/;
function invalid(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
function validUser(user) {
  if (!user || typeof user.id !== 'string' || !userPattern.test(user.id) || typeof user.name !== 'string' || !user.name.trim() || user.name.length > 30) invalid('Invalid author.');
}

export function createStorage(directory) {
  const relative = directory && path.relative(process.cwd(), directory);
  if (!directory || !path.isAbsolute(directory) || relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`))) throw new Error('STORAGE_DATA_DIR must be an absolute path outside the repository.');
  const images = path.join(directory, 'images');
  mkdirSync(images, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path.join(directory, 'readings.sqlite'));
  db.exec('PRAGMA busy_timeout=5000;');
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY, author_id TEXT NOT NULL, author_name TEXT NOT NULL,
      text TEXT NOT NULL, city_id TEXT, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS posts_created_at ON posts(created_at DESC);`);
  const all = db.prepare('SELECT id, author_id, author_name, text, city_id, created_at FROM posts ORDER BY created_at DESC, id DESC');
  const insert = db.prepare('INSERT INTO posts (id, author_id, author_name, text, city_id, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  const find = db.prepare('SELECT author_id FROM posts WHERE id = ?');
  const remove = db.prepare('DELETE FROM posts WHERE id = ? AND author_id = ?');
  const imageFile = id => path.join(images, `${id}.jpg`);
  const toPost = row => ({ id: row.id, authorId: row.author_id, text: row.text, cityId: row.city_id, createdAt: row.created_at, image: `/api/images/${row.id}` });

  return {
    listPosts() {
      const rows = all.all();
      return { posts: rows.map(toPost), users: [...new Map(rows.map(row => [row.author_id, { id: row.author_id, name: row.author_name }])).values()] };
    },
    publishPost(user, data) {
      validUser(user);
      const { text, image, cityId = null } = data || {};
      if (typeof text !== 'string' || !text.trim() || text.trim().length > 6000) invalid('Enter between 1 and 6000 characters of text.');
      if (cityId !== null && !getCity(cityId)) invalid('Pick a city from the list, or clear the location.');
      const match = typeof image === 'string' && image.length <= 700000 && image.match(imagePattern);
      if (!match) invalid('Choose a usable compressed JPEG image.');
      const bytes = Buffer.from(match[1], 'base64');
      if (!bytes.length || bytes.length > 525000 || bytes.toString('base64') !== match[1] || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) invalid('Choose a usable compressed JPEG image.');
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const temp = path.join(images, `.${id}.tmp`);
      try {
        writeFileSync(temp, bytes, { flag: 'wx', mode: 0o600 });
        renameSync(temp, imageFile(id));
        insert.run(id, user.id, user.name.trim(), text.trim(), cityId, createdAt);
      } catch (error) {
        for (const file of [temp, imageFile(id)]) {
          try { unlinkSync(file); } catch { /* File may not exist. */ }
        }
        throw error;
      }
      return { id, authorId: user.id, text: text.trim(), cityId, createdAt, image: `/api/images/${id}` };
    },
    deletePost(user, id) {
      validUser(user);
      if (!idPattern.test(id)) invalid('Invalid reading ID.');
      const post = find.get(id);
      if (!post) invalid('This post no longer exists.', 404);
      if (post.author_id !== user.id) invalid('You can only delete your own posts.', 403);
      // Removing the image first avoids serving a deleted post's image if disk deletion fails.
      try { unlinkSync(imageFile(id)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
      remove.run(id, user.id);
    },
    readImage(id) {
      if (!idPattern.test(id) || !find.get(id)) return null;
      try { return readFileSync(imageFile(id)); }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
    },
    close() { db.close(); },
  };
}
