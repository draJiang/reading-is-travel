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

## Deleting public content and Git history

The site's Delete button removes the post JSON and image from the **current branch only**. Earlier commits, forks, clones, caches, archives and copies made by other people may still contain both files. A public Git repository cannot promise complete erasure after publication; do not tell users that Delete permanently destroys their content.

If a post must be removed from this repository's reachable history, an administrator can:

1. Immediately remove the post from the live branch with the normal Delete action. Note its post ID and both paths: `content/posts/<id>.json` and `content/images/<id>.jpg`. Stop new writes during cleanup and make a secure backup of the repository first.
2. On a fresh local clone, use a current `git-filter-repo` to remove **both exact paths from all refs** (branches and tags). Inspect the rewritten history and verify the paths are no longer reachable. This rewrites commit hashes for everyone; coordinate with collaborators and Vercel before force-pushing rewritten refs. Do not run history-rewrite commands against a dirty working tree.
3. Force-push the rewritten refs only after reviewing what will change. Ask collaborators to discard old clones or reclone; remove old branches, tags, pull-request refs and backups under your control that retain the original objects. Redeploy the rewritten revision and clear application/CDN caches under your control.
4. Follow GitHub's current sensitive-data removal guidance or contact GitHub Support when cached views or pull-request references still expose the data. GitHub garbage collection and cache invalidation are not fully controlled by this app; forks, external mirrors and downloaded copies cannot be recalled.

This is an exceptional **administrator procedure**, not something the API can safely do for each user deletion: rewriting history concurrently with new posts risks lost writes, breaks commit links and disrupts contributors. If reliable user-controlled permanent deletion is a product requirement, move user text and images to storage with real deletion semantics and keep only non-sensitive, explicitly archival material in Git. Even then, backups and third-party copies need a documented retention policy.
