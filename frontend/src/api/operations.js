import { supabase } from "../lib/supabaseClient";
import { ApiError } from "./client";

/**
 * Operations API — notifications (0007), driver runs (0006), inspector
 * (0006), support queue (0009), kiosk (0008). Every call hits a real
 * migration RPC/RLS table; nothing is canned. Errors keep the
 * "field: message" convention the screens parse.
 */

function toApiError(error, fallbackStatus = 400) {
  const message = error?.message || "Request failed";
  const code = error?.code;
  if (code === "42501" || /^FORBIDDEN/i.test(message)) {
    return new ApiError(403, { error: "You don't have permission for that action." });
  }
  if (code === "55000" || /already claimed|not PENDING|already resolved|owned by another/i.test(message)) {
    return new ApiError(409, { error: message });
  }
  return new ApiError(fallbackStatus, { error: message });
}

function rpc(fn, args) {
  return supabase.rpc(fn, args).then(({ data, error }) => {
    if (error) throw toApiError(error);
    return data;
  });
}

function from(table) {
  return {
    select: (...a) =>
      supabase.from(table).select(...a).then(({ data, error }) => {
        if (error) throw toApiError(error);
        return data;
      }),
  };
}

// =====================================================================
// Notifications (0007) — D3
// =====================================================================

export async function fetchNotifications(limit = 50) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw toApiError(error);
  return (data || []).map(mapNotification);
}

export async function fetchUnreadCount() {
  const { count, error } = await supabase
    .from("notifications", { count: "exact", head: true })
    .select("*", { count: "exact", head: true })
    .is("read_at", null);
  if (error) throw toApiError(error);
  return count || 0;
}

export async function markNotificationsRead(ids = null) {
  const count = await rpc("mark_notifications_read", { p_ids: ids });
  return count ?? 0;
}

function mapNotification(n) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    linkPath: n.link_path,
    readAt: n.read_at,
    createdAt: n.created_at,
  };
}

// =====================================================================
// Support — commuter side (0001/0002 tables + add_ticket_message)
// =====================================================================

export async function fetchMyTickets() {
  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw toApiError(error);
  return (data || []).map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    createdAt: t.created_at,
  }));
}

export async function createTicket(subject, firstMessage) {
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({ subject, status: "OPEN", priority: "NORMAL" })
    .select("id")
    .single();
  if (error) throw toApiError(error);
  if (firstMessage) {
    await rpc("add_ticket_message", {
      p_ticket_id: data.id,
      p_sender: "COMMUTER",
      p_body: firstMessage,
    });
  }
  return data.id;
}

export async function fetchTicketMessages(ticketId) {
  const { data, error } = await supabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("sent_at");
  if (error) throw toApiError(error);
  return (data || []).map((m) => ({
    id: m.id,
    from: m.sender === "COMMUTER" ? "user" : "agent",
    text: m.body,
    time: new Date(m.sent_at).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" }),
    sender: m.sender,
  }));
}

export async function sendCommuterMessage(ticketId, body) {
  return rpc("add_ticket_message", { p_ticket_id: ticketId, p_sender: "COMMUTER", p_body: body });
}

// =====================================================================
// Support — agent side (0009): queue, claim, reply, resolve, escalate
// =====================================================================

export async function fetchTicketQueue() {
  const queue = await rpc("ticket_queue", {});
  return (queue || []).map((t) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    commuter: t.commuter,
    lastMessage: t.last_message,
    messageCount: t.message_count,
    assignedTo: t.assigned_to,
    createdAt: t.created_at,
  }));
}

export const claimTicket = (id) => rpc("claim_ticket", { p_ticket_id: id });
export const replyTicket = (id, body) => rpc("reply_ticket", { p_ticket_id: id, p_body: body });
export const resolveTicket = (id) => rpc("resolve_ticket", { p_ticket_id: id });
export const escalateTicket = (id, note) => rpc("escalate_ticket", { p_ticket_id: id, p_note: note || null });

export async function fetchAgentsOnline() {
  const result = await rpc("agents_online", {});
  return result || { online: false, count: 0 };
}

// =====================================================================
// Driver (0006): runs + status
// =====================================================================

export async function fetchMyRuns() {
  const { data, error } = await supabase
    .from("vehicle_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(20);
  if (error) throw toApiError(error);
  return (data || []).map(mapRun);
}

function mapRun(r) {
  return {
    id: r.id,
    routeCode: r.route_code,
    busId: r.bus_id,
    direction: r.direction,
    serviceDay: r.service_day,
    status: r.status,
    delayMinutes: r.delay_minutes,
    note: r.note,
    startedAt: r.started_at,
    endedAt: r.ended_at,
  };
}

export async function fetchBuses() {
  const { data, error } = await supabase
    .from("buses")
    .select("fleet_no, depot")
    .eq("active", true)
    .order("fleet_no");
  if (error) throw toApiError(error);
  return data || [];
}

export const startRun = (routeCode, busId, direction, note = null) =>
  rpc("start_run", {
    p_route_code: routeCode,
    p_bus_id: busId,
    p_direction: direction || "OUTBOUND",
    p_note: note,
  });

export const reportRunStatus = (runId, status, delayMinutes = 0, note = null) =>
  rpc("report_run_status", {
    p_run_id: runId,
    p_status: status,
    p_delay_minutes: delayMinutes,
    p_note: note,
  });

// =====================================================================
// Inspector (0006): handheld verifier (BR-08)
// =====================================================================

export const lookupCardForInspection = (cardNumber) =>
  rpc("lookup_card_for_inspection", { p_card_number: cardNumber.trim().toUpperCase() });

export const logInspectionOutcome = (cardNumber, outcome, note = null) =>
  rpc("log_inspection_outcome", {
    p_card_number: cardNumber.trim().toUpperCase(),
    p_outcome: outcome,
    p_note: note,
  });

export async function fetchRecentInspections(limit = 15) {
  const { data, error } = await supabase
    .from("inspection_events")
    .select("id, card_number, outcome, note, at")
    .order("at", { ascending: false })
    .limit(limit);
  if (error) throw toApiError(error);
  return data || [];
}

// =====================================================================
// Clerk kiosk (0008)
// =====================================================================

export const recordCashSale = (cardNumber, productCode, routeCode) =>
  rpc("record_cash_sale", {
    p_card_number: cardNumber.trim().toUpperCase(),
    p_product_code: productCode,
    p_route_code: routeCode,
  });

export const clerkIssueCard = (idNumber, routeCode = null, productCode = null) =>
  rpc("clerk_issue_card", {
    p_id_number: idNumber.replace(/\s/g, ""),
    p_route_code: routeCode,
    p_product_code: productCode,
  });

export const clerkReplaceLostCard = (oldCardNumber) =>
  rpc("clerk_replace_lost_card", { p_old_card_number: oldCardNumber.trim().toUpperCase() });

export async function fetchMyKioskSalesToday() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("top_up_orders")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfDay.toISOString())
    .eq("status", "PAID");
  if (error) throw toApiError(error);
  return count || 0;
}

// =====================================================================
// Admin — team (0005)
// =====================================================================

export async function fetchStaffTeam() {
  const { data, error } = await supabase
    .from("staff")
    .select("id, first_name, surname, email, role, active")
    .order("role")
    .order("first_name");
  if (error) throw toApiError(error);
  return (data || []).map((s) => ({
    id: s.id,
    firstName: s.first_name,
    surname: s.surname,
    email: s.email,
    role: s.role,
    active: s.active,
  }));
}

export const setStaffActive = (staffId, active) =>
  rpc("set_staff_active", { p_staff_id: staffId, p_active: active });

// =====================================================================
// Live run status for the commuter Route screen (mock M4 killed here)
// =====================================================================

export async function fetchLiveRuns(routeCode) {
  const { data, error } = await supabase
    .from("vehicle_runs")
    .select("*")
    .eq("route_code", routeCode)
    .in("status", ["ON_TIME", "DELAYED", "BREAKDOWN", "DIVERTED"])
    .order("started_at", { ascending: false })
    .limit(5);
  if (error) throw toApiError(error);
  return (data || []).map(mapRun);
}

// =====================================================================
// Clerk — concessions queue (0002 BR-06) — Sprint 2 K3, Joshua Black
// =====================================================================

/**
 * Commuters with an unverified STUDENT/PENSIONER concession.
 * RLS lets CLERK read the commuters table; the 0007 trigger notifies the
 * commuter automatically when verify_concession stamps concession_verified_at.
 */
export async function fetchPendingConcessions() {
  const { data, error } = await supabase
    .from("commuters")
    .select("id, first_name, surname, email, concession_type, concession_verified_at, created_at")
    .in("concession_type", ["STUDENT", "PENSIONER"])
    .is("concession_verified_at", null)
    .order("created_at", { ascending: true });
  if (error) throw toApiError(error);
  return data || [];
}

/** Recently verified claims — the "done" column of the queue. */
export async function fetchRecentVerifiedConcessions(limit = 5) {
  const { data, error } = await supabase
    .from("commuters")
    .select("id, first_name, surname, concession_type, concession_verified_at")
    .in("concession_type", ["STUDENT", "PENSIONER"])
    .not("concession_verified_at", "is", null)
    .order("concession_verified_at", { ascending: false })
    .limit(limit);
  if (error) throw toApiError(error);
  return data || [];
}

/** BR-06 — stamp the claim verified; triggers the commuter notification. */
export const verifyConcession = (commuterId) => rpc("verify_concession", { p_commuter_id: commuterId });

// =====================================================================
// Clerk — dashboard (Sprint 2 K1)
// =====================================================================

/** Today's PAID cash takings, split out by product kind. */
export async function fetchKioskSalesSummary() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("top_up_orders")
    .select("product_code, amount_cents")
    .gte("created_at", startOfDay.toISOString())
    .eq("status", "PAID");
  if (error) throw toApiError(error);

  const rows = data || [];
  const feeRows = rows.filter((r) => r.product_code === "GOLD-CARD-FEE");
  return {
    orders: rows.length - feeRows.length,
    fees: feeRows.length,
    cents: rows.reduce((sum, r) => sum + (r.amount_cents || 0), 0),
  };
}

/** The clerk's own cash sales today (staff_action_log is action-scoped). */
export async function fetchMySalesToday() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("staff_action_log")
    .select("details")
    .eq("action", "CASH_SALE")
    .gte("created_at", startOfDay.toISOString());
  if (error) return { count: 0, receipts: [] }; // log is optional telemetry
  const receipts = (data || []).map((r) => ({
    card: r.details?.card || "—",
    product: r.details?.product || "—",
    cents: r.details?.cents || 0,
  }));
  return { count: receipts.length, receipts };
}
