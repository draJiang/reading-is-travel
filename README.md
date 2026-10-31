# Reading is Travel

A small public reading community. Posts and compressed images are committed to the public [reading-is-travel](https://github.com/draJiang/reading-is-travel) repository, under `content/posts/` and `content/images/`. The application code may be deployed to Vercel in the same repository.

## Setup

Deploy this repository to Vercel with the default framework preset (Other), root directory `.`, no build command, and set these server environment variables for Production (and Preview if needed):

- `GOOGLE_CLIENT_ID`: Google OAuth Web application client ID. Add the exact Vercel HTTPS origin to its authorized JavaScript origins in Google Cloud.
- `GITHUB_TOKEN`: fine-grained token scoped to **only** this repository with Contents read/write. Keep it secret.
- `SESSION_SECRET`: random secret of at least 32 characters (`openssl rand -base64 48`). Keep it secret; rotating it signs everyone out.

Redeploy after changing environment variables. Vercel serves static files and runs `api/index.js` as a serverless function. No persistent Node server or database is required. A Google ID token is signature-verified server-side; an HttpOnly signed cookie authenticates write requests. GitHub commits are the shared source of truth. Public author IDs are secret-salted hashes of Google account IDs (stable pseudonyms, not anonymous); display names and images are public. **Keep `SESSION_SECRET` stable:** rotating it changes author IDs, so existing posts cannot be deleted by their original author without migration. **Do not publish personal or sensitive content.** A delete only removes files from the current Git tree; history and forks may keep copies. Rate limiting, moderation and abuse handling are not yet implemented; do not open publishing to untrusted users without those controls.

For local development, use Node.js 18+ and export the same environment variables (never commit a `.env` file), then run `npm start`. Open `http://127.0.0.1:3000`, and authorize that origin in Google Cloud. Run `npm test` and `npm run check` for verification.

Existing posts in browser `localStorage` are **not migrated automatically**. Demo posts are fictional and are not committed. The map is approximate; nearby markers may overlap.
