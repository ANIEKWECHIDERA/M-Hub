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

Performance note:

- The auth pipeline now uses short-lived in-memory caching for verified Firebase tokens, DB user records, onboarding state, and resolved team membership
- Cache invalidation is wired through user/profile updates, workspace switches, company creation, invite acceptance, and team-member mutations
- The shared cache implementation lives in `server/src/services/requestCache.service.ts`
- This is an in-process optimization, not a distributed cache; if the backend is scaled to multiple instances later, move these entries to Redis or another shared cache
- Cache namespaces currently in use:
  - `token`: verified Firebase token payloads keyed as `token:{sha256(token)}`
  - `user`: app user records keyed as `user:{firebaseUid}`
  - `onboarding`: derived onboarding state keyed as `onboarding:{firebaseUid}`
  - `team_member`: resolved active membership keyed as `team_member:{userId}:{companyId}`
  - `notification`: notification list payloads keyed as `notification:{companyId}:{userId}:limit={n}`
- Cache instrumentation now tracks per-namespace hits, misses, sets, invalidations, TTL usage, and sampled request-path metadata
- Admin-only cache metrics are available at `GET /api/cache-metrics`
- Notification cache keys include workspace, user, and `limit`, and notification ETags are scoped to `companyId + userId + limit + payload`
- Current invalidation strategy:
  - `invalidateUserContext(...)` clears `user`, `onboarding`, `team_member`, and `notification` entries related to that user
  - notification mutation paths use `invalidateNotificationUser(...)`
  - team-member create/update/delete now also resync `users.has_company` and `users.company_id` before invalidation so fresh reads are correct
- Known limitation:
  - because the cache is process-local, metrics and cache contents are per backend instance and are lost on restart
  - in a multi-instance deployment, two users may hit different warm/cold instances and observe different cache hit rates
- Redis migration path:
  - move namespace maps to Redis keys with the same scope rules
  - keep token values hashed before storage
  - preserve short TTLs
  - move invalidation helpers to shared Redis key patterns/sets
  - keep the local metrics shape, but emit to a shared metrics backend instead of only process-local logs/snapshots

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

### 8. Notifications are now backend-backed and workspace-aware

The app no longer uses mock notifications in the shell.

- Backend routes live in `server/src/routes/notification.routes.ts`
- Backend logic lives in `server/src/controllers/notification.controller.ts` and `server/src/services/notification.service.ts`
- Frontend state lives in `client/src/context/NotificationContext.tsx`
- Header UI lives in `client/src/components/Header.tsx`

Notification state is scoped to the authenticated user and active workspace.
The frontend resets notification state on workspace change, refetches the latest list, and subscribes to a lightweight SSE stream for live updates.

Realtime behavior:

- Primary realtime path is SSE via `/api/notifications/stream?token=...`
- The frontend does not continuously poll while the stream is healthy; it only falls back to light periodic refresh if the SSE connection becomes unhealthy
- Notification list and unread count should always be updated from the same shared context, not recomputed separately in the header

### 9. Comments now support project-scoped realtime updates

- Backend comment stream route: `/api/comments/stream?token=...&projectId=...`
- Backend event bus: `server/src/services/commentRealtime.service.ts`
- Frontend live state: `client/src/context/CommentContext.tsx`
- Comment UI surface: `client/src/components/CommentsSystem.tsx`

Comments are project-scoped and now update live for everyone in the active project stream.
The composer stays pinned to the bottom of the comments surface while the thread scrolls independently above it.

### 10. Chat backend foundation now exists in the schema

Phase 1 chat data modeling is now added to the backend schema.

New chat tables/models:

- `chat_conversations`
- `chat_conversation_members`
- `chat_messages`
- `chat_message_tags`
- `chat_message_edits`

Design rules currently encoded in the schema/migration:

- all chat entities are company-scoped
- direct and group conversations share one conversation model
- direct conversations use a unique `direct_key` so only one DM exists per user pair per workspace/company
- group membership is modeled explicitly in `chat_conversation_members`
- unread state is intended to use per-member read cursors via `last_read_message_id` and `last_read_at`
- per-conversation notification preferences are stored on the membership row via `notifications_muted`
- system/audit events are expected to be represented as `chat_messages` with `message_type = 'system'`
- typing and presence are intentionally not persisted in the main schema; plan to use Supabase Realtime presence/broadcast for those

Important constraints/indexes added:

- partial unique active membership indexes on `(conversation_id, user_id)` and `(conversation_id, team_member_id)` where `removed_at IS NULL`
- descending pagination index on chat messages by `(conversation_id, created_at DESC, id DESC)`
- conversation list index on `(company_id, last_message_at DESC)`
- `direct_key` uniqueness for DMs
- message tag uniqueness on `(message_id, tag)`

Known Phase 1 limitation:

- the frontend `Chat.tsx` is still mock-data based
- no chat routes/services/controllers/realtime handlers exist yet
- presence, typing, moderation actions, and message notifications are not implemented yet

Recommended Phase 2 direction:

- add conversation/member/message services first
- enforce tenant and participant authorization in backend middleware/service queries
- use cursor pagination for message history from day one
- use Supabase Realtime for message row changes and ephemeral broadcast/presence for typing/online state

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
- Notification helpers: `client/src/lib/notifications.ts`
- Shared timestamp helpers: `client/src/lib/datetime.ts`

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
- If changing notifications, verify list fetch, unread count, mark-one, mark-all, stream cleanup, and workspace reset behavior together

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
- `My Tasks` is available to every role, but the data must stay scoped to the authenticated user plus active company; never treat it as a company-wide task list
- Team tables are read-only for `team_member`
- Last-login state is refreshed on authenticated activity through a throttled backend touch that updates both the `users` row and related `team_members` rows
- Upload progress bars now appear only while uploads are active
- Profile photo updates now map API fields into shared user state immediately
- Settings navigation now uses sidebar-driven subgroups instead of in-page tabs, and invite operations live in a dedicated Invites section
- Settings subsection state is URL-driven via `?section=...`, and the main app sidebar is the primary navigator for those subsections
- Chat subsection state is also URL-driven via `?section=...`, with the main app sidebar as the primary navigator for `All`, `Projects`, and `Direct`
- Project and task CRUD now prefer optimistic UI updates with rollback on failure, and create/edit dialogs close immediately on submit attempt instead of waiting for the network round-trip
- Shared project progress should be treated as backend-canonical. Use project response fields like `progress`, `task_count`, and `completed_task_count` for project-level progress UI instead of recomputing from whatever task slice a client currently has loaded
- Notifications are now fetched from the backend, rendered from shared context in the header popover, and updated live through SSE plus periodic reconciliation polling
- Backend notification list responses now use a short-lived user-scoped response cache with explicit ETag handling so repeated identical reads can return cached `304`/JSON responses without recomputing the payload
- Comments now render real author data from the backend, update in realtime through project-scoped SSE, and use a bottom-pinned composer with upward scrolling history
- Chat keeps a desktop split view, but on small screens it behaves like a modern messaging app: conversation list first, then a conversation detail view with an inline back button
- Dashboard stats and filters can be collapsed on small screens to preserve space without changing the desktop information density
- Project detail mirrors that small-screen pattern: use a `Show overview` toggle for summary cards on mobile, keep the tab region height-bound, and let only the active tab panel scroll
- Keep the Overview tab itself static when its content fits; prefer richer summary cards there over turning it into another scrolling pane

New patterns introduced:

- Use `AuthContext` workspace-switch state for global company-switch transitions
- Prefer shared context syncing over local duplicated user/workspace state
- For profile image updates, normalize backend snake_case fields before merging into frontend user state
- Use shadcn tooltips for collapsed icon-only navigation
- For settings-like areas, prefer sidebar submenus tied to URL state over in-page tabs when users need deep linking and persistent navigation context
- Reuse the same URL-driven sidebar submenu pattern for other multi-view surfaces like Chat when they need persistent navigation context
- For project/task create and edit dialogs, close the modal as soon as submit is attempted and rely on optimistic context updates plus rollback if the request fails
- Clamp progress UI values to `0..100` at the shared `Progress` component so bars render consistently even during optimistic updates
- For notifications, keep unread count and list in a single shared context, and merge incoming realtime events by notification `id` to avoid duplicates
- For request-heavy authenticated endpoints, prefer cache-aware middleware/service changes over adding more frontend polling
- For timestamps in comments, notifications, invites, and team last-login views, use the shared helpers in `client/src/lib/datetime.ts` instead of ad hoc `Date` math
- Relative timestamps should prefer `now` instead of phrases like `this minute` for very recent events
- For comments, prefer a fixed composer footer inside an `overflow-hidden` panel over `sticky` positioning so the page itself never pushes the composer off screen

Assumptions currently in use:

- `settings` doubles as the profile surface for non-admin users
- `tools` is treated as an admin-only route
- Team-member users may view team rosters but not management metadata or actions
- Invite creation, invite status, and invite cancellation should all live under the dedicated Settings > Invites section for non-team-members
- Notification navigation is derived from structured notification `type` strings like `task_assigned:taskId:projectId` instead of extra DB metadata columns
- Realtime notifications currently use SSE on a single app server process; the silent polling fallback helps reconcile state if the stream disconnects

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
