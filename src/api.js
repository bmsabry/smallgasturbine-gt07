// Thin client for the /learning/* endpoints on combustion-toolkit-api.
// All calls are authenticated (Bearer token from auth.js).

import { getToken } from "./auth.js";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_BASE) ||
  "https://combustion-toolkit-api.onrender.com";

const MODULE_ID = "gt-07";

async function request(path, { method = "GET", body = null } = {}) {
  const headers = { "Content-Type": "application/json" };
  const t = getToken();
  if (t) headers["Authorization"] = `Bearer ${t}`;
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });
  } catch (err) {
    throw new Error("Network error: " + (err.message || String(err)));
  }
  if (res.status === 204) return null;
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const e = new Error((data && (data.detail || data.message)) || `${res.status} ${res.statusText}`);
    e.status = res.status;
    e.body = data;
    throw e;
  }
  return data;
}

// ─── student endpoints ────────────────────────────────────────────────
export async function getAccess() {
  return request(`/learning/${MODULE_ID}/access`);
}
export async function requestAccess() {
  return request(`/learning/${MODULE_ID}/request-access`, { method: "POST" });
}
export async function acceptInvitation(token) {
  return request(`/learning/invitations/accept`, { method: "POST", body: { token } });
}
export async function fetchProgress() {
  const r = await request(`/learning/${MODULE_ID}/progress`);
  return r ? r.payload : {};
}
export async function saveProgress(payload) {
  return request(`/learning/${MODULE_ID}/progress`, { method: "PUT", body: { payload } });
}

// ─── admin endpoints ──────────────────────────────────────────────────
export async function adminCreateInvitations(emails, notes, sendEmail = true) {
  return request(`/learning/${MODULE_ID}/invitations`, {
    method: "POST",
    body: { emails, notes: notes || null, send_email: sendEmail },
  });
}
export async function adminListInvitations() {
  return request(`/learning/${MODULE_ID}/invitations`);
}
export async function adminResendInvitation(id) {
  return request(`/learning/${MODULE_ID}/invitations/${id}/resend`, { method: "POST" });
}
export async function adminRevokeInvitation(id) {
  return request(`/learning/${MODULE_ID}/invitations/${id}`, { method: "DELETE" });
}
export async function adminListEnrollments() {
  return request(`/learning/${MODULE_ID}/enrollments`);
}
export async function adminGetStudentProgress(userId) {
  return request(`/learning/${MODULE_ID}/enrollments/${userId}/progress`);
}
export async function adminRevokeEnrollment(userId) {
  return request(`/learning/${MODULE_ID}/enrollments/${userId}`, { method: "DELETE" });
}
export async function adminRestoreEnrollment(userId) {
  return request(`/learning/${MODULE_ID}/enrollments/${userId}/restore`, { method: "POST" });
}
export async function adminListAccessRequests() {
  return request(`/learning/${MODULE_ID}/access-requests`);
}
export async function adminGrantAccessRequest(userId) {
  return request(`/learning/${MODULE_ID}/access-requests/${userId}/grant`, { method: "POST" });
}
export async function adminDenyAccessRequest(userId) {
  return request(`/learning/${MODULE_ID}/access-requests/${userId}/deny`, { method: "POST" });
}

// ─── cross-module admin (not module-scoped) ───────────────────────────
export async function adminBackfillCascade() {
  // Re-applies _AUTO_GRANT_ON_ACCEPT to every existing active enrollment.
  // Run after adding a new module so existing students get the new one.
  return request(`/learning/admin/backfill-cascade`, { method: "POST" });
}
