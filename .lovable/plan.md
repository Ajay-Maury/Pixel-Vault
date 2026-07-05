# Groups hardening: tests, responsiveness, invites view, invite validation

Five focused workstreams. All frontend + Vitest — no backend changes.

## 1. End-to-end tests (Vitest + Testing Library, mocked API)

New file: `src/pages/__tests__/groups.e2e.test.tsx`

The backend is external and the sandbox can't hit it, so "end-to-end" here means full component flows with `src/lib/api.ts` mocked via `vi.mock`. Covers the request scenarios:

- **Group creation**: open Groups → click "New Group" → type name > 10 chars is clipped → submit → `createGroup` called → toast + list refresh.
- **Invite by email**: on GroupDetail Members tab → type email → debounced `searchUsers` fires once after typing settles → pick a suggestion → `inviteToGroup` called → pending row appears.
- **Accept / reject**: Invites tab renders one pending invite from mocked `listMyInvites` → Accept calls `acceptInvite`, moves group into Joined; separate case: Reject calls `rejectInvite`, row hides accept/open button.
- **Member visibility & download rights**: render GroupDetail as non-owner (mock `me` id ≠ `group.ownerId`) → Members tab is hidden or read-only, Analytics tab hidden, image cards show Download but no edit/delete; opening `ImageDetailModal` in group context calls `recordGroupDownload` on download and doesn't render owner-only controls.

Uses existing `vitest.config.ts` + `src/test/setup.ts`. Adds a small `renderWithRouter` helper inline. Mocks `sonner`'s `toast` to assert calls without DOM.

## 2. Fix breaking UI / functionality found during test authoring

While wiring the tests I'll exercise the real components; anything that throws or misbehaves gets a minimal fix in the same PR. Known likely items (verified before edit):

- `GroupDetail` invite input: currently no email format guard before calling `searchUsers` — invalid strings hit the network. Fixed in §5.
- `Groups.tsx` pending badge shows `0` chip even when zero — cosmetic, hide when 0.
- `ImageDetailModal` group-context download path: ensure `recordGroupDownload` runs before the browser download so a failed audit doesn't silently swallow. Wrap in try/catch, still download on audit failure but toast a warning.

If additional real breakages surface (e.g. undefined guards on `group.ownerId`), they get listed in the final reply and patched.

## 3. Responsiveness audit (all pages, mobile → desktop)

Manual sweep via Playwright at 375 / 768 / 1280 widths, screenshots into `/tmp/browser/responsive/`. Pages: Login, Register, Gallery, Upload, Profile, Groups, GroupDetail, ImageDetailModal open state.

Fix pattern per page (only where broken):

- Ensure horizontal scroll never appears (`overflow-x` audit on top-level containers).
- Sticky action bars in Gallery bulk mode: stack buttons vertically < 640px, keep single row ≥ 640px.
- GroupDetail Analytics table: wrap in `overflow-x-auto` on mobile.
- Groups tab triggers: allow wrap on < 400px so the pending badge isn't cut off.
- Navbar: verify the Groups link + invites badge fit on mobile; collapse into existing mobile menu if one exists, otherwise shrink label.

Any page that already passes gets no code change — noted in the final reply.

## 4. Dedicated "My Invites" view

Rather than a new route, promote the existing Invites tab into a first-class experience:

- Add `/invites` route in `App.tsx` that renders `<Groups defaultTab="invites" />` — deep-linkable from the navbar bell/badge and from email-style notifications later.
- Extend `Groups.tsx` to accept `defaultTab` prop and read `?tab=` from the URL, keeping tab state in sync with the query string (so refresh/back works).
- Enrich the Invites list rows:
  - Group name, inviter email (from `invite.inviter?.email` if backend returns it — fallback to "—").
  - Status pill (existing helper already colors pending / accepted / rejected).
  - Invited-at + responded-at timestamps (relative, e.g. "2h ago").
  - For accepted rows: prominent "Open group →" button.
  - For rejected rows: muted, with a "Hidden" tag.
  - Client-side filter chips: All / Pending / Accepted / Rejected.
- Navbar invite badge links to `/invites` directly (currently `/groups`).

No backend contract change; if a field like `inviter` isn't returned it renders the fallback gracefully.

## 5. Stronger email validation + debounced autocomplete

In `src/pages/GroupDetail.tsx` invite input:

- Extract a `useDebouncedValue(value, 300)` hook (new `src/hooks/use-debounced-value.ts`).
- Validate with a zod schema (`z.string().trim().toLowerCase().email().max(255)`) before firing `searchUsers`; show inline helper text for invalid input and disable the "Invite" button.
- Cancel in-flight searches on new keystrokes via an `AbortController` passed into `searchUsers` (extend the api wrapper's signature to accept an optional signal — non-breaking).
- Cap suggestions to 8, keyboard-navigable (↑/↓/Enter/Esc), and dismiss on outside click.
- Prevent inviting yourself or an already-invited/member email — client-side guard using the group's member list plus current user's email.

## Technical notes

- New deps: none. Zod is already installed (used elsewhere for validation). If not, `bun add zod` in the same turn.
- Tests run with `bunx vitest run` — the harness already picks up `vitest.config.ts`.
- No changes to `src/integrations/supabase/*` or backend API endpoints.
- README gets a short "Testing" section pointing at `bunx vitest run` and the covered flows.

## Out of scope

- Real network E2E against the deployed backend (sandbox can't reach it reliably; mocked flows cover the same UI logic).
- Push/email notifications for new invites.
- Bulk invite (multi-email paste) — can follow if requested.

Ready to build on approval.
