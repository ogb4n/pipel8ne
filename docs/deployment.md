# Deployment

## Docker (recommended)

The provided `docker-compose.yml` starts the full stack: MongoDB + backend. The backend serves the compiled frontend as static files.

### 1. Build the frontend

```bash
cd webapp
npm install
npm run build
```

The build output lands in `webapp/dist/`. The backend's static plugin serves it at `/`.

### 2. Configure environment variables

Create a `.env` file at the project root:

```env
JWT_SECRET=<long random string>
SECRETS_ENCRYPTION_KEY=<64 hex chars — 32 bytes>
```

Generate values:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # SECRETS_ENCRYPTION_KEY
```

### 3. Start the stack

```bash
docker compose up -d
```

The application is available at `http://localhost:3000`.

---

## Manual deployment (no Docker)

If you prefer to manage MongoDB separately:

### Backend

```bash
cd backend
npm install
npm run build
NODE_ENV=production \
  DATABASE_URL=mongodb://... \
  JWT_SECRET=... \
  SECRETS_ENCRYPTION_KEY=... \
  npm start
```

### Frontend

Build the SPA and copy `webapp/dist/` to any static host (Nginx, Vercel, Netlify, S3, etc.).

If hosting the frontend separately from the backend, set the API base URL before building:

```env
# webapp/.env.production
VITE_API_BASE_URL=https://api.your-domain.com
```

---

## Reverse proxy (Nginx example)

When running behind a reverse proxy, proxy all `/api/*` requests to the backend and serve the SPA for everything else:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /var/www/pipel8ne/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Production checklist

- [ ] `JWT_SECRET` is a long random string (64+ hex chars), not the default placeholder
- [ ] `SECRETS_ENCRYPTION_KEY` is exactly 32 bytes (64 hex chars), not the default placeholder
- [ ] `NODE_ENV=production` (disables Swagger UI)
- [ ] MongoDB is not exposed publicly (bind to localhost or use a private network)
- [ ] MongoDB has authentication enabled
- [ ] HTTPS is configured (via reverse proxy or cloud load balancer)
- [ ] Registration is disabled after initial setup if not needed (`PATCH /api/admin/settings`)
