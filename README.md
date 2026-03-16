# M-Hub

M-Hub is a full-stack internal project management app for teams that need shared project, task, note, file, and member management in one place.

This repository is split into:

- `client/`: React 19 + Vite frontend
- `server/`: Express 5 + TypeScript backend

## Current Stack

- Frontend: React 19, React Router 7, Vite 7, Tailwind CSS, Radix UI
- Backend: Express 5, TypeScript, Firebase Admin
- Data layer: PostgreSQL, Prisma schema and migrations, Supabase JavaScript client for most runtime queries
- Auth: Firebase Authentication on the client, Firebase Admin token verification on the server
- File uploads: Cloudinary

## Repository Layout

```text
M-Hub/
|- client/
|  |- src/
|  |- package.json
|- server/
|  |- prisma/
|  |- src/
|  |- package.json
```

## How It Works

### Frontend

The frontend is a Vite app that renders authenticated and onboarding-gated routes for:

- dashboard
- projects
- project details
- my tasks
- notes
- settings
- chat and tools placeholders

Authentication state is managed with Firebase client auth, then synced to backend onboarding state through `/api/status`.

### Backend

The backend uses feature-based Express routes mounted under `/api`, including:

- auth
- users
- companies
- team members
- projects
- tasks and subtasks
- task assignees
- comments
- notes and note tags
- notifications
- assets
- invites
- user settings

The common request flow is:

1. Firebase bearer token verification
2. Profile sync into the app database
3. Optional authorization and company access checks
4. Controller and service execution

### Data Access

The repo currently uses Prisma and Supabase together:

- Prisma defines the schema in `server/prisma/schema.prisma`
- Prisma migrations live in `server/prisma/migrations`
- Prisma is used to verify DB connectivity and generate a client
- Supabase's server client is used for most application queries and mutations

That split is important when changing data models: schema changes should stay aligned with both Prisma migrations and Supabase table usage.

## Key Domain Models

Core tables defined in the Prisma schema include:

- `users`
- `companies`
- `team_members`
- `projects`
- `project_team_members`
- `tasks`
- `task_team_member_assignees`
- `subtasks`
- `assets`
- `comments`
- `notes`
- `note_tags`
- `notifications`
- `user_settings`
- `company_invite`

## Prerequisites

- Node.js
- npm
- PostgreSQL
- Firebase project for auth
- Supabase project or compatible PostgREST access
- Cloudinary account for uploads

## Environment

### Server

The backend expects environment variables in `server/.env`. Based on the current codebase, these values are required:

```env
PORT=5000
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-or-server-key
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account", ...}
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Client

The current frontend points directly to `http://localhost:5000` in `client/src/lib/api.ts`.

Firebase web config is currently checked into `client/src/firebase/firebase.ts`, so there is no separate client env file in the current implementation.

## Local Development

Install dependencies in each app:

```bash
cd client
npm install
```

```bash
cd server
npm install
```

Run the backend:

```bash
cd server
npm run dev
```

Run the frontend:

```bash
cd client
npm run dev
```

The backend defaults to port `5000`. The frontend uses the standard Vite dev workflow.

## Build Commands

Frontend:

```bash
cd client
npm run build
npm run preview
```

Backend:

```bash
cd server
npm run build
npm start
```

## Database Workflow

The Prisma schema lives at `server/prisma/schema.prisma`.

Typical schema workflow:

```bash
cd server
npx prisma migrate dev --name your_change_name
```

If you need to regenerate Prisma Client manually:

```bash
cd server
npx prisma generate
```

## Notable Implementation Details

- The server checks both Prisma DB connectivity and Firebase connectivity before booting.
- Invite management exists as a first-class backend feature through `company_invite`.
- Auth onboarding is enforced in the frontend through route guards that use backend onboarding state.
- The app uses multiple React context providers for projects, tasks, notes, assets, notifications, settings, clients, and team data.
- There is no root workspace script yet; client and server are run separately.

## Documentation Notes

This README was refreshed against the current repository and checked with Context7 MCP for:

- Vite workflow
- Prisma migration workflow
- Supabase JavaScript query usage
