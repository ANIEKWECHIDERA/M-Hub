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
  - `chat_membership`: cached conversation access context keyed as `chat_membership:{companyId}:{conversationId}:{userId}`
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
  - move chat membership caching to Redis alongside shared membership-change invalidation when the backend is scaled beyond a single process

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

### 4a. Notes are now a real personal feature, not mock UI

The Notes feature is now backed by the real backend and is intentionally personal.

- Notes are scoped to:
  - authenticated user
  - active company/workspace
- Notes are not shared with teammates
- The frontend Notes surface lives in:
  - `client/src/pages/Notepad.tsx`
  - `client/src/context/NoteContext.tsx`
  - `client/src/components/notes/NoteEditor.tsx`
  - `client/src/api/notes.api.ts`
- The backend Notes surface lives in:
  - `server/src/routes/note.routes.ts`
  - `server/src/controllers/note.controller.ts`
  - `server/src/services/note.service.ts`
  - `server/src/lib/noteSanitizer.ts`

Notes reuse the existing `notes` and `note_tags` tables, but the feature was upgraded from a mock textarea flow to a richer Quill-based editor with autosave and safer persistence.

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

### 10. Chat backend foundation and Phase 2 authorization now exist

The chat backend is no longer schema-only. It now has an initial protected API surface plus server-side authorization.

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

Current backend files:

- Routes: `server/src/routes/chat.routes.ts`
- Controller: `server/src/controllers/chat.controller.ts`
- Services:
  - `server/src/services/chat.service.ts`
  - `server/src/services/chatAuthorization.service.ts`
  - `server/src/services/chatErrors.ts`
- DTO validation:
  - `server/src/dtos/chat.dto.ts`

Current Phase 2 authorization rules:

- all chat routes derive `company_id`, `user_id`, `team_member_id`, and `access` from the authenticated request; the client is not trusted for tenant scope or role claims
- direct conversations:
  - only active participants can view the conversation
  - only active participants can list/send/edit messages in that conversation
  - direct-message creation is restricted to exactly two distinct users in the active company
- group conversations:
  - only active members can view/send/edit within the group
  - removed members lose access immediately because membership checks require `removed_at IS NULL`
  - add member, remove member, and rename group actions require both:
    - active membership in that conversation
    - workspace `admin` or `superAdmin` access
- moderation-sensitive behavior:
  - system messages cannot be created by clients
  - `announcement` message tags are restricted to `admin` and `superAdmin`
  - message edits are limited to the original sender's active workspace membership

Current MVP endpoints:

- `GET /api/chat/stream?token=...`
- `GET /api/chat/conversations`
- `GET /api/chat/conversations/:conversationId`
- `GET /api/chat/conversations/:conversationId/messages`
- `POST /api/chat/conversations/direct`
- `POST /api/chat/conversations/group`
- `POST /api/chat/conversations/:conversationId/messages`
- `POST /api/chat/conversations/:conversationId/typing`
- `POST /api/chat/conversations/:conversationId/read`
- `PATCH /api/chat/conversations/:conversationId/preferences`
- `PATCH /api/chat/messages/:messageId`
- `DELETE /api/chat/messages/:messageId`
- `POST /api/chat/conversations/:conversationId/members`
- `DELETE /api/chat/conversations/:conversationId/members/:userId`
- `PATCH /api/chat/conversations/:conversationId`

Validation and contract notes:

- chat request payloads are validated with Zod before service execution
- direct chat creation can target either a user ID or a team-member ID, but server-side resolution always verifies the target belongs to the active company
- group creation/member-add flows can accept user IDs and/or team-member IDs, and the backend resolves them to active workspace members before writing rows
- conversation list and message history are cursor-ready via `cursorConversationId` and `cursorMessageId`
- list/message limits are bounded server-side, and both list endpoints now return `nextCursor`
- chat system/audit messages are server-only and should continue to be emitted by service methods for membership/name changes

Phase 3 conversation lifecycle behavior now implemented:

- direct conversation creation:
  - de-duplicates by `direct_key`
  - returns the existing DM instead of creating duplicates
- group conversation creation:
  - adds the creator as a member
  - validates all initial members against active workspace membership
  - emits a system message for group creation
- group rename/add/remove:
  - are enforced through the shared authorization service
  - write system messages so membership/history changes are visible
  - emit chat realtime events for subscribers
- conversation listing:
  - is workspace/user scoped
  - sorts by `last_message_at` (fallback `created_at`) descending
  - includes unread counts, last-message preview, member count, and member metadata
- conversation details:
  - return metadata, active members, computed permissions, and last-message summary

Phase 4 message lifecycle behavior now implemented:

- message listing:
  - remains newest-first for consistency with the current backend contract
  - uses cursor pagination via `cursorMessageId`
  - returns sender metadata, tags, reply preview, edited/deleted flags, and `nextCursor`
- sending messages:
  - validates body length and content shape with Zod
  - validates sender membership before write
  - attaches tags when present
  - updates `last_message_at`
  - emits realtime message/conversation update events
- editing messages:
  - sender-only by default
  - `admin` / `superAdmin` can moderate-edit if needed
  - edit window is currently 15 minutes for normal users
  - preserves edit history in `chat_message_edits`
- deleting messages:
  - is soft-delete only
  - preserves timeline integrity by replacing body with `Message deleted`
  - sets `deleted_at` and emits realtime delete/update events
- marking a conversation read:
  - uses per-member read cursors on `chat_conversation_members`
  - supports `last_read_message_id` or `last_read_at`
  - keeps unread-count calculation efficient without recounting all history globally

Phase 6 performance/scalability hardening now implemented:

- chat message and typing endpoints are now rate-limited server-side:
  - message send uses `chatMessageLimiter`
  - typing events use `chatTypingLimiter`
- additional chat indexes were added for the real query shapes used in conversation list, unread lookup, and keyset pagination:
  - conversation ordering by `company_id + last_message_at + id`
  - membership lookup by `user_id + removed_at + conversation_id`
  - read cursor lookup by `conversation_id + user_id + removed_at + last_read_at`
  - message history/unread lookup by `conversation_id + deleted_at + created_at + id`
- chat mutation flows now emit structured logs for:
  - conversation creation
  - membership changes
  - message sends
  - message edits
  - message soft deletes
  - read cursor updates
- chat read/typing hot paths were tightened further:
  - `markConversationRead` is monotonic and will only move the stored read cursor forward
  - repeated identical `/read` calls are no-ops and do not write again
  - stale `/read` calls are skipped safely instead of overwriting newer read state
  - a short-lived `chat_membership` authorization cache now reuses conversation membership checks for the same `companyId + conversationId + userId`
  - that membership cache is invalidated only for real chat membership/conversation changes such as add/remove/archive/rename
  - normal chat read and typing activity no longer destroys generic `user`, `onboarding`, or `team_member` cache value
  - typing remains ephemeral and lightweight, reusing cached authorization when available and avoiding any durable state writes
  - the conversation list query now limits the base conversation slice first, then computes unread counts, last-message preview, and member aggregation for only that bounded result set
  - chat hot-path logs now distinguish:
    - read update applied
    - read update skipped as stale
    - read update skipped as unchanged
    - `chat_membership` cache hit/miss/invalidation via the shared cache metrics

Performance notes:

- chat message history and conversation lists already use cursor-ready keyset-style pagination (`cursorMessageId`, `cursorConversationId`) rather than offset pagination
- conversation list queries are already built as a single SQL query with lateral joins, so the current implementation avoids obvious per-conversation N+1 explosions
- unread counts currently use per-member read cursors (`last_read_message_id`, `last_read_at`) and indexed filtered message scans rather than global recounts from scratch
- `last_message_at` is denormalized on `chat_conversations` and is updated on write, so conversation ordering does not require scanning message history
- message edits and deletes preserve timeline integrity through `edited_at`, `deleted_at`, edit-history rows, and soft-delete behavior rather than destructive removal

Current realtime behavior for chat:

- backend chat SSE stream route: `GET /api/chat/stream?token=...`
- realtime orchestration lives in `server/src/services/chatRealtime.service.ts`
- durable chat events are now driven by Supabase Realtime `postgres_changes` subscriptions on:
  - `chat_messages`
  - `chat_conversations`
  - `chat_conversation_members`
- those DB-backed subscriptions fan back into the existing SSE stream, so:
  - new message delivery
  - edited/deleted message updates
  - group membership changes
  - conversation metadata/preference updates
  are all emitted from persistent database changes rather than ad hoc service emits
- typing indicators stay ephemeral and do not write to the database
  - typing start/stop is sent through a Supabase broadcast channel
  - the backend relays it through SSE to current participants
  - stale typing state auto-expires after a short inactivity window
  - typing requests now only do authorization plus the minimal participant lookup needed for realtime fanout; they do not trigger generic cache invalidation
- online presence now uses Supabase Presence instead of the old process-local map:
  - each chat SSE connection opens a Supabase Presence session for the authenticated user in the active company room
  - the backend observes company presence state from a shared company-level presence channel
  - member summaries expose `online` from that observed Supabase Presence state
  - presence changes are rebroadcast through the existing SSE stream as `chat.presence`
- conversation notification preferences are stored durably on `chat_conversation_members.notifications_muted`

Frontend chat wiring now in place:

- shared chat API client: `client/src/api/chat.api.ts`
- shared chat context: `client/src/context/ChatContext.tsx`
- chat helpers: `client/src/lib/chat.ts`
- page: `client/src/pages/Chat.tsx`
- sidebar unread counts now read from live chat context instead of static config

Current frontend behavior:

- conversations are loaded from `/api/chat/conversations`
- active conversation details and recent messages are loaded from the backend when selected
- the page subscribes to the existing backend SSE stream for:
  - new/updated/deleted messages
  - conversation updates
  - group membership changes
  - typing indicators
  - presence changes
- unread counts are derived from backend conversation list data and surfaced both in the page and the sidebar chat submenu
- read state is advanced with `POST /api/chat/conversations/:conversationId/read`
- typing indicators are sent with `POST /api/chat/conversations/:conversationId/typing`
- the mobile chat layout remains the same split-list/detail pattern as before, but now uses real backend data

Current limitations / deferred chat items:

- frontend chat Phase 7 is now in place:
  - `client/src/pages/Chat.tsx` now supports direct chat creation, group creation, group rename, member add/remove, message edit/delete, mute/unmute preferences, and a surfaced `Load earlier messages` flow
  - the chat page includes a workspace people directory so users can see everyone in the active workspace, their role/access badges, live presence, and start direct conversations
  - admin and superAdmin members now use special badge/icon treatment in the chat UI
  - member avatars are previewable from chat using the same dialog pattern used in `Settings.tsx`
  - backend-supported message tags are now surfaced in the composer and rendered on messages
- chat UX was later tightened further:
  - system messages now render as centered badge-like timeline events instead of regular chat bubbles
  - chat page section pills were removed; section navigation now stays in the main sidebar submenu
  - the `All` chat subsection was removed, leaving `Projects` and `Direct`
  - message tag selection moved out of the visible composer UI into the composer overflow menu for group chats only
  - direct-chat overflow menu now includes profile viewing, and group-chat overflow menu now includes group info, members, rename/manage actions, and mute notification controls
  - group conversation cards now use a subtly different visual treatment from direct-message cards
  - system-message timestamps now include calendar date plus time instead of time-only badges
  - group/member count copy now uses singular/plural correctly, for example `1 member` vs `2 members`
  - group conversation rows now show the last sender name before the last message body, and move timestamp treatment to the upper-right of the row
  - the message thread now auto-opens at the newest message, and if a user is reading older history, a top-centered `New message` jump action appears when fresh messages arrive
  - the separate workspace-people icon button was removed from the chat header; that action now lives under the main plus menu
  - create-group now supports a group description field in the UI, stored in conversation `metadata.description`
  - chat submit dialogs now close on submit attempt for create-group, rename, add-members, edit-message, delete-message, and direct-chat launch flows
- chat rerender/reconnect flow was later optimized for stability:
  - chat mutations now favor optimistic local updates for rename, member add/remove, mute, send, edit, and delete flows
  - the chat context no longer does a full conversation-list and active-thread refetch on every interaction; stream-driven reconciliation is now debounced
  - mobile-only chat section buttons were restored for `Projects` and `Direct`, using a less-rounded style to match the app shell
- backend chat moderation and system-group rules were tightened:
  - group creation is now admin/superAdmin only, enforced both in routes and service authorization
  - group rename/member-management permissions now treat the system `General` group as immutable
  - the `General` group can be viewed like any other group, but it cannot be manually renamed or membership-edited
  - direct conversations can now be soft-deleted by their active participants
  - group conversations can now be soft-deleted only by `admin` and `superAdmin`
  - soft-deleted conversations are archived with `archived_at` and excluded from normal conversation list queries
  - message edit rules are now sender-only in both direct and group conversations
  - admin and superAdmin can still moderate-delete another user’s message in group conversations, but cannot edit another sender’s message
- chat hot-path backend cache churn was reduced:
  - `touchLastLoginIfNeeded` no longer invalidates full user context on every eligible request
  - cached user records are updated in place for `last_login`, which avoids repeated user/team-member cache thrash during chat typing/read traffic
- chat realtime reliability was strengthened:
  - typing indicators now emit immediately on the backend before broadcast fanout, so same-instance subscribers see typing without waiting on broadcast echo behavior
  - chat mutations also publish direct realtime events from the service layer, which acts as a practical fallback when durable Supabase event propagation is delayed in local/dev environments
- default workspace chat behavior now includes a required `General` group:
  - each company/workspace is guaranteed a default `General` group conversation
  - active workspace members are synced into that `General` conversation automatically
  - new active members are added automatically through company creation, invite acceptance, team-member creation/update, and a fallback ensure step in conversation listing
  - removed/inactive members are removed from workspace chat memberships immediately so chat access matches workspace membership
- no schema change was required for group descriptions in this pass:
  - descriptions are stored in `chat_conversations.metadata.description`
  - no new Prisma migration was added for this chat UI update
- chat empty-state copy is now context-specific:
  - the direct-chat list and empty thread use personal-chat wording
  - the group/projects chat list and empty thread use group-chat wording
- there is still no frontend UI yet for:
  - replying to a specific message even though the backend already supports `reply_to_message_id`
  - archived conversation management
  - richer moderation actions beyond the current edit/delete flows
- moderation hide/delete flows beyond the current backend soft-delete rules are not implemented yet
- direct/group/project conversation creation strategy on the frontend is still pending product UI work
- the new `chat_membership` cache is still process-local; in a multi-instance deployment it should move to Redis or another shared cache so read/typing authorization hits are shared across nodes

### 11. Notes implementation details

Current notes data model:

- table: `notes`
- ownership: `author_id + company_id`
- optional project linkage: `project_id`
- stored fields now used by the Notes UX:
  - `title`
  - `content` (stores sanitized rich HTML)
  - `plain_text_preview`
  - `pinned`
  - `archived_at`
  - `last_edited_at`
  - timestamps
- tags remain in `note_tags`

Notes backend API:

- `GET /api/notes`
  - returns current user notes for the active workspace
  - supports `archived=true` and optional `q`
- `GET /api/notes/:id`
  - returns one note detail for the current user/workspace
- `POST /api/notes`
  - creates a new personal note
- `PATCH /api/notes/:id`
  - updates title, content, linked project, pin state, and tags
- `PATCH /api/notes/:id/pin`
  - toggles pinned state
- `POST /api/notes/:id/restore`
  - restores an archived note
- `DELETE /api/notes/:id`
  - archives a note instead of hard deleting it

Ownership/security model:

- every notes controller derives `company_id` and `author_id` from the authenticated request
- the client is not trusted for note ownership
- list, read, update, pin, archive, and restore all enforce the authenticated user plus company/workspace scope
- note HTML is sanitized on the backend before persistence

Quill integration:

- the Notes editor now uses Quill directly through `client/src/components/notes/NoteEditor.tsx`
- toolbar is intentionally limited to practical note-taking features:
  - headings
  - bold / italic / underline / strike
  - ordered, bullet, and checklist lists
  - blockquote
  - code block
  - links
  - text color / highlight
  - clean formatting
- lightweight undo/redo controls are exposed above the editor via Quill history

Sanitization approach:

- backend source of truth:
  - `server/src/lib/noteSanitizer.ts`
  - uses `sanitize-html`
  - preserves expected rich text while stripping unsafe tags and attributes
- frontend defense-in-depth:
  - `client/src/lib/notes.ts`
  - uses `dompurify`
  - sanitizes editor HTML before save and sanitizes pasted HTML before insertion into Quill
- preview snippets are generated from sanitized plain text, not rendered raw HTML

Save strategy:

- notes are created once, then updated via debounced autosave
- editor changes are debounced at about 800ms
- save state is surfaced in the UI as:
  - `Saving...`
  - `Saved`
  - `Unsaved changes`
  - `Save failed`
- pending changes are flushed when switching notes, blurring the editor, or taking destructive actions
- note hydration is keyed by note ID so switching notes does not leak stale editor state or reset cursor position on every autosave response

Notes UX features currently implemented:

- real note list and detail/editor flow
- search over title, preview, and tags
- pinned notes
- archived notes with restore flow
- optional project link
- tags
- empty, loading, and error states
- tooltip coverage on key note actions

Notes testing currently added:

- backend tests cover:
  - sanitization behavior
  - ownership scoping in controller flows
  - archive/update not-found behavior

Known limitations:

- notes search is lightweight and user-scoped; it is not full-text indexed search
- autosave is debounced and flushed on key interactions, but there is no offline draft recovery layer yet
- archived notes are hidden from the active list and restored via a dedicated action; there is no permanent hard-delete UI yet
- rich text is stored as sanitized HTML in the existing `notes.content` column for compatibility, not in a separate delta/json column

## Important Paths

### Backend

- App bootstrap: `server/src/index.ts`
- Express app and route mounting: `server/src/app.ts`
- Prisma schema: `server/prisma/schema.prisma`
- Services: `server/src/services/`
- Controllers: `server/src/controllers/`
- Routes: `server/src/routes/`
- Middleware: `server/src/middleware/`
- Logging:
  - logger setup: `server/src/utils/logger.ts`
  - request logging middleware: `server/src/middleware/requestContext.middleware.ts`

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
- `LOG_LEVEL` optional override for backend logger verbosity
- `LOG_DIR` optional override for backend persisted log directory

Backend logging note:

- the backend now writes persistent structured JSON logs to:
  - `server/logs/app.log`
  - `server/logs/error.log`
- console logs remain human-readable for local development
- each request now gets an `x-request-id`, and request completion/error logs include that ID for correlation
- sensitive metadata keys such as `authorization`, `token`, `password`, and `cookie` are redacted before logs are written
- use the file logs for concrete backend health analysis, especially around:
  - request volume and latency by path
  - chat/cache/auth hot paths
  - repeated errors tied to a single request ID

Frontend note:

- API base URL is currently hardcoded in `client/src/lib/api.ts` as `http://localhost:5000`
- Firebase web config is currently committed in `client/src/firebase/firebase.ts`

## Project Conventions

### Backend conventions

- Most business logic belongs in `services`
- Controllers should stay thin
- Feature routes are grouped by resource
- DB shaping is often handled with `dbSelect/`, DTOs, and mapper files
- request/operational observability should prefer structured logger metadata over ad hoc `console.log`

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
- Chat dialog flows now need explicit close-state cleanup; if a dialog closes, the page must clear any lingering `body` pointer-events lock so the app never becomes unclickable until refresh
- Direct chat creation should immediately switch the chat route to `?section=direct` so a newly created DM is visible instead of being hidden behind the group/projects filter
- Chat conversation auto-selection must be owned by the route/page filter, not a second global default in context; otherwise routes like `?section=direct` can get stuck fighting over `activeConversationId` when that section has no conversations yet
- Chat auto-scroll should target the message pane container itself, not `scrollIntoView()` on a child node; otherwise the outer layout can shift and the composer can fall out of the viewport
- When opening a conversation, delay the initial scroll-to-latest until the message fetch has finished and the thread has painted; firing too early can leave the user stranded in older history
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
- In chat, long message content should wrap aggressively and the composer textarea should stay height-capped with its own internal scroll so oversized drafts never push the conversation window out of layout
- For chat split panes, every flex ancestor around the message pane should keep `min-h-0` so the `overflow-y-auto` thread owns scrolling instead of expanding the whole panel
- Avoid mount-time typing network calls in chat cleanup/effects; only send `typing: false` if the user was actually marked as typing

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
