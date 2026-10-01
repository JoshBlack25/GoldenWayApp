import { supabase } from "../lib/supabaseClient";
import { ApiError } from "./client";

/**
 * Auth-layer API — password reset, login routing and staff onboarding.
 *
 * Everything here degrades gracefully: if a migration hasn't been applied
 * yet (e.g. my_profile_type before 0005 lands), calls fail soft so the
 * pre-multi-role flows keep working. See FINAL-DEV-PLAN §5 D1.
 */

function fail(error, fallbackStatus = 400) {
  const message = error?.message || "Request failed";
  if (/invalid login credentials/i.test(message)) {
    return new ApiError(401, { error: "Incorrect email or password" });
  }
  if (/email not confirmed/i.test(message)) {
    return new ApiError(403, { error: "Please confirm your email first" });
  }
  return new ApiError(fallbackStatus, { error: message });
}

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw fail(error);
  return data;
}

// ---------------------------------------------------------------------
// Forgot / reset password (mock M1)
// ---------------------------------------------------------------------

/** Sends the real Supabase reset email; the link lands on /reset-password. */
export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw fail(error);
  return true;
}

/** Sets a new password for the recovery session. */
export async function updateMyPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw fail(error);
  return true;
}

// ---------------------------------------------------------------------
// Login routing (commuter vs staff vs unprofiled)
// ---------------------------------------------------------------------

/**
 * Who is the signed-in user? Returns the my_profile_type payload:
 *   { userType: 'STAFF'|'COMMUTER'|'UNPROFILED', role?, active?, ... }
 * or null when the RPC doesn't exist yet (migration 0005 pending).
 */
export async function fetchMyProfileType() {
  try {
    return await rpc("my_profile_type", {});
  } catch {
    return null; // graceful: pre-0005 database
  }
}

/**
 * One sign-in for everyone. Resolves { profileType, staff } so the UI can
 * route commuters to the app and staff to the console.
 */
export async function loginAny(email, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw fail(error, 401);

  const profile = await fetchMyProfileType();
  if (profile?.userType === "STAFF") {
    return {
      profileType: "STAFF",
      staff: {
        role: profile.role,
        active: profile.active,
        firstName: profile.firstName,
        surname: profile.surname,
        email: profile.email,
      },
    };
  }
  return { profileType: "COMMUTER", staff: null };
}

// ---------------------------------------------------------------------
// Staff onboarding (QuesAndSuggest point 2)
// ---------------------------------------------------------------------

/** Public "Staff sign-up" form → lands in the ADMIN approval queue. */
export async function requestStaffAccess({ email, firstName, surname, requestedRole, motivation }) {
  await rpc("request_staff_access", {
    p_email: email.trim(),
    p_first_name: firstName.trim(),
    p_surname: surname.trim(),
    p_requested_role: requestedRole,
    p_motivation: motivation?.trim() || null,
  });
  return true;
}

/** Where is my staff request? (status check on the staff sign-up page) */
export async function fetchMyStaffRequestStatus() {
  try {
    return await rpc("my_staff_request_status", {});
  } catch {
    return null;
  }
}
