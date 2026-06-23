
# Plan: Bulk Actions + Share Groups + Download Analytics

Backend already exposes everything needed (bulk privacy/delete, share-groups CRUD, invites accept/reject, group images add/remove, downloads with audit, owner analytics, user search). This is a pure frontend build.

## 1. API Layer (`src/lib/api.ts`)

Add typed wrappers for all new endpoints:
- `bulkUpdatePrivacy(imageIds, isPrivate)` → `POST /image/bulk/privacy`
- `bulkDeleteImages(imageIds)` → `POST /image/bulk/delete`
- `searchUsers(email, limit?)` → `GET /user/search`
- Share groups: `createGroup`, `listMyOwnedGroups`, `listMyJoinedGroups`, `listMyInvites(status?)`, `getGroup(id)`, `inviteToGroup(id, emails[])`, `acceptInvite(memberId)`, `rejectInvite(memberId)`, `getGroupImages(id, filters)`, `addImagesToGroup(id, imageIds[])`, `removeImagesFromGroup(id, imageIds[])`, `recordGroupDownload(id, imageId)`, `getGroupDownloadsSummary(id)`, `listGroupDownloads(id, limit, offset)`, `renameGroup(id, name)`, `deleteGroup(id)`, `removeGroupMember(id, memberId)`

## 2. Gallery — Bulk selection (`src/pages/Gallery.tsx`)

Only in **My Library** tab:
- "Select" toggle in toolbar → enters selection mode
- Checkbox overlay on each card; "Select all on page" / "Clear" controls
- Selection action bar (sticky) with counts: **Make Public**, **Make Private**, **Delete** (confirm dialog), **Add to group…** (opens group picker dialog listing user's owned groups + "Create new group" inline)
- Refetch after each action; clear selection

## 3. Share Groups page (`src/pages/Groups.tsx`, route `/groups`)

Tabs: **My Groups (owned)**, **Joined**, **Invites**.
- **My Groups**: list cards with name, member count, image count, actions (Rename, Delete, Open).
  - "Create group" button → dialog with name input (maxLength 10, validation)
  - Open → group detail view (below)
- **Joined**: cards link to read-only group detail
- **Invites**: pending/accepted/rejected list, Accept / Reject buttons on pending

Add **Groups** link to `Navbar.tsx` and **Invites** indicator (badge with pending count).

## 4. Group Detail (`src/pages/GroupDetail.tsx`, route `/groups/:id`)

Owner view:
- Header: name (inline rename), delete button
- Tabs: **Images**, **Members**, **Analytics**
- **Images**: gallery of group images with filters (search, visibility, sort). Owner can multi-select to **Remove from group**. "Add images" button → opens picker dialog showing the owner's library (paginated, searchable, multi-select) → calls `addImagesToGroup`.
- **Members**: list with status badges (Pending / Accepted / Rejected), invited date, Remove button. "Invite users" button → dialog with email input + autocomplete via `searchUsers`, supports multiple chips, sends `inviteToGroup`.
- **Analytics**: summary cards (total downloads, unique users, top images) from `downloads/summary` + paginated audit table from `downloads`.

Member view (joined, not owner):
- Read-only image grid with download button per image (calls `recordGroupDownload` then opens returned URL)
- Members tab read-only, no analytics, no add/remove

## 5. ImageDetailModal

When opened from a group context, replace owner-only edit/delete controls with a Download button that routes through `recordGroupDownload`.

## 6. README

Document bulk actions, share groups, invites, group analytics, and the new routes.

## Technical notes

- New routes wired in `App.tsx` under `RequireAuth`
- Reuse shadcn `Dialog`, `Checkbox`, `Tabs`, `Badge`, `Command` (autocomplete), `Table`, `AlertDialog`
- Email-autocomplete debounced 250ms, min 2 chars
- Group name input enforces 10-char max client-side, lowercase trim
- All counts driven by API response (no client recompute)
- Selection state lives in Gallery; cleared on tab change or page change

## Out of scope (ask if wanted)

- Real-time invite notifications (websocket / polling beyond on-page refresh)
- Reordering of group images
- Bulk add-to-group from outside Gallery selection mode
