# Code Review — Fixes Applied
**Date:** 2026-10-19  
**Branch:** JA-230317693  
**Reviewed by:** Claude Code (code-review skill, high effort)  
**App:** GoldenWay (React / Vite / Supabase — live on Vercel)

---

## Summary

8 bugs identified and fixed across 5 files. All changes are backwards-compatible and non-breaking. The SQL fix is applied as a new additive migration (0021) rather than editing the already-deployed 0020.

---

## Fixes

### 1 — Re-auth error swallowed as "Password is incorrect"
**File:** `frontend/src/api/goldenway.js:438`  
**Severity:** High

**Problem:** Every `signInWithPassword` failure during account deletion threw a hardcoded `"Password is incorrect"` message, hiding real errors like rate-limiting (HTTP 429), network failure, or account lockout. The rest of the codebase (e.g. `loginCommuter`) correctly uses `toApiError(error, 401)`.

**Fix:** Changed `throw new ApiError(401, { error: "Password is incorrect" })` to `throw toApiError(reauth, 401)`, so the real Supabase error message surfaces to the user.

---

### 2 — `signOut` after account deletion only clears current device
**File:** `frontend/src/api/goldenway.js:441`  
**Severity:** Critical

**Problem:** `signOut({ scope: 'local' })` only removes the session from localStorage on the current device. It makes no server call. Any other device holding a valid JWT for the deleted user could continue making authenticated API calls (RPC functions, RLS-guarded tables) for up to 1 hour until the JWT expires naturally.

**Fix:** Changed `scope: 'local'` to `scope: 'global'`. This hits the GoTrue `/logout` endpoint and invalidates the session server-side, revoking all devices immediately.

---

### 3 — `isDeleting` never reset on success, modal can lock permanently
**File:** `frontend/src/components/DeleteAccountModal.jsx:24`  
**Severity:** High

**Problem:** After `deleteAccount(password)` resolves, `navigate('/login')` is called but `isDeleting` is never reset. If React Router's navigation is deferred (Suspense boundary, transition), the modal stays mounted with `isDeleting = true`. Both the Cancel and Delete buttons are disabled; `handleClose` returns early. User is fully locked out with no recovery short of a page reload.

**Fix:** Added `setIsDeleting(false)` after the `navigate()` call as a fallback reset. On the normal path the component unmounts immediately and the call is a no-op.

---

### 4 — Enter key doesn't submit the Delete Account form
**File:** `frontend/src/components/DeleteAccountModal.jsx:22`  
**Severity:** Medium

**Problem:** Neither input (password or confirmation phrase) had an `onKeyDown` handler. Pressing Enter did nothing. Keyboard-only and screen-reader users were forced to use a pointer to click "Delete Account". This fails WCAG 2.1 SC 2.1.1 (keyboard accessibility).

**Fix:** Added `onKeyDown={(e) => e.key === "Enter" && handleDelete()}` to both inputs. `handleDelete` already guards against `!canDelete` so partial input presses are safe.

---

### 5 — Dismissed alert IDs not re-fetched after auth settles
**File:** `frontend/src/screens/commuter/home/HomeScreen.jsx:76`  
**Severity:** High

**Problem:** `fetchDismissedAlertIds()` ran once with an empty dep array `[]`. If the component mounted before auth fully initialized (possible during app load), the RLS-guarded query was rejected silently, leaving `dismissed = []`. When the session settled, previously-dismissed alerts flashed visible again until a manual refresh.

**Fix:** Added `user?.id` to the effect's dependency array and a `if (!user?.id) return` guard. The fetch now re-runs when auth resolves, and skips cleanly while unauthenticated.

---

### 6 — Optimistic rollback removes all occurrences of a dismissed ID
**File:** `frontend/src/screens/commuter/home/HomeScreen.jsx:94`  
**Severity:** High

**Problem:** The rollback on network failure used `d.filter(x => x !== id)`, which removes every copy of that ID from the array. A fast double-tap (or a concurrent state update) could push `[7, 7]` into `dismissed`. If the `dismissAlert` call then failed, the rollback wiped both entries, leaving `dismissed = []` — making the alert reappear even though it was already persisted as dismissed in the database.

**Fix:** Replaced the filter with a `lastIndexOf` splice that removes only the single optimistically-added entry, leaving any pre-existing copy intact.

---

### 7 — `curl` connection failure in keepalive produces cryptic bash error
**File:** `.github/workflows/supabase-keepalive.yml:30`  
**Severity:** Medium

**Problem:** If `curl` could not connect (DNS failure, network outage), it wrote an empty string to stdout. The subsequent `[ "$status" -ne 200 ]` then failed with `bash: integer expression expected` (exit 2), aborting the script before the intended `"Keep-alive ping failed"` message. GitHub Actions showed a cryptic arithmetic error with no indication Supabase was unreachable.

**Fix:** Added `|| true` to the curl assignment (preventing `set -e` from aborting on curl failure), then added an explicit `[ -z "$status" ]` check before the numeric comparison, with a clear `"curl failed to connect to Supabase"` message.

---

### 8 — `SECURITY DEFINER` function's `search_path` omits `auth` schema
**File:** `supabase/migrations/0021_fix_delete_my_account_search_path.sql`  
**Severity:** Low (PLAUSIBLE — not currently exploitable)

**Problem:** `delete_my_account()` was declared with `set search_path = public`, which does not include the `auth` schema. All current references inside the function are fully-qualified (`auth.uid()`, `auth.users`), so it works correctly today. However, any future edit adding an unqualified `auth.*` reference would silently resolve incorrectly.

**Fix:** A new migration (0021) recreates the function with `set search_path = public, auth`. The function body is unchanged. The existing migration (0020) is untouched to preserve the applied-migration history.

---

## Files changed

| File | Change |
|---|---|
| `frontend/src/api/goldenway.js` | Fixes 1 & 2 |
| `frontend/src/components/DeleteAccountModal.jsx` | Fixes 3 & 4 |
| `frontend/src/screens/commuter/home/HomeScreen.jsx` | Fixes 5 & 6 |
| `.github/workflows/supabase-keepalive.yml` | Fix 7 |
| `supabase/migrations/0021_fix_delete_my_account_search_path.sql` | Fix 8 (new migration) |

---

## Action required from you

- **Migration 0021** needs to be applied to the live Supabase project. Run `supabase db push` or apply it manually through the Supabase dashboard SQL editor.
- **GitHub secrets** `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be set in the repo (Settings → Secrets → Actions) for the keepalive workflow to run.
