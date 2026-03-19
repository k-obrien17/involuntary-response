---
phase: 17-client-robustness-ux
plan: 01
subsystem: ui
tags: [react, null-safety, optional-chaining, iframe-security, debounce, ux]

requires:
  - phase: 15-server-auth-hardening
    provides: Auth middleware with loading state in AuthContext
provides:
  - Null-safe PostCard and PostListItem components
  - Iframe attribute allowlist in EmbedPreview
  - Auth-loading-gated EditPost ownership check
  - Debounce cleanup on EmbedInput unmount
  - Safe Z-suffix formatDate in admin pages
  - Dead code removal (ProtectedRoute)
  - Publish re-fetch flow (no full reload)
  - Delete error feedback in EditPost
affects: []

tech-stack:
  added: []
  patterns:
    - "Optional chaining for all post.author/post.tags access"
    - "Iframe attribute allowlist for dangerouslySetInnerHTML"
    - "Auth loading gate before ownership checks"

key-files:
  created: []
  modified:
    - client/src/components/PostCard.jsx
    - client/src/components/PostListItem.jsx
    - client/src/pages/ArtistPage.jsx
    - client/src/pages/EditPost.jsx
    - client/src/components/EmbedInput.jsx
    - client/src/components/EmbedPreview.jsx
    - client/src/pages/ViewPost.jsx
    - client/src/pages/admin/Invites.jsx
    - client/src/pages/admin/Contributors.jsx

key-decisions:
  - "Renamed EditPost loading state to loadingPost to avoid collision with auth loading"
  - "Admin formatDate fixed inline rather than extracted to shared utility (minimal scope)"

patterns-established:
  - "Optional chaining pattern: always use post.author?.field with fallback for display names"
  - "Iframe allowlist: src, width, height, allow, sandbox only"

requirements-completed: [ROBU-01, ROBU-02, ROBU-03, ROBU-04, ROBU-05, ROBU-06, ROBU-07, ROBU-08, UX-01, UX-02]

duration: 2min
completed: 2026-03-19
---

# Phase 17 Plan 01: Client Robustness & UX Summary

**Null-safety fixes, iframe attribute allowlist, auth loading gate, debounce cleanup, and publish re-fetch across 9 client files**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-19T12:10:54Z
- **Completed:** 2026-03-19T12:12:23Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Eliminated null-safety crashes in PostCard and PostListItem when post.tags or post.author is missing
- Hardened EmbedPreview iframe output to only allowlisted attributes (src, width, height, allow, sandbox)
- Fixed EditPost auth loading race condition and added delete error feedback
- Removed dead ProtectedRoute.jsx, redundant decodeURIComponent in ArtistPage, and window.location.reload in ViewPost
- Fixed formatDate Z-suffix double-append in admin pages

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix client robustness issues (ROBU-01 through ROBU-08)** - `76b3ca4` (fix)
2. **Task 2: Fix UX issues (UX-01, UX-02)** - `7883e41` (fix)

## Files Created/Modified
- `client/src/components/PostCard.jsx` - Optional chaining for post.tags and post.author
- `client/src/components/PostListItem.jsx` - Optional chaining for post.author with fallbacks
- `client/src/pages/ArtistPage.jsx` - Removed redundant decodeURIComponent
- `client/src/pages/EditPost.jsx` - Auth loading gate, delete error message, renamed loadingPost
- `client/src/components/EmbedInput.jsx` - Debounce timer cleanup on unmount
- `client/src/components/EmbedPreview.jsx` - Iframe attribute allowlist
- `client/src/pages/ViewPost.jsx` - Re-fetch after publish instead of full reload
- `client/src/pages/admin/Invites.jsx` - Safe Z-suffix formatDate
- `client/src/pages/admin/Contributors.jsx` - Safe Z-suffix formatDate
- `client/src/components/ProtectedRoute.jsx` - Deleted (dead code)

## Decisions Made
- Renamed EditPost's `loading` state to `loadingPost` to avoid collision with auth context's `loading`
- Fixed admin formatDate inline in both files rather than extracting to shared utility (minimal change scope)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing files] Admin formatDate files not listed in plan files_modified**
- **Found during:** Task 1 (ROBU-06)
- **Issue:** Plan's files_modified frontmatter listed `client/src/utils/formatDate.js` but the actual bug was in `client/src/pages/admin/Invites.jsx` and `client/src/pages/admin/Contributors.jsx` (plan body correctly identified this)
- **Fix:** Modified the correct admin files as described in the plan body
- **Files modified:** `client/src/pages/admin/Invites.jsx`, `client/src/pages/admin/Contributors.jsx`

---

**Total deviations:** 1 auto-fixed (1 missing files in frontmatter, correctly documented in plan body)
**Impact on plan:** No scope creep. Plan body was accurate; frontmatter file list was slightly off.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All client robustness and UX issues from v3.0 audit addressed
- Phase 17 complete (single plan)
- Ready for Phase 18 (server robustness) if planned

---
*Phase: 17-client-robustness-ux*
*Completed: 2026-03-19*
