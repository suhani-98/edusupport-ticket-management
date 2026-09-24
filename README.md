# EduSupport

Student support and ticket management platform for a college help desk. Students raise requests. Staff process them through a fixed status workflow. SLA state is tracked separately from ticket status.

This repository is the Edumerge Pre-Drive Product Engineering Assignment, Assignment 4.

## Tech stack

- Client: React, Vite, TypeScript, Tailwind CSS, React Router
- Server: Node.js, Express, TypeScript, MongoDB, Mongoose
- Tests (later): Playwright, Vitest
- Tooling: ESLint, Prettier, Docker Compose

## Project structure

```text
/
├── client/             React frontend
├── server/             Express API
├── docs/               Product and engineering notes
├── docker-compose.yml  Local MongoDB
├── package.json        npm workspaces
└── README.md
```

Product decisions live in `docs/`. The running app does not implement them yet.

## Local setup

Requirements: Node.js 20+, npm, and Docker if you want MongoDB.

```bash
npm install
copy server\.env.example server\.env
copy client\.env.example client\.env
docker compose up -d
npm run dev:server
npm run dev:client
```

The API listens on port 4000. The client listens on port 5173.

Health check:

```bash
curl http://localhost:4000/api/v1/health
```

```json
{ "success": true, "message": "EduSupport API is running" }
```

## Environment variables

Server (`server/.env.example`):

| Name | Purpose |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | API port, default 4000 |
| `CLIENT_ORIGIN` | Browser origin allowed by CORS |
| `MONGODB_URI` | MongoDB connection string, not used until models exist |

Client (`client/.env.example`):

| Name | Purpose |
|---|---|
| `VITE_API_URL` | API origin, default `http://localhost:4000` |

Do not commit `.env` files.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev:client` | Vite dev server |
| `npm run dev:server` | API with reload |
| `npm run build` | Compile the server, then the client |
| `npm run lint` | ESLint in both packages |
| `npm run format` | Prettier write |

## Current status

The monorepo, tooling, and `GET /api/v1/health` are in place. Authentication, database models, tickets, and dashboards are not implemented.
