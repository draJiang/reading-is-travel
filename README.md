# Reading is Travel

A small public reading community. The static frontend and same-origin API run on Vercel; posts and images live on a separate VPS (SQLite + filesystem). Demo posts only appear on localhost.

## Requirements

- Node.js 22.13+ on the VPS for built-in `node:sqlite`; Node.js 22.13+ for local storage tests. Run `npm test` and `npm run check` before deployment. On Node versions where SQLite is experimental, run tests with `NODE_OPTIONS=--experimental-sqlite npm test`; `npm run start:storage` enables the flag automatically.
- A VPS subdomain resolving to the VPS, e.g. `storage.example.com`, with valid TLS on port 8443. Existing Caddy routes and the xray service on 443 must remain unchanged.
- A non-root service account and persistent directory **outside the Git checkout**, e.g. `/var/lib/reading-is-travel`, owned by the service account (permissions 0700). Do not serve it as static files.

## VPS storage service

Deploy the same code checkout to the VPS, then set server-only environment variables in a protected systemd EnvironmentFile (0600):

- `STORAGE_DATA_DIR=/var/lib/reading-is-travel`
- `STORAGE_SHARED_SECRET`: a random secret of at least 32 characters; generate with `openssl rand -base64 48`.
- Optionally `STORAGE_PORT=3001` (default 3001).

Run `npm run start:storage` under the unprivileged account with systemd. For example, configure `/etc/systemd/system/reading-storage.service` (replace the account and checkout paths):

```ini
[Unit]
Description=Reading is Travel storage
After=network.target

[Service]
Type=simple
User=reading
Group=reading
WorkingDirectory=/opt/reading-is-travel
EnvironmentFile=/etc/reading-storage.env
ExecStart=/usr/bin/node --experimental-sqlite --disable-warning=ExperimentalWarning /opt/reading-is-travel/storage-server.mjs
Restart=on-failure
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/reading-is-travel

[Install]
WantedBy=multi-user.target
```

Run `systemctl daemon-reload`, `systemctl enable --now reading-storage` and check `journalctl -u reading-storage`. Verify the Node path with `command -v node` first. The service binds **only** to `127.0.0.1:3001`. Append a new site block to the existing Caddyfile, preserving the old `tm.ing.one:8443` route:

```caddyfile
storage.example.com:8443 {
    reverse_proxy 127.0.0.1:3001
}
```

Point the new subdomain to the VPS, obtain a valid certificate, run `caddy validate` and reload Caddy. Ensure inbound TCP 8443 is allowed; existing Caddy routes and xray stay unchanged. Before switching reads/writes, verify an unsigned request to `https://storage.example.com:8443/posts` returns 401 (not a certificate or connection error). Port 8443 stays an authenticated service-to-service endpoint and must not be used from browser code. The storage service verifies HMAC signatures over method, path, timestamp and raw request body and rejects stale and repeated writes within one process lifetime; the Vercel API checks the Google session, and the storage service compares the supplied author ID with stored ownership on deletion. The VPS cannot independently verify Google identity. Do not share the secret or publish the EnvironmentFile.

## Vercel

Deploy with the default framework preset (Other), root directory `.`, no build command. Configure these environment variables (Production, and Preview only if deliberately using the same storage):

- `GOOGLE_CLIENT_ID`: Google OAuth Web application client ID. Register the exact Vercel HTTPS origin as an authorized JavaScript origin.
- `SESSION_SECRET`: existing random signing secret (at least 32 characters). Keep it stable: rotation changes author IDs, so existing users cannot delete their posts without migration.
- `STORAGE_SERVICE_URL=https://storage.example.com:8443` (an exact origin without a trailing slash)
- `STORAGE_SHARED_SECRET`: **the same secret** as on the VPS. Do not expose it with a `NEXT_PUBLIC_` or `VITE_` prefix.

Redeploy after changing environment variables. Login/session endpoints remain on Vercel; all post/image operations use the VPS. Test posts from the previous storage are not migrated. Do not configure Preview and Production with separate `SESSION_SECRET` values against the same data if they need to share authorship.

For local frontend-only preview, run `npm start` and open `http://127.0.0.1:3000` to see 20 fictional posts without configuring the VPS. To test real local writes, set `STORAGE_DATA_DIR` and `STORAGE_SHARED_SECRET`, start the storage service, then set `STORAGE_SERVICE_URL=http://127.0.0.1:3001` on the local frontend API, plus `GOOGLE_CLIENT_ID` and `SESSION_SECRET`. Local HTTP is permitted only for that loopback URL and is rejected on Vercel.

## Backups and deletion

Keep a scheduled off-VPS backup of both SQLite and the `images` directory, with a documented retention period and a tested restore. Use SQLite's online backup facility or safely stop writers while copying the database; do not copy only the main database while WAL writes are active. Keep secrets and backups out of version control. Deleting a post removes its server-side image and metadata, but cannot retrieve copies already downloaded by others or immediately erase retained backups.
