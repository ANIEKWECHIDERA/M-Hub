# Agent Guide for M-Hub

## Purpose

This repository contains M-Hub, a full-stack internal project management app with a separate frontend and backend.

Use this file as the quick-start guide before making code or documentation changes.

## Repository Shape

```text
M-Hub/
|- client/   # React 19 + Vite frontend
|- server/   # Express 5 + TypeScript backend
```

There is no root workspace package script. Treat `client` and `server` as separate apps.

## Tech Stack

- Frontend: React 19, React Router 7, Vite 7, Tailwind CSS, Radix UI
- Backend: Express 5, TypeScript
- Auth: Firebase client auth + Firebase Admin token verification
- Data: PostgreSQL, Prisma schema and migrations, Supabase JS runtime queries
- Uploads: Cloudinary

## Key Architectural Facts

### 1. Prisma and Supabase are both in use

This project does not use Prisma alone.

- Prisma owns the schema in `server/prisma/schema.prisma`
- Prisma migrations live in `server/prisma/migrations`
- Prisma is also used for DB connection checks and generated client output
- Most backend services query data through `@supabase/supabase-js`

When changing tables or relations, verify both:

- Prisma schema and migration implications
- Existing Supabase table names, select strings, and service queries

### 2. Auth has a two-step flow

Protected backend requests usually follow this sequence:

1. Firebase bearer token is verified
2. User is synced or loaded from the app database
3. Role or company membership is checked
4. Controller calls the relevant service

Relevant backend middleware:

- `server/src/middleware/verifyFirebaseToken.midddleware.ts`
- `server/src/middleware/profileSync.middleware.ts`
- `server/src/middleware/authorize.ts`
- `server/src/middleware/requireAppUser.middleware.ts`

### 3. Frontend routing depends on onboarding state

The frontend does not only check whether a user is signed in. It also checks backend onboarding state and can redirect users into:

- profile completion
- company creation

Before editing auth flows, inspect:

- `client/src/context/AuthContext.tsx`
- `client/src/components/auth/AuthGuard.tsx`
- `client/src/App.tsx`

### 4. Context-heavy frontend

The client uses multiple React context providers for project, task, note, asset, notification, settings, team member, client, and auth state.

Before introducing new global state, check whether an existing context already owns it.

## Important Paths

### Backend

- App bootstrap: `server/src/index.ts`
- Express app and route mounting: `server/src/app.ts`
- Prisma schema: `server/prisma/schema.prisma`
- Services: `server/src/services/`
- Controllers: `server/src/controllers/`
- Routes: `server/src/routes/`
- Middleware: `server/src/middleware/`

### Frontend

- App entry: `client/src/main.tsx`
- Routes: `client/src/App.tsx`
- Shared layout: `client/src/Layout.tsx`
- API helpers: `client/src/api/` and `client/src/lib/api.ts`
- Context providers: `client/src/context/`
- Pages: `client/src/pages/`
- Shared UI: `client/src/components/`

## Local Development

### Install dependencies

```bash
cd client
npm install
```

```bash
cd server
npm install
```

### Run frontend

```bash
cd client
npm run dev
```

### Run backend

```bash
cd server
npm run dev
```

### Build

Frontend:

```bash
cd client
npm run build
```

Backend:

```bash
cd server
npm run build
```

## Environment Notes

Backend environment values are expected in `server/.env`.

Important variables used directly in code:

- `PORT`
- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Frontend note:

- API base URL is currently hardcoded in `client/src/lib/api.ts` as `http://localhost:5000`
- Firebase web config is currently committed in `client/src/firebase/firebase.ts`

## Project Conventions

### Backend conventions

- Most business logic belongs in `services`
- Controllers should stay thin
- Feature routes are grouped by resource
- DB shaping is often handled with `dbSelect/`, DTOs, and mapper files

### Frontend conventions

- Feature pages live under `client/src/pages`
- API wrappers live under `client/src/api`
- Cross-feature state is generally kept in context providers
- Reusable UI primitives live under `client/src/components/ui`

## Things to Double-Check Before Editing

- If a backend field changes, search both Prisma schema and Supabase queries
- If a route is auth-protected, check middleware order before changing controller logic
- If a frontend page depends on onboarding state, test redirect behavior
- If changing uploads, inspect both multer middleware and Cloudinary service usage
- If changing invites, inspect route, controller, service, and `company_invite` schema together

## Known Sharp Edges

- Prisma and Supabase can drift if schema updates are only made in one mental model
- There is no meaningful backend test suite configured yet
- The frontend has a dense provider tree, so duplicated or misplaced providers can create confusing state behavior
- Some config is hardcoded and not yet fully environment-driven on the client

## Good Default Workflow for Agents

1. Read the relevant route, controller, and service before editing backend behavior
2. Read the page, context, and API wrapper before editing frontend behavior
3. Search for schema usage before renaming fields
4. Prefer small, scoped changes over broad refactors unless explicitly requested
5. Update docs when architecture, setup, or developer workflow changes

## Recommended First Checks for Any Task

- `README.md`
- `server/prisma/schema.prisma`
- `server/src/app.ts`
- `client/src/App.tsx`
- the feature-specific service and API files for the task at hand
