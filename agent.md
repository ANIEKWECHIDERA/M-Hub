# Agent Guide for Crevo

## Purpose

This repository contains Crevo, a full-stack internal project management app with a separate frontend and backend.

Use this file as the quick-start guide before making code or documentation changes.

## Repository Shape

```text
Crevo/
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

## Dependency Safety Notes

- Safe patch pass completed on 2026-03-24:
  - frontend:
    - `react-router-dom` updated to `^7.13.2`
    - safe `npm audit fix` reduced frontend audit output to a single low-severity `quill` advisory
  - backend:
    - `express-rate-limit` updated to `^8.3.1`
    - `multer` updated to `^2.1.1`
    - safe `npm audit fix` reduced backend audit output, but remaining findings are still tied mainly to:
      - Prisma toolchain internals
      - `firebase-admin` transitive Google packages
- Current audit posture after the safe pass:
  - frontend: `1 low`
  - backend: `19 total` (`6 high`, `5 moderate`, `8 low`)
- Important constraint:
  - clearing the remaining backend issues cleanly will likely require a coordinated upgrade path rather than another blind patch pass, especially around Prisma and `firebase-admin`

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

### 3b. Personal workspace creation is now automatic

Crevo now guarantees that a newly completed user profile cannot remain workspace-less.

- When a user completes signup/profile and still has `has_company = false`, the backend automatically creates a personal default workspace named `My Workspace`
- The user is added to that workspace as:
  - `role = owner`
  - `access = superAdmin`
- This creation is backend-enforced and idempotent
- Repeat calls reuse an existing owned workspace rather than creating duplicates
- Invite acceptance now ensures this personal workspace exists before the invite is linked, so a user cannot get stranded with only an invited workspace

Relevant backend files:

- `server/src/services/company.service.ts`
- `server/src/services/user.service.ts`
- `server/src/services/invite.service.ts`

Important behavior:

- the personal workspace is created invisibly for the user
- if the user later accepts another workspace invite, they can switch between workspaces without losing their own default workspace
- current workspace selection should not be assumed to equal “personal workspace”; the owned `superAdmin/owner` membership is the durable signal

### 3c. Workspace Manager and workspace branding permissions

Crevo now has a dedicated Workspace Manager surface.

- Frontend route:
  - `/workspace-manager`
- Sidebar visibility:
  - visible only to `admin` and `superAdmin`
- Frontend route access:
  - blocked for `team_member` / `member`
- Backend data route:
  - `GET /api/workspaces/manager`
  - restricted to `admin` and `superAdmin`

Workspace Manager shows:

- workspace name
- description
- logo/avatar
- member count
- workspace owner
- workload/capacity cues for active members

Branding/edit rules:

- only `superAdmin` can update workspace branding/details
- admins can view Workspace Manager but cannot rename the workspace or change the workspace photo
- current backend company update route remains `superAdmin`-only, so description editing is also effectively restricted to `superAdmin` for now

Relevant files:

- `client/src/pages/WorkspaceManager.tsx`
- `client/src/components/Sidebar.tsx`
- `client/src/App.tsx`
- `server/src/routes/workspace.routes.ts`
- `server/src/controllers/workspace.controller.ts`
- `server/src/services/workspace.service.ts`
- `server/src/routes/company.routes.ts`

### 3d. Invite management now supports copy/resend/delete actions

Invite handling is no longer cancel-only and now lives under Workspace Manager instead of being a top-level Settings surface for admins.

Current per-invite actions:

- Copy invite link
- Resend invite
- Delete invite

Implementation notes:

- the invite row now uses an ellipsis menu in Workspace Manager
- copy-link and resend both refresh the invite token/hash and expiration, then:
  - copy returns a valid accept URL
  - resend sends a new email with the refreshed token
- delete now removes the invite record entirely instead of only marking it cancelled
- accepted invites cannot be resent
- accepted invites no longer show `Copy invite link` or `Resend invite`; they only expose `Delete invite`

Relevant files:

- `client/src/pages/WorkspaceManager.tsx`
- `client/src/api/invite.api.ts`
- `server/src/controllers/invite.controller.ts`
- `server/src/routes/invite.routes.ts`
- `server/src/services/invite.service.ts`

UX notes:

- successful `Invite Team Member` submissions should close the dialog immediately, then refresh the invite list in the background
- delete-invite confirmation should keep the invite email visible through the close animation instead of flashing a generic fallback label

### 3e. Workspace workload/capacity cues

Workspace Manager now exposes lightweight capacity signals for active members in the current workspace.

Per-member metrics:

- assigned task count
- completed task count
- overdue task count
- in-progress task count

Capacity cue values:

- `free`
- `balanced`
- `overloaded`
- `behind`

These are operational cues only, not deep workforce analytics.

Scoping and access rules:

- metrics are computed per active workspace/company
- only `admin` and `superAdmin` can fetch them
- only active team members are included

Known limitations:

- capacity thresholds are heuristic and currently hardcoded in `workspace.service.ts`
- workload counts are task-assignment based and do not attempt to measure effort sizing or subtasks as separate capacity units

### 3f. Retention dashboard features

Crevo now has a retention-focused dashboard slice designed to make the app useful every day, not just when a user needs to look something up manually.

Current retention features:

- `Daily Focus`
- `Decision Feed`
- `Workspace Health`

Backend contract:

- `GET /api/dashboard/retention`

Backend implementation:

- `server/src/routes/dashboard.routes.ts`
- `server/src/controllers/dashboard.controller.ts`
- `server/src/services/retention.service.ts`

Frontend implementation:

- `client/src/api/dashboard.api.ts`
- `client/src/hooks/useRetentionSnapshot.ts`
- `client/src/components/retention/RetentionPanels.tsx`
- `client/src/pages/DashBoard.tsx`
- `client/src/pages/MyTasks/MyTasksPage.tsx`
- `client/src/context/WorkspaceContext.tsx`

Daily Focus behavior:

- personal to the current user
- scoped to the active workspace/company
- combines:
  - overdue / due-today / due-soon assigned tasks
  - recent decision, blocker, and action-item chat signals from conversations the user belongs to
- sorted to surface urgency first:
  - overdue task pressure
  - blockers
  - due-today / due-soon work
  - recent decisions and action items
- click-through behavior:
  - task items open the related project or My Tasks detail context
  - chat-derived items open the source conversation

Decision Feed behavior:

- surfaces recent tagged chat messages without showing the entire thread
- currently focuses on:
  - `decision`
  - `action-item`
  - `blocker`
- scoped to conversations the current user is a member of
- supports lightweight client-side filtering:
  - `All`
  - `Decisions`
  - `Action Items`
  - `Blockers`
- feed items open the source chat conversation and preserve deep-link context

Workspace Health behavior:

- visible only to `admin` and `superAdmin`
- hidden from lower-access roles
- based on a transparent weighted model using:
  - overdue task count
  - completion rate
  - overloaded teammate count
  - behind teammate count
  - recent blocker-tag signals
- returns:
  - score from `0-100`
  - status label:
    - `Healthy`
    - `At Risk`
    - `Critical`
  - summary sentence
  - factor breakdown for quick diagnosis

Home-surface placement:

- `Dashboard` is intentionally lighter again and no longer shows Daily Focus, Decision Feed, or Workspace Health
- `Daily Focus` now lives on `My Tasks` only
- `Decision Feed` now lives inside `Chat`, alongside the tagged summary/decision-capture area
- `Workspace Health` now lives in the sidebar footer area for `admin` and `superAdmin`
- lower-access users do not see Workspace Health

Caching and freshness:

- workspace-scoped retention snapshots are cached inside `WorkspaceContext`
- new helpers:
  - `getRetentionSnapshot(...)`
  - `peekRetentionSnapshot(...)`
  - `invalidateRetentionSnapshot(...)`
- cache is keyed by active workspace/company
- repeated visits do not force noisy reloads
- task mutations invalidate the retention snapshot
- chat tag mutations invalidate the retention snapshot when tagged summaries change

Responsive/UI notes:

- retention cards follow the app's mobile/tablet/desktop spacing system
- loading uses skeletons instead of abrupt blank states
- empty and error states are intentional and inline
- Workspace Health in the sidebar uses progressive disclosure via an ellipsis menu instead of showing too much detail inline

Chat deep-link note:

- dashboard and My Tasks now link decision/feed items into Chat with query params
- Chat preserves unknown query params when normalizing the `section` search param
- this prevents loss of `conversationId` / `messageId` during deep-link navigation

Playwright verification completed for:

- Workspace Manager submenu expansion without accidental routing
- Workspace Manager invite actions:
  - accepted invite shows only `Delete invite`
  - pending invite shows `Copy invite link`, `Resend invite`, and `Delete invite`
  - copy invite link succeeds
  - resend invite succeeds
  - delete invite cancel keeps the UI responsive
  - delete invite removes the row
- toast behavior on small viewport:
  - top-center placement with more distance from the header
  - controlled width
  - auto-dismiss
- My Tasks drag-and-drop reordering with persisted local workspace order

Known limitations:

- Decision Feed filtering is currently client-side over the returned dashboard payload
- Daily Focus task routing currently opens the related project or My Tasks context rather than a dedicated task deep-link route
- Workspace Health is a practical heuristic, not historical analytics or forecasting

Future expansion path:

- AI-prioritized Daily Focus ranking
- automatic decision extraction and suggestion
- decision-to-task conversion
- workspace health trend history and alerts

### 3g. Refinement pass: calmer IA, chat polish, onboarding hardening

This pass focused on reducing visual overwhelm and moving secondary/admin tools behind better information architecture.

Navigation and IA changes:

- `Workspace Manager` is now the admin home for:
  - `Workspace Details`
  - `Team Workload`
  - `Team`
  - `Invites`
  - `Delete Workspace`
- clicking the Workspace Manager parent item expands the submenu first; it does not force navigation
- `Settings` is now reduced back to:
  - `Profile`
  - `Notifications`
  - `Security`

Chat polish changes:

- the seeded General group intro message is now a meaningful workspace-use description instead of `General chat created`
- chat renders subtle per-day separators client-side when a new day starts in the thread
- direct-message headers now show the teammate's role instead of a generic `Direct message` label
- in direct messages, the other person's message bubble no longer shows the hover ellipsis action menu
- the chat summary/tagged area is now framed as `Decision Feed`
- the collapsed sidebar now shows a subtle unread dot on the chat button when unread chat items exist

Workspace / terminology changes:

- visible frontend copy now prefers `Workspace` over `Company`
- workspace logo upload now accepts SVG in addition to JPG/PNG/WebP
- workspace/team/invite data uses skeleton states instead of abrupt empty flashes
- My Tasks skeletons now use shared theme-aware skeleton primitives instead of hardcoded light-only shimmer blocks

Onboarding and signup flow hardening:

- the frontend no longer forces newly created users into manual workspace creation after profile completion
- successful profile completion now routes to:
  - pending invite acceptance when a pending invite token exists
  - otherwise `/dashboard`
- signup now refreshes backend auth status before redirecting so `My Workspace` creation settles before the shell loads
- first-time users should now rely on backend auto-creation of `My Workspace` instead of manual workspace setup

Task ordering:

- My Tasks supports drag-and-drop reordering
- order is persisted per workspace in local storage using:
  - `crevo:my-task-order:{companyId}`

Permission and membership UX:

- admins can now update team member role and status and remove members
- admins cannot edit workspace access level
- superAdmins still control access-level changes and superAdmin assignment
- generic API permission failures now show clearer workspace-membership/session guidance instead of cryptic failures

Known limitations:

- Team and Invite rendering was moved into Workspace Manager, but the older Settings implementation still exists in code as unreachable fallback UI and can be cleaned up later
- the new My Tasks ordering currently persists client-side per workspace rather than syncing to the backend
- I did not run a real browser signup test in this pass because doing so would mutate the active auth session and test data

### 4. Context-heavy frontend

The client uses multiple React context providers for project, task, note, asset, notification, settings, team member, client, and auth state.

Before introducing new global state, check whether an existing context already owns it.

### 4b. User settings are now backend-persisted

Theme and notification preferences are no longer local-only convenience state.

- Backend settings routes:
  - `GET /api/user/settings`
  - `PATCH /api/user/settings`
- Backend implementation:
  - `server/src/routes/userSettings.routes.ts`
  - `server/src/controllers/userSettings.controller.ts`
  - `server/src/services/userSettings.service.ts`
- Frontend owner:
  - `client/src/context/SettingsContext.tsx`
  - `client/src/hooks/useSettings.ts`
  - `client/src/api/user-settings.api.ts`

Persisted settings currently include:

- `theme`
- `language`
- `notifications_enabled`
- `email_notifications_enabled`
- `task_assignment_notifications`
- `project_update_notifications`
- `comment_notifications`
- `compact_mode`

Behavior notes:

- theme updates should feel immediate in the UI and then persist in the background
- the last chosen theme is also cached locally under `crevo-theme` so the shell paints correctly before the backend request settles
- in-app notification fetching and SSE subscription now respect `notifications_enabled`
- Settings > Notifications should remain the single source of truth for user notification toggles

### 4c. Outbound email now uses Resend

Crevo now has a real outbound email layer on the backend.

- Provider:
  - Resend via the official `resend` Node SDK
- Core files:
  - `server/src/config/email.ts`
  - `server/src/services/email.service.ts`
  - `server/src/services/emailNotification.service.ts`
- Local env keys:
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `EMAIL_REPLY_TO`
- `EMAIL_BASE_URL`
- `APP_NAME`
- `APP_TAGLINE`
- `EMAIL_FOOTER_TEXT`
- `APP_SUPPORT_EMAIL`
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_RELEASE`
- `SENTRY_TRACES_SAMPLE_RATE`
- `SENTRY_PROFILES_SAMPLE_RATE`
- `OBSERVABILITY_PROVIDER`
- `OBSERVABILITY_DSN`
- `OBSERVABILITY_ENVIRONMENT`
- `OBSERVABILITY_RELEASE`
- `OBSERVABILITY_TRACES_SAMPLE_RATE`
- `OBSERVABILITY_PROFILES_SAMPLE_RATE`

Current email triggers:

- workspace invite email
- invite accepted email to workspace admins
- task assignment email
- task/project comment email
- project update email

Preference rules:

- workspace invite emails are transactional and send directly to the invited email
- invite accepted emails respect `email_notifications_enabled`
- task assignment emails respect:
  - `email_notifications_enabled`
  - `task_assignment_notifications`
- comment emails respect:
  - `email_notifications_enabled`
  - `comment_notifications`
- project update emails respect:
  - `email_notifications_enabled`
  - `project_update_notifications`

Implementation notes:

- outbound email is fire-and-log from controllers so core product actions still complete if the mail provider is temporarily unavailable
- task assignment links currently deep-link to `/mytasks`
- comment and project update emails deep-link to `/projectdetails/:id`
- explicit `@mention` parsing is not implemented yet; current comment emails cover task/project comment activity rather than mention-specific targeting
- email HTML uses a shared Crevo shell with the configured brand/footer values

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
  - message edits are limited to the original sender's active workspace membership
  - manual message tagging is only available to active group members inside their current company/workspace scope

Current MVP endpoints:

- `GET /api/chat/stream?token=...`
- `GET /api/chat/conversations`
- `GET /api/chat/conversations/:conversationId`
- `GET /api/chat/conversations/:conversationId/messages`
- `GET /api/chat/conversations/:conversationId/tagged-messages`
- `POST /api/chat/conversations/direct`
- `POST /api/chat/conversations/group`
- `POST /api/chat/conversations/:conversationId/messages`
- `POST /api/chat/conversations/:conversationId/typing`
- `POST /api/chat/conversations/:conversationId/read`
- `PATCH /api/chat/conversations/:conversationId/preferences`
- `PATCH /api/chat/messages/:messageId`
- `PATCH /api/chat/messages/:messageId/tags`
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
- group chat tags were later expanded into a manual decision-capture layer:
  - supported tags are now `Decision`, `Action Item`, `Blocker`, `Update`, `Question`, and `Follow-up`
  - tags can be chosen before send in the group-chat composer and are shown as removable color-coded chips before the message is sent
  - any active group member can add or remove tags on any non-system, non-deleted group message after send
  - tagged messages are color-coded in the thread so important signals are visible without leaving the conversation
  - group chats now expose a `Key decisions` mode that summarizes tagged messages separately from the noisy main stream
  - summary items show sender, timestamp, tags, message body, and a jump-back action to the original message when it is already in the loaded thread
  - the composer tag picker and message action menus now use a portalled dropdown, which keeps the menu inside the viewport even when the trigger sits near the bottom edge of the chat window
  - the tag picker and per-message tag menus also close on pointer-leave, which removes an extra click during repeated manual tagging
  - the composer row keeps the tag button, textarea, and send button aligned horizontally instead of shifting vertically during typing/tagging
  - message-tag updates use the existing `chat.message.updated` realtime signal so summary and message views reconcile through the normal chat refresh path
  - the current architecture stays future-ready for AI assistance because the summary layer is still driven by explicit message-level signals rather than a hardcoded one-off decision widget
  - pending composer tags are stored per conversation, so switching groups does not leak draft tags into another group, while returning to the original group restores the unsent tags for that conversation
  - after a tagged send, the composer clears only the active conversation draft tags so the next message starts untagged by default
  - the message-edit button is intentionally hidden 30 seconds before the backend 15-minute edit cutoff so the UI does not offer an edit that is about to fail
  - a `Check` icon import regression in `client/src/pages/Chat.tsx` was fixed after it surfaced during live browser verification as `ReferenceError: Check is not defined`
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
- backend typing/read hardening was later tightened further:
  - typing is now hardened as an ephemeral best-effort path:
    - valid members still must pass normal conversation authorization
    - if recipient lookup fails, typing falls back to the sender-only recipient list instead of returning `500`
    - if the Supabase ephemeral broadcast transport throws or returns a non-`ok` state, the request still resolves successfully and the failure is logged with conversation/user context
    - typing controller errors now log `conversationId`, `companyId`, `userId`, and `isTyping` for faster diagnosis
  - chat read-marking now refuses to advance the active conversation with a message ID that belongs to another thread, which prevents fast chat-switch races from producing `/read` 404s
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
- the `Key decisions` jump-back action currently works best for tagged messages already present in the loaded chat window; older tagged items may still require loading earlier history before their exact message anchor is available
- Playwright verification is now completed for the manual decision-capture flow:
  - compose-time tagging works in a real group conversation
  - post-send tagging works for existing messages
  - `Key decisions` count increases when tagged messages are added and decreases again when a tag is removed
  - `Jump to message` returns to the original message context for loaded history
  - repeated tagged and untagged sends do not leak the previous tag into the next message
  - the typing endpoint returns `200` during active compose/tag flows in the same group
  - the compose tag menu stays inside the viewport on a mobile-sized `390x844` viewport
  - switching to another group clears that group's draft composer tags while preserving conversation-specific draft tags in the original group
- Known limitation outside the chat feature:
  - unrelated app-level requests like `GET /api/user/settings` can still fail independently and may appear in the shared browser console while testing chat

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
  - `server/logs/app.json`
  - `server/logs/error.json`
  - `server/logs/frontend.json`
- console logs remain human-readable for local development
- each request now gets an `x-request-id`, and request completion/error logs include that ID for correlation
- sensitive metadata keys such as `authorization`, `token`, `password`, and `cookie` are redacted before logs are written
- request-path logging now also redacts sensitive query parameters like `token`, `authorization`, `access_token`, `id_token`, and `refresh_token` so SSE/stream URLs do not leak bearer tokens into persisted logs
- chat read-cursor logs now serialize `lastReadAt` and `currentLastReadAt` as ISO timestamps instead of opaque objects, so read-state investigations are easier in `app.json`
- the frontend now reports browser runtime errors, unhandled promise rejections, and `console.error` events to `POST /api/frontend-logs`, which is rate-limited and persisted to `server/logs/frontend.json`
- frontend log reporting is deduped client-side over a short window so the file stays useful during repeated failures
- frontend log capture is now environment-gated:
  - client side: enabled by default in development, or in production when `VITE_ENABLE_FRONTEND_LOGGING=true`
  - server side ingest: enabled by default outside production, or explicitly with `ENABLE_FRONTEND_LOG_INGEST=true`
  - server-side sampling can be reduced in production with `FRONTEND_LOG_SAMPLE_RATE` (defaults to `0.25` in production, `1` otherwise)
- backend observability is now Sentry-compatible and provider-configurable:
  - current SDK: `@sentry/node`
  - can send to Sentry or compatible backends like GlitchTip by env change only
  - generic envs are preferred: `OBSERVABILITY_PROVIDER`, `OBSERVABILITY_DSN`, `OBSERVABILITY_ENVIRONMENT`, `OBSERVABILITY_RELEASE`
  - legacy `SENTRY_*` envs still work as fallback for compatibility
- backend Sentry captures:
  - startup failures
  - unhandled Express request errors through the shared error middleware
  - request, user, company, and `x-request-id` context on captured backend exceptions
  - performance traces through Sentry's Express integration
- backend Sentry intentionally filters common noisy auth failures like expired Firebase ID tokens so they do not dominate issue lists
- use the file logs for concrete backend health analysis, especially around:
  - request volume and latency by path
  - chat/cache/auth hot paths
  - repeated errors tied to a single request ID

Workspace ownership safety note:

- the backend now protects the last active `superAdmin` in a workspace from accidental lockout
- a `superAdmin` cannot be demoted, deactivated, removed, or have their account deleted if they are the last active `superAdmin` for that workspace
- this protection is enforced server-side on:
  - team member update
  - team member delete
  - user account delete
- if a workspace needs to transfer ownership, create or promote another `superAdmin` first, then demote/remove/delete the original one

Frontend note:

- API base URL is currently hardcoded in `client/src/lib/api.ts` as `http://localhost:5000`
- Firebase web config is currently committed in `client/src/firebase/firebase.ts`
- user-facing app branding is now `Crevo`; keep Firebase/Supabase/cloud storage identifiers unchanged unless infrastructure is actually being renamed too
- user-facing and backend service naming should use `Crevo` / `crevo-backend`; only leave legacy `m-hub-*` values in place when they are real external infrastructure identifiers such as Firebase project IDs or buckets

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
- Header workspace identity should show the active workspace name, not a hardcoded app label
- Sidebar branding should use the Crevo name and `C` mark in user-facing chrome
- Persisted user-setting toggles should update optimistically in the UI and then sync through `PATCH /api/user/settings` without forcing full-page reloads

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
- Notifications can now be cleared individually or cleared all at once from the header popover; those actions are backed by real backend delete endpoints and realtime removal events
- Backend notification list responses now use a short-lived user-scoped response cache with explicit ETag handling so repeated identical reads can return cached `304`/JSON responses without recomputing the payload
- Comments now render real author data from the backend, update in realtime through project-scoped SSE, and use a bottom-pinned composer with upward scrolling history
- Chat keeps a desktop split view, but on small screens it behaves like a modern messaging app: conversation list first, then a conversation detail view with an inline back button
- Chat section pills for `Projects` and `Direct` should stay visible across screen sizes, with the selected state using the primary/dark button treatment instead of a muted pill style
- Notes now follow the same interaction model as Chat:
  - desktop uses a split list/editor layout
  - small screens open to the notes list first
  - selecting a note opens the editor view with an inline back arrow
  - note section pills like `Active` and `Archived` should use the same dark selected-state treatment as chat section pills
- Notes now run in a compatibility mode against older live schemas:
  - if rich-note columns like `plain_text_preview`, `last_edited_at`, `pinned`, or `archived_at` are missing, the backend falls back to legacy-safe note reads and writes
  - legacy mode derives preview text and edited timestamps from existing columns instead of failing the whole feature
- Notes creation should feel local-first:
  - create a temporary in-memory note immediately for fast capture
  - let the editor open and accept input before the backend create round-trip finishes
  - reconcile the temp note to the real persisted note in the background
  - when a temp note becomes real, keep the current editor draft intact and let autosave flush it onto the persisted record
- Notes list data should stay memory-backed per workspace once loaded:
  - cache active and archived note lists in memory
  - reopening Notes or toggling between `Active` and `Archived` should prefer cached notes first instead of refetching every time
  - local note create/pin/archive/restore updates should reconcile that in-memory cache immediately for a snappy feel
- The Quill notes editor must initialize only once per mounted editor surface; keep changing callbacks in refs instead of putting them in the editor boot effect dependencies
- Notes autosave must be single-flight:
  - only one save request should be in flight per note at a time
  - later edits should queue a follow-up save instead of overlapping PATCH requests
  - note-tag writes must be idempotent under repeated saves
- Notes should expose a visible destructive action in the editor header; do not hide the primary delete/archive action behind icon-only affordances
- Notes bulk actions should live in the header next to the `Active` / `Archived` pills, not inside each note row
- Per-note ellipsis actions are allowed in the Notes list again, but they must stop propagation so the full row still opens the note safely when users click outside the menu trigger
- The Notes header control order should be `Active`, `Archived`, then the ellipsis button on the far right
- The ellipsis trigger should stay visually aligned with the nav pills while showing only the icon, not the word `Actions`
- `Mark to delete` and `Mark to archive` should enter a bulk-selection mode that reveals checkmarks in the note list for batch actions
- In the `Archived` view, use the same far-right ellipsis pattern but expose `Bulk restore` and `Bulk delete`
- Bulk note delete and archive should be separate actions end to end:
  - archive moves notes into the archived list
  - delete permanently removes notes through the dedicated delete endpoint
  - bulk action buttons should say `Archive` or `Delete`, not a generic `Apply`
- The full note row should remain clickable to open the note; any nested bulk-selection or restore controls must stop propagation so row click behavior stays intact
- Keep the primary archive action visible in the editor header; use the header bulk menu for list-level cleanup flows
- Notes should warm a small number of note details into memory after the first list fetch so opening recently visible notes feels instant instead of always waiting on a cold detail request
- Keep the active and archived in-memory note caches separate; do not derive one bucket from the other or archived notes can appear to vanish after optimistic updates
- API requests that expect JSON should avoid browser cache revalidation pitfalls; do not let `304 Not Modified` responses leave Notes or other authenticated screens stuck in loading states
- Header loading states must never take over the full viewport on top of the app shell; use an in-place skeleton header so feature surfaces like Notes stay clickable while profile data settles
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
- Keep `/api/status` on a lighter dedicated limiter than login/signup endpoints; the shell pings it often enough that sharing the strict auth limiter can create false auth-sync failures during UI churn or Playwright runs

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

- Local-first note creation must reconcile temp notes by removing the temp row from visible state and in-memory caches before inserting the real persisted note; otherwise one create can appear as two notes

### Workspace management refinement notes

- Workspace Manager now behaves like a real submenu section in the main sidebar:
  - parent label click expands/collapses the section instead of navigating immediately
  - child routes live under `/workspace-manager?section=details|workload|delete`
  - `Delete Workspace` is only shown to `superAdmin`
- Shared workspace state is now centralized in `client/src/context/WorkspaceContext.tsx`
  - sidebar, header, and workspace manager should read from the same workspace list/current workspace source
  - workspace name/logo changes should update shared workspace state immediately without waiting for a full hard refresh
  - workspace-manager snapshots are cached per active workspace and reused on repeat opens
  - invalidate that cache only after real mutations such as rename/photo changes or workspace deletion
- Workspace Details should use the same image flow as profile photo:
  - label it as `Workspace Logo`, not branding/photo
  - clicking the current logo should open a preview dialog
  - the file-action button should read `Upload Logo`
- Do not add collapse toggles to `Workspace Details` or `Delete Workspace`; keep those sections immediately readable
- Workspace Manager loading should use skeletons, not generic spinners, for:
  - workspace details
  - team workload
  - delete workspace section
- On small screens, workspace-manager cards may collapse/expand to reduce vertical crowding, but the active workspace name should still remain visible in the app header
- Team Workload should display `role`, not `access`
- Capacity cues should include the total active member count alongside free/balanced/attention-needed counts
- Invite actions in Settings now rely on the per-row ellipsis menu for:
  - copy invite link
  - resend invite
  - delete invite
- Accepted invites should not offer actions that depend on a still-valid acceptance token:
  - hide `Resend invite`
  - hide `Copy invite link`
  - keep `Delete invite` available
  - normalize status checks defensively so casing differences do not reintroduce the bug
- Copy invite link should use a clipboard fallback, not only `navigator.clipboard.writeText`, so the action still works in stricter browser contexts
- Delete workspace UX rules:
  - only `superAdmin` can access the destructive action
  - require exact workspace-name confirmation before submitting
  - warning copy must clearly communicate that the action is permanent
- Backend workspace deletion should update impacted users so they are not left pointing at a deleted workspace:
  - switch them to another remaining active workspace if one exists
  - otherwise set `has_company = false` and clear `company_id`
  - keep the delete operation transactional so a successful workspace delete cannot still bubble up as a `500`
- Team-member reactivation should not fail when a previously inactive member is restored:
  - the general-chat membership sync must reactivate a removed `chat_conversation_members` row before inserting a new one
  - avoid creating duplicate active conversation-member rows that violate `chat_conversation_members_active_user_key`
  - verified via browser flow by changing a member from `active -> inactive -> active` with both PATCH requests returning `200`
- Playwright refinement pass verified:
  - workspace submenu expands without routing on parent click
  - invite ellipsis menu opens correctly
  - copy invite link succeeds and shows success feedback
  - resend invite succeeds and updates UI cleanly
  - delete invite succeeds and removes the row
  - cancelling delete invite no longer leaves the UI frozen; the invite dialog remains interactive immediately afterward
  - workload section renders `role`
  - mobile viewport shows the new workspace-manager skeleton/loading treatment cleanly
- Mobile density rules were tightened in shared primitives:
  - smaller default content padding
  - smaller card and button padding on mobile
  - narrower Sonner toasts
  - smaller base mobile typography, especially in editor-heavy views like Notes
  - inputs, dialogs, and alert dialogs should also scale down slightly on small screens
- Auth and invite acceptance surfaces should use the official Crevo mark instead of a plain `C`
  - on small screens, keep the mark and the `Crevo` name side by side
- Chat mobile polish:
  - reduce header spacing and avatar/button sizes slightly on phones
  - reduce message bubble padding/text size slightly on phones without hurting readability
  - keep group-tagging and send actions intact while making the composer denser
- Toasts should prefer content-fit width rather than stretching wide across the viewport
- Workspace Health messaging should explain the score contextually:
  - `Healthy` means pressure is manageable and delivery is moving steadily
  - `At Risk` means work is still moving, but overdue tasks, blockers, or uneven capacity could start slipping delivery
  - `Critical` means delivery is under material pressure and needs intervention soon
  - avoid presenting the number as scientific precision; the score is a weighted operational cue
  - both the sidebar summary and the fuller card should expose a compact help affordance that explains the status bands
  - render `Healthy`, `At Risk`, and `Critical` as badges, paired with matching status icons
  - keep the sidebar version compact: score, badge, icon, and short summary only
- Icon-bearing inputs and search fields should leave more breathing room between the icon and text:
  - prefer `pointer-events-none` on decorative icons
  - use larger left padding (`pl-12` range) for icon-led inputs on key auth, search, notes, and chat surfaces
  - this is especially important after the mobile density reductions so placeholder text does not visually collide with icons
- Load-testing note:
  - a 50-concurrent mixed authenticated burst is currently dominated by the backend rate limiter and returns `429` before it meaningfully exercises app-query capacity
  - this means current load-test results mostly reflect protection settings, not the raw throughput of workspace, task, retention, or chat endpoints
- The sidebar footer should be treated as a retention surface, not static instructional copy
  - current experiment is `Retention Lab` with three selectable concept cards:
    - `Team Pulse`
    - `Win Streaks`
    - `Friday Wrap`
- Mobile sidebar sheet content now includes hidden title/description so Playwright/browser a11y checks stay clean
- The sidebar now treats personal execution surfaces as a grouped area:
  - use a parent `Focus` menu in the main sidebar
  - child routes:
    - `/mytasks?section=tasks`
    - `/mytasks?section=daily-focus`
  - keep `My Tasks` and `Daily Focus` separate instead of stacking both on the same page by default
  - `My Tasks` remains the task-list surface
  - `Daily Focus` is the lighter prioritization surface for what needs attention now
  - place `Focus` above `Chat` in the sidebar order
  - use the `ListTodo` icon for the `My Tasks` child item so the nav matches the page identity
- Chat navigation copy should say `Groups`, not `Projects`, for the group-chat section label
  - keep the internal section id as `projects` if that avoids route or API churn
- The dashboard button in the sidebar should surface a subtle unread red dot when chat has unread items
  - this is intentionally lighter than the full unread badge shown on the Chat parent item
- For icon-led inputs and searchbars, preserve breathing room between the icon and user text
  - continue using `pointer-events-none` on decorative icons
  - prefer `pl-12` to `pl-14` spacing on icon-bearing inputs
  - especially for:
    - Chat `Search conversations`
    - Projects search
    - Notes search
    - My Tasks search
- `My Tasks` page identity should be dynamic:
  - `?section=tasks` uses `My Tasks`
  - `?section=daily-focus` uses `Daily Focus`
  - update the leading icon and supporting copy to match the active section
- My Tasks drag-and-drop now uses `dnd-kit`
  - implementation lives in:
    - `client/src/pages/MyTasks/components/TasksList.tsx`
    - `client/src/pages/MyTasks/components/TaskCard.tsx`
  - packages in use:
    - `@dnd-kit/core`
    - `@dnd-kit/sortable`
    - `@dnd-kit/utilities`
  - old `swapy` dependency has been removed
  - current behavior:
    - vertical sortable list using `DndContext` + `SortableContext`
    - pointer, touch, and keyboard sensors enabled
    - dedicated drag handle on each task row
    - drag completion passes ordered visible task ids back to the page for persistence
    - task-detail opening is briefly suppressed after a drag so releasing the pointer does not open the task drawer accidentally
    - task order still persists per workspace in local storage under `crevo:my-task-order:{companyId}`
  - mobile polish:
    - task cards remain denser for smaller phones
    - drag grip stays visible without crowding badges/metadata
    - task list now has a little extra inset/padding on small phones so rows feel less cramped
  - laptop polish:
    - keep icon/input spacing consistent with the broader visual-polish guide
    - preserve cleaner toolbar/header spacing on larger breakpoints too
    - reduce task-card corner radius for a calmer, less pill-like list
  - backend compatibility fix landed alongside the drag work:
    - task create/update now accepts `assigneeIds` as an alias to `team_member_ids`
    - this removes `500` noise from callers that still post the older frontend-shaped field
  - browser verification notes:
    - the prior React render-loop / Swapy runtime console errors are gone
    - opening task details from the longer seeded list still works
    - explicit browser drag of `Swapy load task 7` into `Swapy load task 4`'s position now reorders correctly
    - the reordered task list survives page reload through the saved per-workspace local order key
- Workspace Health sidebar visibility is now user-toggleable for admins and superAdmins
  - settings preference key: `workspaceHealth`
  - stored client-side through `useSettings` with local storage fallback key `crevo-workspace-health`
  - when enabled:
    - show the compact sidebar Workspace Health card
  - when disabled:
    - hide the health card details
    - show a small `Turn on` affordance in the sidebar so the user can restore it quickly
  - non-admin roles should not see this toggle or the sidebar health surface
- Browser verification completed for the latest My Tasks / sidebar retention changes:
  - toggling `Workspace health in sidebar` off replaces the card with a compact `Turn on` state
  - clicking `Turn on` restores the sidebar health card
  - My Tasks drag-and-drop reorders correctly with `dnd-kit`
  - refreshed page keeps the saved task order instead of snapping back
- `Daily Focus` and `Decision Feed` should include compact help tooltips, similar to Workspace Health, so users understand what each surface is for without adding heavier visible copy
  - for chat-side `Decision Feed`, move explanatory helper copy into the tooltip instead of showing it as a persistent paragraph
  - keep Decision Feed filter/actions visually compact with smaller rounded controls
- Workspace Manager polish:
  - keep the `Workspace Name` field and `Workspace Owner` field at the same visual height
  - keep workload/team/invite badges visually uniform on smaller screens
  - truncate long names/emails in tables and expose the full value on tooltip hover/focus
- Dashboard project cards should keep a consistent vertical structure even when some data is missing
  - avoid cards collapsing unevenly because a deadline, task count, or member text is absent
  - reserve stable rows for metadata and CTA alignment
- Settings `Compact mode` should include a lightweight help tooltip explaining that it reduces spacing in supported areas without changing the underlying layout
- Project Details mobile/tab behavior:
  - the `Overview` tab must own a real scroll container on smaller screens
  - verify it scrolls instead of relying on parent-page overflow
- Permission-change handling:
  - when workspace membership or access changes and API requests start failing with `401` or `403`, show a refresh-focused toast
  - throttle that toast so repeated failures do not spam the UI
- Chat creation dialogs need extra mobile care:
  - on small screens, move the direct-chat and group-chat dialogs closer to the top of the viewport instead of centering them perfectly
  - keep enough vertical headroom so the on-screen keyboard does not immediately consume the remaining usable space
  - apply the same top-positioning and row-truncation treatment to the `Workspace people` modal, not only direct/group creation
  - member rows in `Workspace people` / `New direct chat` / `New group chat` should preserve the primary action button area
  - truncate long names/emails with ellipses rather than letting content push the `Chat` / selection controls off screen
  - role/access badges inside those rows should hide or compress on the smallest screens before the action button is allowed to wrap away
- Unread chat dot placement rule:
  - do not show the unread red dot on the dashboard nav item
  - show it on the header `SidebarTrigger` only when the sidebar is closed
- Accept-invite mobile positioning:
  - the full-page invite acceptance card should sit higher on small screens instead of centering vertically
  - match the same mobile principle used in chat creation dialogs so software keyboards leave usable space
- First-time signup fallback:
  - every first-time signup should still receive `My Workspace` automatically
  - as a frontend safety net, if a user ever lands on `/onboarding/company`, the page should auto-attempt to create `My Workspace` and move the user forward without asking for manual setup
  - keep the manual workspace form only as a fallback if that automatic step fails
- Register-flow observation from a real browser pass:
  - logging out and creating a fresh email/password account on the current live site still routed to `/onboarding/company`
  - this indicates the deployed end-to-end flow is still exposing manual workspace setup even though the intended product rule is automatic `My Workspace` creation
  - re-test this after the next deploy so the live flow matches the fallback now present in the frontend code
- Pending invite token handling should be explicit, not ambient:
  - only preserve `pendingInviteToken` across login/signup when the user is intentionally in an invite flow (`?invite=1`)
  - normal visits to `/login` or `/signup` should clear stale invite tokens so old links do not hijack unrelated onboarding
  - invite-entry buttons from the accept-invite page should route to `/login?invite=1` and `/signup?invite=1`
- Signup stabilization:
  - after account creation or profile completion, poll onboarding status briefly before redirecting so the app is less likely to race into stale post-auth state
  - if the status still resolves to `PROFILE_COMPLETE_NO_COMPANY`, let the `/onboarding/company` page handle the automatic `My Workspace` fallback instead of leaving the user stranded
- Speed/reliability optimization pass:
  - the app should continue leaning on `Map` / hash-map style lookups plus targeted invalidation as the main DSA pattern for performance-sensitive UI and backend hot paths
  - TaskContext:
    - maintain a memoized `taskMap` keyed by task id so optimistic update/delete and selected-task sync avoid repeated linear scans
    - dedupe fetched tasks by id before storing them
  - ChatContext:
    - maintain memoized maps for conversations, messages, and tagged messages keyed by id
    - use those maps for active-conversation lookup, tagged-message refresh routing, and edit/delete/tag rollback lookups
  - WorkspaceContext:
    - maintain a memoized `workspacesByCompanyId` map so active-workspace resolution can use direct keyed access instead of repeated fallback scans
  - NotificationContext:
    - maintain a memoized `notificationsById` map so mark-read and clear actions can resolve targets in constant time
    - keep a synced ref for stream handlers so event processing can use keyed lookup without forcing stream re-subscription on every list change
  - ProjectContext:
    - maintain a memoized `projectsById` map so optimistic update flows and current-project sync avoid repeated `find(...)`
  - MyTaskContext / TaskDetailsSheet:
    - use keyed task lookup for syncing global-task updates into personal-task state and for opening the active task sheet
    - listen for shared task sync events so updates coming from project-detail task providers propagate into `My Tasks` immediately without requiring a manual refresh
    - task create/update/delete operations should broadcast a shared client-side task sync event after successful persistence
  - Workspace Manager / Sidebar:
    - use memoized maps for invite/member lookup in workspace-manager actions so copy/resend/edit flows do not repeatedly scan table data
    - use memoized section lookup maps in the sidebar so active chat/focus/settings/workspace-manager section resolution stays direct and predictable
  - guiding rule:
    - prefer `Map` for keyed entity lookup and cache layers
    - prefer `Set` for dedupe and invalidation groups
    - reserve heavier structures like priority queues or graphs for later ranking/dependency features
- Frontend branding workflow:
  - treat the current clean frontend state as `BASE`
  - `BASE` is the visual fallback point before any new branding experiment
  - when iterating on visual design, pair these two documents:
    - `01_crevo_brand_identity.md`
    - `03_crevo_app_design_brief.md`
  - use them together like this:
    - `01_crevo_brand_identity.md` defines the emotional target, palette, typography intent, motion personality, and voice
    - `03_crevo_app_design_brief.md` defines how that identity should show up inside the authenticated product shell and core screens
  - iteration rule:
    - start every branding pass from `BASE`
    - apply changes in narrow layers, not full redesigns
    - preferred order:
      1. color tokens
      2. status colors and active states
      3. surface treatment
      4. typography emphasis
      5. motion polish
      6. only then layout refinements if still needed
  - safety rule:
    - if a branding pass makes the app feel too different, revert to `BASE` and keep only the smallest successful layer
  - dark/light mode interpretation:
    - dark mode is the expressive primary brand experience
    - light mode should remain fully designed, but should be a softer translation of the same system rather than a separate personality
- brand application rule:
    - the work stays the hero
    - avoid decorative branding that competes with tasks, projects, chat, or workspace content
- BASE-to-brand implementation pass notes:
  - the current branded UI layer now applies the Crevo palette from the paired identity/app briefs without rebuilding page structure from scratch
  - shared token changes live in `client/src/index.css`
    - light mode uses a softer mist/cloud translation of the brand palette
    - dark mode uses the primary void/ink/volt system
    - borders and outlines stay muted; volt is reserved for active states, primary CTAs, and earned moments
    - the shell background now uses subtle radial atmosphere plus light grain instead of flat color
  - shared primitives updated for the branded system:
    - `button.tsx`
    - `card.tsx`
    - `input.tsx`
    - `badge.tsx`
    - `tooltip.tsx`
    - `sonner.tsx`
    - `sidebar.tsx`
  - Framer Motion is now part of the client stack and should be used lightly:
    - `MotionConfig` wraps the app in `client/src/App.tsx`
    - shell/header/content transitions use smooth, reduced-motion-safe fades/offsets
    - use motion to reinforce hierarchy and state changes, not to decorate every element
  - icon/input spacing rule:
    - decorative svg icons in fields should use a shared `field-icon` class
    - matching inputs should use `field-with-icon`
    - this rule now applies to the auth forms plus key search bars in Chat, Projects, Notes, and My Tasks
  - brand typography rule:
    - headings and display moments should opt into the display font treatment
    - body/UI copy stays on the body font stack
  - brand safety rule:
    - avoid large volt surface fills for message bubbles, tooltips, or wide content blocks
    - prefer volt-tinted accents and borders over full fills except for primary CTA buttons
- Marketing website app:
  - the public marketing site now lives as a separate Next.js App Router project in `website/`
  - keep it isolated from the product app in `client/`; do not mix routing, state, or styling concerns across those two apps
  - source-of-truth documents for the marketing site:
    - `01_crevo_brand_identity.md`
    - `02_crevo_landing_page_brief.md`
  - technical baseline:
    - Next.js App Router
    - TypeScript
    - Tailwind CSS
    - shadcn-style local UI primitives in `website/components/ui`
    - Framer Motion for subtle reveal/interaction polish
    - Supabase-backed waitlist server action
  - route structure currently shipped:
    - `/`
    - `/about`
    - `/contact`
    - `/privacy-policy`
    - `/terms`
    - `/features`
    - `/pricing`
    - `/for-agencies`
    - `/waitlist`
  - waitlist/referral rules:
    - waitlist insert is handled in `website/actions/waitlist.ts`
    - use `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the server side
    - referral links use `NEXT_PUBLIC_SITE_URL`
    - inbound `?ref=` codes are captured on the client and stored in localStorage under `crevo_ref`
    - once signup succeeds, show the user their referral link with copy/share actions
  - marketing-site environment file:
    - `website/.env.example`
  - deployment split:
    - public marketing site should own `https://www.trycrevo.com`
    - product app should live on a separate app host such as `https://app.trycrevo.com`
    - the website should link `Log in` to `NEXT_PUBLIC_APP_URL`, defaulting to:
      - dev: `http://localhost:5173/login`
      - prod: `https://app.trycrevo.com/login`
    - keep the website and product as separate deployments to avoid route conflicts on `/`, `/login`, and `/dashboard`
  - Netlify deployment:
    - repo root `netlify.toml` now points Netlify at `website/` as the build base
    - deployment instructions live in `website/DEPLOYMENT.md`
  - deployment note:
    - `website/netlify.toml` is included for the separate site build target
  - website default-theme rule:
    - the marketing site should ship dark-first by default
    - any light-mode support should be intentional and secondary, not the first-render experience
  - website polish notes:
    - `website/app/icon.tsx` now owns the Crevo favicon/app icon
    - homepage hero polish should prioritize stronger contrast, cleaner conversion hierarchy, and richer product-mockup credibility before broad page-wide redesigns
    - waitlist conversion polish should prioritize confidence cues, referral motivation, and a cleaner split-layout on larger screens
    - the waitlist form should avoid reading browser-only referral state during render; use a client-safe subscription/snapshot pattern so static pages do not hydrate differently from the server
    - public marketing forms should use layered spam protection:
      - hidden honeypot field
      - minimum fill time
      - server-side in-memory rate limiting keyed by request fingerprint and email
    - `website/supabase/waitlist.sql` contains the baseline waitlist table schema expected by the current server action
    - the waitlist schema now also supports `agency`, and the join action should stay backward-compatible if an older table has not been altered yet
    - the marketing site should resolve to `http://localhost:3000` by default in development and `https://www.trycrevo.com` by default in production if `NEXT_PUBLIC_SITE_URL` is not explicitly set
    - metadata and canonical URLs should derive from `website/lib/site.ts` so domain changes stay centralized
    - contact form delivery now targets `hi@trycrevo.com` through SMTP-backed server mail in `website/lib/mailer.ts`
      - requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
      - optional `SMTP_FROM`, defaulting to `notify@trycrevo.com`
      - recipient defaults to `CONTACT_INBOX_EMAIL` or `hi@trycrevo.com`
      - both contact and waitlist flows should send acknowledgement emails back to the submitter from the notify sender when SMTP is configured
      - the current working SMTP host for trycrevo mail is `mail.trycrevo.com`
      - the waitlist success state should prioritize copying the referral link and explain that referrals can unlock future discounts; avoid generic share-button clutter
      - if the mail server enforces sender/user matching, authenticate as `notify@trycrevo.com` so acknowledgements can come from that mailbox while inbound contact still routes to `hi@trycrevo.com`
      - website server env access now runs through `website/lib/server-env.ts` with `server-only`
      - for Netlify-safe deploys, prefer setting only real secrets in the env dashboard:
        - `SUPABASE_SERVICE_ROLE_KEY`
        - `WAITLIST_ADMIN_PASSWORD`
        - `WAITLIST_ADMIN_SESSION_SECRET`
        - `SMTP_PASS`
      - non-secret mail settings can be omitted from Netlify because the website now has safe defaults for:
        - inbox email
        - SMTP host
        - SMTP port
        - SMTP user
        - SMTP from
    - private waitlist operations now live at `/ops/login` and `/ops`
      - auth is env-backed and cookie-based through `website/lib/ops-auth.ts`
      - use `WAITLIST_ADMIN_EMAIL`, `WAITLIST_ADMIN_PASSWORD`, and `WAITLIST_ADMIN_SESSION_SECRET`
      - keep ops pages `noindex`
      - support search, direct vs referred filters, CSV export, and quick email-list actions
      - show a warning if the server-side Supabase key is still anon so production hardening is not forgotten
  - product shell defaults:
    - the main app should default to dark mode unless the user explicitly chose light mode
    - keep the product favicon aligned with the website favicon/mark treatment so the brand stays consistent across both apps
- Chat transport and scaling notes:
  - current production-safe migration strategy is phased:
    - first reduce false-positive chat `429`s
    - then reduce noisy refresh churn on the client
    - then introduce WebSockets alongside the existing stream path before any full cutover
  - chat rate-limiter adjustments:
    - the global `/api` limiter should skip `/api/chat/*` requests because chat has its own route-specific controls and higher read frequency
    - chat message limit is now tuned for active group use at `75/minute/user`
    - chat typing limit is now tuned for real typing bursts at `60/10s/user`
  - chat refresh policy:
    - conversation-list refreshes should be coalesced and throttled rather than rescheduled on every event
    - active-conversation refreshes should also be throttled so busy rooms do not hammer the backend with repeated fetches
  - WebSocket migration foundation:
    - backend WebSocket entrypoint now exists at `/api/chat/ws`
    - it authenticates with the same Firebase token query-param pattern used by the SSE stream
    - it forwards the same `ChatRealtimeEvent` payloads as the SSE transport
    - presence still opens and closes through the existing chat realtime service
    - the client now attempts WebSocket first and falls back to SSE automatically if the socket transport is unavailable
  - unread sync behavior:
    - the last selected conversation should only be treated as actively viewed while the user is actually on `/chat`
    - leaving `/chat` must not keep marking that thread as read from background state alone
    - off-screen `chat.message.created` events should bump in-memory unread counts immediately so the sidebar/header badge updates before the reconciliation fetch returns
    - lightweight message-event dedupe is now used during migration so optimistic unread updates do not double-count if the same message is observed through overlapping event paths
  - safety rule:
    - do not remove the SSE path until WebSocket behavior has been verified under real multi-user load in direct chat, group chat, presence, typing, and workspace switching flows
- Settings and first-run behavior:
  - `Workspace Health` should default to off for new users so the sidebar stays quieter until an admin explicitly enables it
  - the workspace-health sidebar preference is now stored per-user instead of globally in browser local storage, so one account does not leak that toggle state into another on the same device
  - new-account dashboard stability:
    - a fresh signup was able to reach `/dashboard`, but the empty-state dashboard used to hit a `Maximum update depth exceeded` loop in the first-project dialog path
    - the new-user dashboard now renders cleanly with the `No projects yet` state and `Create Your First Project` CTA
    - the safer structure is to keep the first-project trigger button outside the controlled dialog tree and render the dialog separately; this avoids the ref/update loop that could appear on a brand-new account with no projects
  - dashboard empty state:
    - when there are no projects, do not render overview stats or decorative cards
    - the no-project dashboard should show only the create-project prompt and button
- Perceived performance notes:
  - first dashboard load is currently dominated by multiple app-shell providers fetching in parallel, including user, settings, workspaces, projects, tasks, clients, team members, notifications, and chat conversations
  - chat tagging felt functionally correct, but the UI was doing unnecessary follow-up GETs after each quick tag change
  - tag updates are now treated as local-first:
    - optimistic message/tag state is updated immediately
    - the client seeds a short-lived realtime dedupe key for its own `chat.message.updated` event before the PATCH resolves
    - conversation-list refresh is no longer forced after every tag toggle because tag edits do not change the sidebar conversation summary
    - this keeps rapid tag/untag interactions to the PATCH itself instead of bouncing through a full active-conversation refresh loop
  - dashboard preload pass:
    - chat conversation list still preloads for unread state, but chat workspace-member fetch is now deferred until the user is actually on `/chat`
    - personal tasks now preload only on `/mytasks` and `/projectdetails/*`
    - subtasks now preload only on `/mytasks`
    - this removes unnecessary first-load requests from the dashboard route without changing the product shell contract
    - to reduce the feeling that Focus and Chat always have to \"load on click\", the sidebar now starts a lighter background prefetch when those parent groups open:
      - opening `Focus` from the dashboard triggers `my-tasks` prefetch before navigation
      - opening `Chat` starts the workspace-member preload before entering the chat screen
      - this keeps the dashboard lighter than eager shell-wide fetching while making those sections feel less cold on entry
- Sidebar interaction polish:
  - desktop sidebar width now animates with Framer Motion instead of snapping between collapsed and expanded states
  - nested sidebar menus now animate open/close with height and opacity transitions
  - when a parent submenu like `Settings` opens, the sidebar now smooth-scrolls that revealed panel into view so users do not need to manually scroll to discover the newly opened options
- Invite acceptance sync:
  - notification-created events now dispatch a lightweight browser event when a realtime notification arrives
  - accepted-invite notifications are now used to refresh:
    - team members in `TeamMemberContext`
    - workspace manager snapshot data
    - the invites list when the invites section is open
  - this keeps the team/invite surfaces fresher after an invite is accepted without waiting for a full page reload
  - browser verification:
    - with the Team tab already open, a newly accepted invite appeared in the team list without a manual refresh
    - the same pass also showed the invite status move to `ACCEPTED` in Workspace Manager
- Chat send-path optimization:
  - chat message realtime events now carry the updated message payload instead of only IDs
  - the client applies `chat.message.created`, `chat.message.updated`, and `chat.message.deleted` locally to messages, tagged messages, conversation previews, and unread counts
  - own send/edit/delete actions seed short-lived realtime dedupe keys so the returning socket event does not trigger redundant safety refreshes
  - structural events like conversation updates and membership changes still schedule background refreshes as a safety net
  - browser verification:
    - after a fresh chat load, sending a tagged message produced the initial conversation boot GETs and the expected `POST /messages`
    - there was no extra post-send GET fan-out after the message was created
- Dashboard filtering behavior:
  - if a workspace has projects but the current filters return zero matches, show a dedicated filtered-empty state instead of a blank grid
  - the filtered-empty state should explain that no projects match the current filters and offer a one-click `Reset Filters` action
- Task creation friction note:
  - the inline quick-add task row in project detail was reverted
  - task creation there currently goes through the full task dialog again until a narrower low-friction flow is reintroduced
- Copy alignment rules:
  - Crevo copy should feel warm, clear, and human rather than robotic or procedural
  - prefer phrases like `Start a project`, `Invite a teammate`, `Delete project?`, and `This can't be undone`
  - avoid scaffolding language such as `Input project details`, `Create New ...`, or metadata labels that read like implementation details
  - group info should focus on purpose, members, and activity; remove labels like `Type: Group chat`
- Product analytics:
  - PostHog is now the app analytics path for the main client when `VITE_POSTHOG_KEY` is present
  - the app tracks SPA pageviews manually on route changes, identifies authenticated users, groups them by company, and resets analytics state on logout
  - Firebase Analytics initialization was removed from the main client to avoid running two browser analytics systems at once
- Phase 1 critical bug-fix pass:
  - project detail overview scrolling:
    - removed the project detail page-level scroll trap by letting the app shell's main scroll container own overview scrolling
    - the overview tab no longer creates an inner `overflow-y-auto` region, which reduces MacBook trackpad scroll traps and double-scroll behavior
  - notes editor paste behavior:
    - the Quill paste sanitizer now runs in the capture phase and stops the native paste event before Quill's internal listener can also process the same formatted paste
    - formatted HTML paste still keeps allowed formatting, but inserts exactly once
  - deleted chat messages:
    - deleted messages no longer render the message action trigger at all
    - this removes the ellipsis/action menu for deleted messages in the shared `MessageBubble` path used by group and direct chat
  - projects list:
    - removed the redundant eye icon action from the project table
    - clicking or keyboard-opening the project row now navigates to the project detail page and sets the current project
    - edit/delete buttons stop event propagation so they do not accidentally open the project row
  - files touched:
    - `client/src/pages/projectDetail/ProjectDetail.tsx`
    - `client/src/components/notes/NoteEditor.tsx`
    - `client/src/pages/Chat.tsx`
    - `client/src/pages/Projects.tsx`
  - verification:
    - `client`: `npx tsc -b`
    - `server`: `npm run build`
    - `client`: `npm run build`
    - Playwright browser pass created a throwaway account/workspace and verified project row navigation, project overview wheel scrolling, formatted/plain note paste, chat message delete, and no deleted-message action trigger on hover
  - observed follow-up:
    - the first throwaway signup briefly exposed a dashboard `Maximum update depth exceeded` crash before a direct navigation recovered into the workspace; it did not reproduce after the workspace shell loaded, but it should stay on the follow-up radar if new users report blank dashboard behavior again
- Phase 2 notifications pass:
  - blocking dashboard crash:
    - PostHog session recording and autocapture are now disabled in the app client
    - explicit route pageviews, user identify, and company grouping remain active
    - this removes the recorder script path that was contributing to dashboard instability and noisy blocked-client console retries
  - task due reminders:
    - added `task_due_notification_log` to dedupe scheduled reminders by task, user, and milestone
    - added server scheduler logic for:
      - due today
      - due in 2 days
    - due reminders create in-app notifications and send the existing branded email path when the user's notification settings allow it
    - reminder copy now uses the urgent-but-professional tone: `Please take action to avoid delays.`
  - daily focus email preference:
    - added `daily_focus_email_enabled` to user settings
    - added the Settings toggle `Receive Daily Focus Email`
    - the server scheduler can send one Daily Focus email per user per focus date when the preference and email notifications are enabled
    - Daily Focus email content is sourced from the existing retention/daily-focus service so it can include today's tasks and key decisions
  - frontend notification routing:
    - task due notifications now route users to `/mytasks`
    - task due notifications use the existing task/work icon language
  - files touched:
    - `client/src/Types/types.ts`
    - `client/src/api/user-settings.api.ts`
    - `client/src/hooks/useSettings.ts`
    - `client/src/lib/notifications.ts`
    - `client/src/lib/posthog.ts`
    - `client/src/pages/Settings.tsx`
    - `server/prisma/migrations/20260411224500_add_scheduled_notification_preferences/migration.sql`
    - `server/src/index.ts`
    - `server/src/services/emailNotification.service.ts`
    - `server/src/services/scheduledNotification.service.ts`
    - `server/src/services/userSettings.service.ts`
    - `server/src/types/userSettings.types.ts`
  - verification:
    - applied migration with `npx prisma migrate deploy`
    - `client`: `npx tsc -b`
    - `server`: `npm run build`
    - `client`: `npm run build`
    - Playwright MCP/manual browser pass:
      - dashboard loads without the previous `Maximum update depth exceeded` crash
      - Settings > Notifications shows `Receive Daily Focus Email`
      - the Daily Focus preference persists through the user settings API
      - browser console showed no warnings/errors during the final dashboard/settings pass
    - scheduler simulation:
      - created one temporary due-today assigned task
      - ran `ScheduledNotificationService.runOnce`
      - verified one in-app `task_due:due_today:<taskId>` notification was created
      - cleaned up the temporary task, assignment, notification, and notification log afterwards
  - risks and follow-ups:
    - the scheduler currently runs inside the API process; before multi-instance deployment, move it to an external cron/worker or add a distributed lock
    - the scheduler hour uses the server process timezone; per-user timezone support would make Daily Focus emails feel more personal
    - the local verification sent through the configured SMTP path even when the Resend key was blank, so future scheduler simulations should use a mailer mock flag before running against real accounts
    - no checked-in Playwright test suite exists for the client, so browser verification for this phase was done through Playwright MCP/manual flows
- Phase 3 task system improvements:
  - task folders:
    - added a `task_folders` table and nullable `tasks.folder_id`
    - existing tasks remain safe because missing folders fall back to an `Unfiled` section
    - project task views now support creating folders and expanding/collapsing folder groups
    - the task form now includes a folder selector so tasks can be moved between folders without a separate heavy workflow
  - archive completed tasks:
    - added nullable `tasks.archived_at`
    - active project task queries hide archived tasks by default
    - the project task tab now has an archive panel where completed tasks can be reviewed and restored
    - only completed tasks can be archived server-side
    - archive/restore events dispatch local task sync so My Tasks does not keep stale archived tasks in view
  - subtask improvements:
    - the existing progress badge and progress bar now pair with a sort toggle
    - users can switch subtasks between oldest-first and newest-first ordering inside the task details sheet
  - files touched:
    - `client/src/Types/types.ts`
    - `client/src/api/tasks.api.ts`
    - `client/src/components/TaskForm.tsx`
    - `client/src/context/TaskContext.tsx`
    - `client/src/mapper/task.mapper.ts`
    - `client/src/pages/MyTasks/components/SubtasksSection.tsx`
    - `client/src/pages/projectDetail/ProjectDetail.tsx`
    - `server/prisma/schema.prisma`
    - `server/prisma/migrations/20260412003000_add_task_folders_and_archive/migration.sql`
    - `server/src/controllers/task.controller.ts`
    - `server/src/dbSelect/myTasks.select.ts`
    - `server/src/dtos/task.dto.ts`
    - `server/src/mapper/task.mapper.ts`
    - `server/src/routes/task.route.ts`
    - `server/src/services/task.service.ts`
    - `server/src/services/taskFolder.service.ts`
  - verification:
    - applied migration with `npx prisma migrate deploy`
    - `client`: `npx tsc -b`
    - `server`: `npm run build`
    - `client`: `npm run build`
    - Playwright MCP/manual browser pass:
      - created a folder in the project task tab
      - created a task and filed it into that folder
      - marked the task complete
      - archived the completed task
      - opened the archive panel and restored the task
      - temporarily assigned the task to the current member to verify My Tasks details
      - added two subtasks and verified the `0/2` progress count plus oldest/newest sort toggle
      - cleaned up the temporary task, assignment, subtasks, notifications, logs, and folder after verification
      - final project task tab sanity pass showed no warnings/errors in the browser console
  - risks and follow-ups:
    - folder management is intentionally minimal in this pass; rename, delete, and drag-to-folder can come later
    - archive/restore currently lives in the project task tab; a dedicated archive screen may be better once usage grows
    - project progress counts still include archived completed tasks until project stats are recalculated around archive visibility rules
- Phase 3 correction pass:
  - corrected the folder model after clarification:
    - project task folders were removed from the project detail task tab
    - the accidental persisted `task_folders` table and `tasks.folder_id` column were removed with a cleanup migration
    - My Tasks now creates automatic project folders from each assigned task's project
    - if a teammate has assigned work across multiple projects, My Tasks shows one collapsible folder per project
  - personal archive behavior:
    - team members can archive and restore their own assigned completed tasks
    - My Tasks exposes an Archive panel for personal archived tasks
    - team members still cannot delete tasks from My Tasks
  - project task archive behavior:
    - the project detail task tab stays flat again
    - each project task row now uses an ellipsis menu for actions
    - admin/project task actions include edit, archive for completed tasks, and delete
  - subtask visibility:
    - My Tasks cards now show subtask progress when subtasks exist, for example `1/2`
    - the existing subtask details panel keeps the oldest/newest sort toggle and progress updates
  - files touched:
    - `client/src/Types/types.ts`
    - `client/src/api/tasks.api.ts`
    - `client/src/components/TaskForm.tsx`
    - `client/src/context/MyTaskContext.tsx`
    - `client/src/context/TaskContext.tsx`
    - `client/src/mapper/task.mapper.ts`
    - `client/src/pages/MyTasks/MyTasksPage.tsx`
    - `client/src/pages/MyTasks/components/TaskCard.tsx`
    - `client/src/pages/MyTasks/components/TasksList.tsx`
    - `client/src/pages/projectDetail/ProjectDetail.tsx`
    - `server/prisma/schema.prisma`
    - `server/prisma/migrations/20260412013000_remove_project_task_folders/migration.sql`
    - `server/src/controllers/task.controller.ts`
    - `server/src/dbSelect/myTasks.select.ts`
    - `server/src/dtos/task.dto.ts`
    - `server/src/mapper/task.mapper.ts`
    - `server/src/routes/task.route.ts`
    - `server/src/services/task.service.ts`
  - verification:
    - applied cleanup migration with `npx prisma migrate deploy`
    - `client`: `npx tsc -b`
    - `server`: `npm run build`
    - `client`: `npm run build`
    - Playwright MCP/manual browser pass:
      - seeded temporary assigned tasks across two projects
      - verified My Tasks showed two project folders automatically
      - verified subtask progress appeared on the task card
      - archived a completed personal task
      - verified it disappeared from active My Tasks
      - opened Archive and verified the archived task appeared after reload
      - restored the task and verified it returned to active My Tasks
      - verified Project Detail task tab no longer shows project folders
      - verified Project Detail task actions are under an ellipsis menu
      - cleaned temporary tasks, subtasks, assignments, notifications, logs, and the temporary project after testing
  - risks and follow-ups:
    - My Tasks project folders are derived from current task data, so there is no rename/reorder for folders yet
    - archive still requires completed status server-side to match the original Phase 3 rule
- Phase 4 notes system improvements:
  - notes folder system:
    - Notes now group automatically by linked project in the Notepad list
    - notes without a linked project appear under an `Others` folder
    - folders are collapsible and show a compact note count
    - this uses the existing `projectId` relationship on notes, so no database migration was needed
  - share notes in chat:
    - active notes can now be shared from the editor toolbar or note row action menu
    - the share flow loads available direct/group conversations and sends a chat message with a safe note snapshot in metadata
    - Chat now renders shared-note messages as compact cards instead of plain robotic text
    - clicking a shared-note card opens a modal with the note content and `Save to notes` / `Cancel`
    - saving creates a personal note copy for the viewer
  - files touched:
    - `client/src/lib/shared-notes.ts`
    - `client/src/pages/Notepad.tsx`
    - `client/src/pages/Chat.tsx`
  - verification:
    - `client`: `npm run build`
    - targeted lint: `npx eslint src/pages/Chat.tsx src/pages/Notepad.tsx src/lib/shared-notes.ts`
    - full lint was also attempted, but the repo still has pre-existing lint debt across unrelated files
    - Playwright MCP/manual browser pass:
      - verified Notepad groups an unlinked note under `Others`
      - opened a note and verified the share dialog loads conversations
      - shared the note to the General chat; backend logged `POST /api/chat/conversations/.../messages` as `201`
  - risks and follow-ups:
    - final chat rendering/save-modal verification was blocked by local backend/database instability after the successful send
    - observed backend errors were Prisma `P2028`, `connection failure during authentication`, and transient Supabase/notification fetch failures
    - once the local DB connection is stable, rerun a browser pass on the shared note card and `Save to notes` modal
