# pipel8ne

pipel8ne is an open-source visual CI/CD pipeline builder — think n8n, but built for continuous integration and delivery workflows.

Design your pipelines with a drag-and-drop graph editor, connect directly to your Git platform, and push changes to your repositories without ever touching a YAML file manually.

## Vision

Most CI/CD tools force you to write and maintain configuration files by hand. pipel8ne takes a different approach: pipelines are built visually, stored in the platform, and synchronized directly with your repositories. The goal is to bridge the gap between visual pipeline design and the actual workflow files that live in your codebase — with direct integrations to GitHub, GitLab, and Azure DevOps.

## Features

**Today**

- **Visual graph editor** — build pipelines by connecting nodes on a canvas
- **3-level hierarchy** — organize work into Stages → Jobs → Steps
- **Step types** — trigger, shell command, Docker, Git, test, build, deploy, notification, condition
- **YAML export** — export to GitHub Actions, GitLab CI, or Azure DevOps format
- **Project management** — group pipelines by project, with public/private visibility
- **Authentication** — JWT-based auth with access/refresh tokens
- **Credentials & API keys** — securely store provider credentials and manage API keys
- **User management** — admin panel to create users and manage roles
- **Dark mode** — system preference detection with manual toggle

**Planned**

- **Platform integrations** — connect your GitHub, GitLab, or Azure DevOps accounts
- **Direct repo sync** — push pipeline changes directly to a repository branch, or by manual file import
- **Import from repo** — load and edit existing workflow files from a connected repository
- **Webhook triggers** — receive events from your platform and react in real time
- **More step types** — expanding the node library with new integrations and services

## Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, React Flow
- **Backend**: Node.js, Fastify, TypeScript
- **Database**: MongoDB

## Getting started

### Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) 18+ (for local development without Docker)

### Run with Docker

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/pipel8ne.git
   cd pipel8ne
   ```

2. Create a `.env` file at the root:

   ```env
   JWT_SECRET=your_secret_here
   SECRETS_ENCRYPTION_KEY=your_32_char_key_here
   ```

3. Start the stack:
   ```bash
   docker compose up
   ```

The app will be available at `http://localhost:3000`.

### Run locally (development)

A `docker-compose.dev.yml` is provided to spin up only the MongoDB instance, so you can run the backend and frontend directly on your machine.

**1. Start the database:**

```bash
docker compose -f docker-compose.dev.yml up -d
```

**2. Configure the backend environment:**

Copy the example env file and fill in the values:

```bash
cp backend/.env.example backend/.env
```

```env
DATABASE_URL=mongodb://pipel8ne:dev_password@localhost:27017/pipel8ne_dev?authSource=admin
JWT_SECRET=        # generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
SECRETS_ENCRYPTION_KEY=  # generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NODE_ENV=development
```

**3. Start the backend:**

```bash
cd backend
npm install
npm run dev
```

**4. Start the frontend:**

```bash
cd webapp
npm install
npm run dev
```

The frontend dev server starts at `http://localhost:5173` and proxies API requests to the backend on port 3000.

## Available scripts

**Frontend** (`webapp/`):

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start the development server |
| `npm run build`   | Build for production         |
| `npm run preview` | Preview the production build |
| `npm test`        | Run unit tests               |

**Backend** (`backend/`):

| Command         | Description                     |
| --------------- | ------------------------------- |
| `npm run dev`   | Start the backend in watch mode |
| `npm run build` | Compile TypeScript              |
| `npm start`     | Start the compiled backend      |

## Documentation

- [Architecture](docs/architecture.md) — backend hexagonal architecture, frontend structure, data flow
- [Pipeline concepts](docs/pipeline-concepts.md) — stages, jobs, steps, node types, YAML export
- [API reference](docs/api.md) — all REST endpoints
- [Development guide](docs/development.md) — local setup, env vars, scripts
- [Deployment](docs/deployment.md) — Docker, reverse proxy, production checklist
- [Contributing](docs/contributing.md) — how to add features, doc maintenance rules

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
