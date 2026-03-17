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
- UI system: shadcn/ui primitives with a sidebar-based authenticated shell
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

### 5. Workspace-aware UI shell

The authenticated app now uses a shadcn-style provider-based sidebar shell rather than a fixed custom sidebar.

- Shell primitives live in `client/src/components/ui/sidebar.tsx`
- The app sidebar implementation lives in `client/src/components/Sidebar.tsx`
- Workspace switching depends on backend workspace routes and `authStatus.companyId`

If you change workspace logic, check both the sidebar UI and the context providers that refetch when the active company changes.

### 6. Upload UX is progress-aware

Uploads now go through a shared progress-aware upload context instead of a generic loading strip.

- Shared upload UI: `client/src/context/UploadStatusContext.tsx`
- Image preprocessing helper: `client/src/lib/image-upload.ts`
- Profile/company images are optimized client-side before upload
- Asset uploads use explicit progress reporting

If uploads break, inspect both the frontend upload helper/context and `server/src/services/media.service.ts`.

### 7. Role-aware shell behavior

The authenticated UI is now partially role-aware for `team_member`.

- `team_member` navigation is intentionally limited to core work areas
- settings remain accessible as a profile surface, but admin/security/team-management actions are reduced
- admin-only routes should be guarded in `client/src/App.tsx`, not only hidden from navigation

When changing permissions, update both route access and visible UI actions.

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
- Image upload helper: `client/src/lib/image-upload.ts`

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
- Empty states should prefer the shadcn `Empty` component
- Upload feedback should prefer the shared `Progress`-based upload status UX
- The authenticated shell should stay visually flat: minimal shadows, stronger borders, quieter surfaces
- The authenticated shell should not scroll at the page level; keep scrolling inside content regions
- Sticky page headers/toolbars should be preferred on dense screens where filters and actions matter

### Client quick-create convention

Projects support quick-creating a client by name directly in the project form.

- New client names should be sent as `client: { name }`, not as `client_id`
- Backend project create/update logic resolves that into a `clients` row
- `ClientContext` should be refreshed after quick-create so dropdowns, tables, and filters stay in sync

### Workspace switching convention

Workspace switches should feel blocking and deterministic.

- Start the switch in `AuthContext` using the shared workspace-switch state
- Keep the UI blocked until key workspace-scoped contexts finish refetching
- Clear stale view state on workspace changes for pages that keep local selections open, especially My Tasks

If a page keeps local modal or selected-item state, consider a `key` tied to `authStatus.companyId` or an explicit reset effect.

## Things to Double-Check Before Editing

- If a backend field changes, search both Prisma schema and Supabase queries
- If a route is auth-protected, check middleware order before changing controller logic
- If a frontend page depends on onboarding state, test redirect behavior
- If changing uploads, inspect both multer middleware and Cloudinary service usage
- If changing invites, inspect route, controller, service, and `company_invite` schema together
- If changing workspace-scoped pages, verify they refetch correctly when `authStatus.companyId` changes

## Known Sharp Edges

- Prisma and Supabase can drift if schema updates are only made in one mental model
- There is no meaningful backend test suite configured yet
- The frontend has a dense provider tree, so duplicated or misplaced providers can create confusing state behavior
- Some config is hardcoded and not yet fully environment-driven on the client
- Cloudinary image uploads can fail on oversized or slow files; this repo now expects client-side image optimization plus friendly timeout messaging
- Context7 MCP has been unreliable in this environment, so verify local repo truth before assuming external docs are available
- The client still has unrelated existing TypeScript issues outside the shell/auth/upload changes; don’t assume a red client typecheck is caused by your last edit

## Recent UI/State Changes

Summary of recent changes:

- The main authenticated layout is now viewport-locked with inner scrolling only
- Sidebar navigation is grouped and tooltip-enabled when collapsed
- Workspace switches can show a blocking loading overlay until core contexts settle
- The workspace-switch loading overlay should cover the entire shell, including the sidebar, so clicks cannot leak through during company changes
- `team_member` users have a reduced navigation/admin surface
- Team tables are read-only for `team_member`
- Upload progress bars now appear only while uploads are active
- Profile photo updates now map API fields into shared user state immediately
- Settings navigation now uses sidebar-driven subgroups instead of in-page tabs, and invite operations live in a dedicated Invites section
- Settings subsection state is URL-driven via `?section=...`, and the main app sidebar is the primary navigator for those subsections
- Chat subsection state is also URL-driven via `?section=...`, with the main app sidebar as the primary navigator for `All`, `Projects`, and `Direct`
- Project and task CRUD now prefer optimistic UI updates with rollback on failure, and create/edit dialogs close immediately on submit attempt instead of waiting for the network round-trip

New patterns introduced:

- Use `AuthContext` workspace-switch state for global company-switch transitions
- Prefer shared context syncing over local duplicated user/workspace state
- For profile image updates, normalize backend snake_case fields before merging into frontend user state
- Use shadcn tooltips for collapsed icon-only navigation
- For settings-like areas, prefer sidebar submenus tied to URL state over in-page tabs when users need deep linking and persistent navigation context
- Reuse the same URL-driven sidebar submenu pattern for other multi-view surfaces like Chat when they need persistent navigation context
- For project/task create and edit dialogs, close the modal as soon as submit is attempted and rely on optimistic context updates plus rollback if the request fails

Assumptions currently in use:

- `settings` doubles as the profile surface for non-admin users
- `tools` is treated as an admin-only route
- Team-member users may view team rosters but not management metadata or actions
- Invite creation, invite status, and invite cancellation should all live under the dedicated Settings > Invites section for non-team-members

## Good Default Workflow for Agents

1. Read the relevant route, controller, and service before editing backend behavior
2. Read the page, context, and API wrapper before editing frontend behavior
3. Search for schema usage before renaming fields
4. Prefer small, scoped changes over broad refactors unless explicitly requested
5. Update docs when architecture, setup, or developer workflow changes
6. Remove generated `dist` folders after build/test runs if they were created during your work

## Recommended First Checks for Any Task

- `README.md`
- `server/prisma/schema.prisma`
- `server/src/app.ts`
- `client/src/App.tsx`
- the feature-specific service and API files for the task at hand
