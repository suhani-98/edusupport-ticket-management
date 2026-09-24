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
{ "success": true, "data": { "message": "EduSupport API is running", "database": "connected" } }
```

Local development accounts, created only by `npm run seed -w server`. These are fake and must not be used outside a local database. The script refuses to run when `NODE_ENV` is `production`.

| Role | Email | Password |
|---|---|---|
| student | student@edusupport.local | Student123 |
| staff | staff@edusupport.local | Staff1234 |
| manager | manager@edusupport.local | Manager123 |

## Environment variables

Server (`server/.env.example`):

| Name | Purpose |
|---|---|
| `NODE_ENV` | `development` or `production` |
| `PORT` | API port, default 4000 |
| `CLIENT_URL` | Browser origin allowed by CORS |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing secret. Required. Not sent to the client. |

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
| `npm run seed -w server` | Insert local users, categories, and SLA policies |
| `npm test -w server` | Auth, domain, and ticket API tests |
| `npm run build` | Compile the server, then the client |
| `npm run lint` | ESLint in both packages |
| `npm run format` | Prettier write |

## Current status

Authentication, ticket models, and ticket create/list/detail APIs are in place. Comments, activity history, dashboards, and the ticket UI are not implemented. See `docs/API.md` for role rules and example responses.
