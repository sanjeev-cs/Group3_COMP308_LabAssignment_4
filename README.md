# Game Progress Platform

React + Vite frontend with ES module microfrontends and GraphQL microservices for authentication and game progress tracking.

## Architecture

### Frontend

- `frontend/apps/host`: main shell and routing
- `frontend/apps/auth`: login and sign-up experience
- `frontend/apps/progress`: player and admin panels
- `frontend/apps/shared`: shared Apollo, session, and background components

### Backend

- `backend/microservices/auth-service`: authentication service
- `backend/microservices/game-progress-service`: game progress and leaderboard service
- `backend/microservices/shared`: shared database, auth, and models

## Main Flow

- unauthenticated users are routed to `/auth`
- player accounts are routed to `/player`
- admin accounts are routed to `/admin`
- protected routes stay inaccessible without a valid session

## Environment

### Backend

Use `backend/.env.example` as the template.

Required values:

- `MONGODB_URI`
- `DB_NAME`
- `JWT_SECRET`
- `AUTH_SERVICE_PORT`
- `GAME_PROGRESS_SERVICE_PORT`
- `FRONTEND_URLS`

### Frontend

Use `frontend/.env.example` as the template.

Main values:

- `VITE_AUTH_GRAPHQL_URL`
- `VITE_PROGRESS_GRAPHQL_URL`
- `VITE_HOST_APP_URL`

Remote entry URLs in the frontend env are used for the built federation setup. In development, the host loads the auth and progress apps directly from the workspace.

## Development

### Backend

```bash
cd backend
npm install
npm run dev
```

Services:

- auth GraphQL: `http://localhost:4001/graphql`
- progress GraphQL: `http://localhost:4002/graphql`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Development app:

- host shell: `http://localhost:5173`

Primary routes:

- auth: `http://localhost:5173/auth`
- player panel: `http://localhost:5173/player`
- admin panel: `http://localhost:5173/admin`

Optional isolated frontend commands:

```bash
npm run dev:auth
npm run dev:progress
```

## Build

### Frontend

```bash
cd frontend
npm run build
```

Build output:

- `dist/host`
- `dist/auth`
- `dist/progress`

### Backend

```bash
cd backend
npm start
```

## Features

- login and sign-up flow with JWT-based authentication
- role-based routing for player and admin users
- player progress updates, level tracking, score tracking, and achievements
- live leaderboard refresh
- admin player removal feature
- Three.js space background
