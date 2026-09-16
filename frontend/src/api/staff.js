import { supabase } from "../lib/supabaseClient";
import { ApiError } from "./client";

/**
 * Staff console API — D2 (ADMIN onboarding queue) — FINAL-DEV-PLAN §5.
 * Talks to the 0005 migration RPCs:
 *   · staff_access_requests rows are read directly (RLS: ADMIN sees all,
 *     a pending requester sees only their own row — 0010 hotfix).
 *   · decide_staff_access(request_id, approve, note) — ADMIN-only.
 *   · create_staff_member(email, first_name, surname, role) — the ADMIN
 *     direct-invite door (pre-approved request; the person signs up with
 *     that email and the 0005 trigger attaches their role).
 */

function toApiError(error, fallbackStatus = 400) {
  const message = error?.message || "Request failed";
  const code = error?.code;
  if (code === "42501" || /forbidden/i.test(message)) {
    return new ApiError(403, { error: "Admin only" });
  }
  if (/not PENDING|nothing to decide/i.test(message)) {
    return new ApiError(409, { error: "This request was already decided — refresh the queue." });
  }
  if (/already exists|duplicate/i.test(message)) {
    return new ApiError(409, { error: message });
  }
  return new ApiError(fallbackStatus, { error: message });
}

function mapRequest(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    surname: row.surname,
    requestedRole: row.requested_role,
    motivation: row.motivation,
    status: row.status,
    decisionNote: row.decision_note,
    requestedAt: row.requested_at,
    decidedAt: row.decided_at,
    onboardedAt: row.onboarded_at,
  };
}

/** The onboarding queue. status: "PENDING" (default), "APPROVED", "DENIED" or "ALL". */
export async function fetchStaffRequests(status = "PENDING") {
  let query = supabase
    .from("staff_access_requests")
    .select("*")
    .order("requested_at", { ascending: true });
  if (status !== "ALL") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw toApiError(error);
  return (data || []).map(mapRequest);
}

/** Approve or deny a PENDING request (ADMIN-only RPC). */
export async function decideStaffAccess(requestId, approve, note) {
  const row = await supabase
    .rpc("decide_staff_access", {
      p_request_id: requestId,
      p_approve: approve,
      p_note: note?.trim() || null,
    })
    .then(({ data, error }) => {
      if (error) throw toApiError(error);
      return data;
    });
  return mapRequest(Array.isArray(row) ? row[0] : row);
}

/** Direct invite: pre-approve someone who never self-requested (ADMIN-only). */
export async function inviteStaffMember({ email, firstName, surname, role }) {
  const row = await supabase
    .rpc("create_staff_member", {
      p_email: email.trim(),
      p_first_name: firstName.trim(),
      p_surname: surname.trim(),
      p_role: role,
    })
    .then(({ data, error }) => {
      if (error) throw toApiError(error);
      return data;
    });
  return mapRequest(Array.isArray(row) ? row[0] : row);
}
