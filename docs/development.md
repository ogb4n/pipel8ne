# Development guide

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Docker](https://www.docker.com/) and Docker Compose

---

## Local setup

### 1. Start MongoDB

A dedicated Compose file spins up only the database, so you can run the backend directly on your machine:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts a MongoDB 7 instance on `localhost:27017` with:
- Username: `pipel8ne`
- Password: `dev_password`
- Database: `pipel8ne_dev`

### 2. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
DATABASE_URL=mongodb://pipel8ne:dev_password@localhost:27017/pipel8ne_dev?authSource=admin

# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=

# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SECRETS_ENCRYPTION_KEY=

NODE_ENV=development
```

`SECRETS_ENCRYPTION_KEY` must be exactly 32 bytes (64 hex characters). It encrypts stored credentials at rest.

### 3. Start the backend

```bash
cd backend
npm install
npm run dev
```

The API is available at `http://localhost:3000`. Swagger UI is at `http://localhost:3000/docs`.

### 4. Start the frontend

```bash
cd webapp
npm install
npm run dev
```

The frontend dev server starts at `http://localhost:5173` and proxies `/api/*` requests to the backend.

---

## Environment variables

### Backend (`backend/.env`)

| Variable               | Required | Description                                              |
|---|---|---|
| `DATABASE_URL`         | Yes      | MongoDB connection string                                |
| `JWT_SECRET`           | Yes      | Secret used to sign JWTs. Use a long random string.      |
| `SECRETS_ENCRYPTION_KEY` | Yes    | 32-byte hex key for AES-256-GCM credential encryption.   |
| `NODE_ENV`             | No       | `development` enables Swagger UI and detailed logs.      |
| `PORT`                 | No       | HTTP port (default: `3000`)                              |

### Frontend (`webapp/.env`)

The frontend has no mandatory env vars in development — it proxies to `localhost:3000` by default. To point to a different backend, set:

```env
VITE_API_BASE_URL=http://my-backend:3000
```

---

## Available scripts

### Backend (`backend/`)

| Command           | Description                                |
|---|---|
| `npm run dev`     | Start with ts-node in watch mode           |
| `npm run build`   | Compile TypeScript to `dist/`              |
| `npm start`       | Run the compiled output                    |

### Frontend (`webapp/`)

| Command           | Description                              |
|---|---|
| `npm run dev`     | Start the Vite development server        |
| `npm run build`   | Build for production into `dist/`        |
| `npm run preview` | Serve the production build locally       |
| `npm test`        | Run unit tests with Vitest               |

---

## First run — create an admin account

On a fresh installation, registration is enabled by default. Open `http://localhost:5173` and register your first account. You can then promote it to admin via the API or directly in MongoDB:

```bash
# In mongosh
use pipel8ne_dev
db.users.updateOne({ email: "you@example.com" }, { $set: { role: "admin" } })
```

Admins can then disable registration and create additional users from the Settings page.
