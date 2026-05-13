// Instructor panel — visible only to is_admin users.
// Three tabs: Invitations, Enrolled students, Access requests.
//
// All data comes from /learning/gt-05/* admin endpoints (gated server-side
// via get_admin_user). This component does no admin gating itself; the
// caller decides whether to render it.

import { useEffect, useMemo, useState } from "react";
import * as api from "./api.js";
import { COURSE_META, SECTIONS, SUMMATIVE, findConcept } from "./content.js";

const CONTACT_EMAIL = "info@proreadyengineer.com";

export default function Instructor({ onBack }) {
  const [tab, setTab] = useState("invitations");
  const [invitations, setInvitations] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [drillUserId, setDrillUserId] = useState(null);

  const reload = async () => {
    setLoading(true); setErr(null);
    try {
      const [inv, enr, req] = await Promise.all([
        api.adminListInvitations(),
        api.adminListEnrollments(),
        api.adminListAccessRequests(),
      ]);
      setInvitations(inv || []);
      setEnrollments(enr || []);
      setAccessRequests(req || []);
    } catch (e) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const pendingInvites = useMemo(() => invitations.filter(i => i.status === "pending"), [invitations]);
  const pendingRequests = useMemo(() => accessRequests.filter(r => !r.resolved_at), [accessRequests]);

  return (
    <div className="shell shell-wide fade-in">
      <div className="card">
        <h2>Instructor — {COURSE_META.code}</h2>
        <div className="muted small">{COURSE_META.title}</div>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button className={`btn ${tab === "invitations" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("invitations")}>
            Invitations ({pendingInvites.length})
          </button>
          <button className={`btn ${tab === "enrolled" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("enrolled")}>
            Enrolled ({enrollments.filter(e => !e.revoked_at).length})
          </button>
          <button className={`btn ${tab === "requests" ? "btn-primary" : "btn-ghost"}`} onClick={() => setTab("requests")}>
            Access requests {pendingRequests.length > 0 && <span style={{ background: "var(--bad)", color: "#fff", padding: "1px 6px", borderRadius: 8, marginLeft: 4 }}>{pendingRequests.length}</span>}
          </button>
          <button className="btn btn-ghost" onClick={reload} disabled={loading}>
            {loading ? "..." : "Refresh"}
          </button>
          <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={onBack}>← Back to module</button>
        </div>
      </div>

      {err && <div className="card"><div className="err" style={{ background: "rgba(255,107,107,.08)", border: "1px solid rgba(255,107,107,.4)", padding: "10px 12px", borderRadius: 6, color: "var(--bad)" }}>{err}</div></div>}

      {tab === "invitations" && (
        <InvitationsTab
          invitations={invitations}
          onChanged={reload}
        />
      )}
      {tab === "enrolled" && (
        drillUserId
          ? <StudentDrillDown userId={drillUserId} onClose={() => setDrillUserId(null)} onChanged={reload} />
          : <EnrolledTab enrollments={enrollments} onOpenStudent={setDrillUserId} onChanged={reload} />
      )}
      {tab === "requests" && (
        <AccessRequestsTab requests={accessRequests} onChanged={reload} />
      )}
    </div>
  );
}

// ─── Invitations ──────────────────────────────────────────────────────
function InvitationsTab({ invitations, onChanged }) {
  const [emails, setEmails] = useState("");
  const [notes, setNotes] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const parsed = useMemo(() => {
    // Accept commas, semicolons, whitespace, newlines as delimiters
    const tokens = emails.split(/[\s,;]+/).map(t => t.trim()).filter(Boolean);
    return Array.from(new Set(tokens.map(t => t.toLowerCase())));
  }, [emails]);

  const allValid = parsed.length > 0 && parsed.every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const submit = async () => {
    if (!allValid) return;
    setBusy(true); setResult(null);
    try {
      const created = await api.adminCreateInvitations(parsed, notes, sendEmail);
      setResult({ ok: true, created });
      setEmails(""); setNotes("");
      onChanged();
    } catch (e) {
      setResult({ ok: false, err: e.message || String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card">
        <h3>Invite students</h3>
        <p className="muted small">Paste one or many emails — separated by commas, semicolons, spaces, or newlines. Each gets a one-shot invitation link bound to their email address. If they already have a ProReadyEngineer account, signing in activates the enrollment.</p>
        <div className="field">
          <label>Student email(s)</label>
          <textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="alice@example.com, bob@example.com&#10;carol@example.com"
            rows={4}
          />
          <div className="tiny muted" style={{ marginTop: 4 }}>
            {parsed.length === 0
              ? "Type or paste at least one email."
              : allValid
                ? `Will invite ${parsed.length} email${parsed.length === 1 ? "" : "s"}.`
                : <span style={{ color: "var(--bad)" }}>One or more entries are not valid email addresses.</span>}
          </div>
        </div>
        <div className="field">
          <label>Notes (optional, for your records only — not shown to students)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Cohort Autumn 2026, paid via Stripe link" />
        </div>
        <div className="field">
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            <span style={{ color: "var(--txt)", fontFamily: "'Barlow', sans-serif", fontSize: 12.5, textTransform: "none", letterSpacing: 0 }}>Send invitation email automatically</span>
          </label>
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={submit} disabled={!allValid || busy}>
            {busy ? "Sending..." : `Send ${parsed.length || ""} invitation${parsed.length === 1 ? "" : "s"}`}
          </button>
        </div>
        {result && (
          <div className={`probe-feedback ${result.ok ? "correct" : "incorrect"}`} style={{ marginTop: 12 }}>
            {result.ok
              ? <>✓ {result.created.length} invitation{result.created.length === 1 ? "" : "s"} created and emailed.</>
              : <>✗ {result.err}</>}
          </div>
        )}
      </div>

      <div className="card">
        <h3>All invitations ({invitations.length})</h3>
        {invitations.length === 0
          ? <div className="muted small">No invitations sent yet.</div>
          : (
            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--txtMuted)", fontFamily: "monospace", fontSize: 11 }}>
                    <th style={cellPad}>EMAIL</th>
                    <th style={cellPad}>STATUS</th>
                    <th style={cellPad}>INVITED</th>
                    <th style={cellPad}>LAST SENT</th>
                    <th style={cellPad}>NOTES</th>
                    <th style={cellPad}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map(inv => (
                    <tr key={inv.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={cellPad}><span className="mono">{inv.email}</span></td>
                      <td style={cellPad}><StatusPill status={inv.status} /></td>
                      <td style={cellPad}>{fmtDate(inv.created_at)}</td>
                      <td style={cellPad}>{fmtDate(inv.last_sent_at) || "—"}</td>
                      <td style={cellPad} className="muted small" title={inv.notes || ""}>{(inv.notes || "").slice(0, 30)}{(inv.notes || "").length > 30 ? "…" : ""}</td>
                      <td style={cellPad}>
                        {inv.status === "pending" && (
                          <>
                            <button className="btn btn-ghost small-btn" onClick={async () => { try { await api.adminResendInvitation(inv.id); onChanged(); } catch (e) { alert(e.message); }}}>Resend</button>{" "}
                            <button className="btn btn-ghost small-btn" onClick={async () => { if (confirm(`Revoke invitation for ${inv.email}?`)) { try { await api.adminRevokeInvitation(inv.id); onChanged(); } catch (e) { alert(e.message); }}}}>Revoke</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </>
  );
}

// ─── Enrolled ─────────────────────────────────────────────────────────
function EnrolledTab({ enrollments, onOpenStudent, onChanged }) {
  if (enrollments.length === 0) {
    return (
      <div className="card">
        <div className="muted small">No students enrolled yet. Send some invitations from the Invitations tab.</div>
      </div>
    );
  }
  return (
    <div className="card">
      <h3>Enrolled students</h3>
      <p className="muted small">Click a row to see per-section progress, probe attempts, summative breakdown, and needs-analysis answers.</p>
      <div style={{ overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--txtMuted)", fontFamily: "monospace", fontSize: 11 }}>
              <th style={cellPad}>STUDENT</th>
              <th style={cellPad}>STATUS</th>
              <th style={cellPad}>SECTIONS</th>
              <th style={cellPad}>PROBE ACC</th>
              <th style={cellPad}>SUMMATIVE</th>
              <th style={cellPad}>LAST ACTIVE</th>
              <th style={cellPad}>JOINED</th>
              <th style={cellPad}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map(e => {
              const ps = e.progress_summary || {};
              return (
                <tr key={e.user_id} style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                    onClick={() => onOpenStudent(e.user_id)}>
                  <td style={cellPad}>
                    <div style={{ fontWeight: 600 }}>{e.user_full_name || <span className="mono">{e.user_email}</span>}</div>
                    {e.user_full_name && <div className="tiny mono muted">{e.user_email}</div>}
                  </td>
                  <td style={cellPad}>
                    {e.revoked_at ? <StatusPill status="revoked" /> : <StatusPill status="active" />}
                  </td>
                  <td style={cellPad}>
                    <b>{ps.sections_completed || 0}</b> / {SECTIONS.length}
                  </td>
                  <td style={cellPad}>
                    {ps.probe_accuracy != null ? <span><b>{ps.probe_accuracy}%</b> <span className="tiny muted">({ps.probes_attempted})</span></span> : <span className="muted">—</span>}
                  </td>
                  <td style={cellPad}>
                    {ps.summative_score || <span className="muted">—</span>}
                  </td>
                  <td style={cellPad} className="muted small">{fmtDate(e.last_active_at)}</td>
                  <td style={cellPad} className="muted small">{fmtDate(e.granted_at)}</td>
                  <td style={cellPad} onClick={(ev) => ev.stopPropagation()}>
                    {e.revoked_at
                      ? <button className="btn btn-ghost small-btn" onClick={async () => { try { await api.adminRestoreEnrollment(e.user_id); onChanged(); } catch (er) { alert(er.message); }}}>Restore</button>
                      : <button className="btn btn-ghost small-btn" onClick={async () => { if (confirm(`Revoke access for ${e.user_email}?`)) { try { await api.adminRevokeEnrollment(e.user_id); onChanged(); } catch (er) { alert(er.message); }}}}>Revoke</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentDrillDown({ userId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    api.adminGetStudentProgress(userId)
      .then(setData)
      .catch(e => setErr(e.message || String(e)));
  }, [userId]);

  if (err) return <div className="card"><div style={{ color: "var(--bad)" }}>{err}</div><button className="btn btn-ghost" onClick={onClose}>← Back</button></div>;
  if (!data) return <div className="card"><div className="muted">Loading...</div></div>;

  const p = data.payload || {};
  const needs = p.needs;
  const summative = p.summative;

  return (
    <>
      <div className="card">
        <div className="btn-row" style={{ marginBottom: 12 }}>
          <button className="btn btn-ghost" onClick={onClose}>← Back to roster</button>
        </div>
        <h3>{data.user.full_name || data.user.email}</h3>
        <div className="mono small muted">{data.user.email}</div>
        {data.enrollment && (
          <div className="muted small" style={{ marginTop: 8 }}>
            Joined {fmtDate(data.enrollment.granted_at)} · Last active {fmtDate(data.enrollment.last_active_at) || "never"}
            {data.enrollment.revoked_at && <> · <b style={{ color: "var(--bad)" }}>Revoked {fmtDate(data.enrollment.revoked_at)}</b></>}
          </div>
        )}
      </div>

      <div className="card">
        <h4>Needs analysis</h4>
        {needs ? (
          <ul className="small">
            <li>Level: <b>{needs.level}</b></li>
            <li>Goal: <b>{needs.goal}</b></li>
            <li>Time commitment: <b>{needs.time}</b></li>
            <li>Preferred modality: <b>{needs.modality}</b></li>
            {needs.obstacles && <li>Obstacles: <span className="muted">"{needs.obstacles}"</span></li>}
            <li className="tiny muted">Completed {fmtDate(new Date(needs.completedAt).toISOString())}</li>
          </ul>
        ) : <div className="muted small">Not yet completed.</div>}
      </div>

      <div className="card">
        <h4>Section-by-section</h4>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--txtMuted)", fontFamily: "monospace", fontSize: 11 }}>
              <th style={cellPad}>SECTION</th>
              <th style={cellPad}>STATUS</th>
              <th style={cellPad}>PROBES</th>
              <th style={cellPad}>ATTEMPTS</th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map(s => {
              const sst = (p.sectionState || {})[s.id] || {};
              const probes = Object.keys(sst.probeAttempts || {});
              let correct = 0, total = 0;
              probes.forEach(pid => {
                const arr = sst.probeAttempts[pid] || [];
                if (!arr.length) return;
                total++;
                if (arr.includes(true)) correct++;
              });
              const status = sst.completedAt ? "Done" : sst.startedAt ? "Started" : "—";
              return (
                <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={cellPad}><b>{s.number}. {s.title}</b></td>
                  <td style={cellPad}>{status}</td>
                  <td style={cellPad}>{total > 0 ? `${correct}/${total} correct` : "—"}</td>
                  <td style={cellPad} className="tiny mono muted">
                    {probes.map(pid => {
                      const arr = sst.probeAttempts[pid] || [];
                      const got = arr.includes(true);
                      return <span key={pid} style={{ marginRight: 4, color: got ? "var(--good)" : arr.length ? "var(--bad)" : "var(--txtDim)" }}>{got ? "✓" : arr.length ? `✗×${arr.length}` : "·"}</span>;
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h4>Summative quiz</h4>
        {summative ? (
          <>
            <div style={{ fontSize: 18 }}>
              Score: <b style={{ color: "var(--accent)" }}>{summative.score}/{summative.total}</b>
              {" "}({Math.round((summative.score / summative.total) * 100)}%)
              {" "}<span className="muted small">— taken {fmtDate(new Date(summative.takenAt).toISOString())}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--txtMuted)", fontFamily: "monospace", fontSize: 11 }}>
                  <th style={cellPad}>Q#</th>
                  <th style={cellPad}>STEM</th>
                  <th style={cellPad}>RESULT</th>
                </tr>
              </thead>
              <tbody>
                {SUMMATIVE.map((q, idx) => {
                  const got = (summative.byItem || {})[q.id];
                  return (
                    <tr key={q.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={cellPad}>Q{idx + 1}</td>
                      <td style={cellPad}>{q.stem.slice(0, 80)}{q.stem.length > 80 ? "…" : ""}</td>
                      <td style={cellPad}>{got ? <span style={{ color: "var(--good)" }}>✓</span> : <span style={{ color: "var(--bad)" }}>✗</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : <div className="muted small">Not yet attempted.</div>}
      </div>

      <div className="card">
        <h4>Spaced-repetition queue ({Object.keys(p.reviews || {}).length})</h4>
        {Object.keys(p.reviews || {}).length === 0
          ? <div className="muted small">Nothing scheduled yet.</div>
          : (
            <div style={{ maxHeight: 240, overflow: "auto" }}>
              {Object.entries(p.reviews).sort((a, b) => a[1].nextDueAt - b[1].nextDueAt).slice(0, 30).map(([cid, r]) => {
                const c = findConcept(cid);
                const due = r.nextDueAt <= Date.now();
                return (
                  <div key={cid} className="review-row">
                    <div>{c.label} <span className="tiny muted">(streak {r.streak}, interval {r.intervalDays}d)</span></div>
                    <div className={`due ${due ? "now" : "future"}`}>{due ? "DUE" : fmtDate(new Date(r.nextDueAt).toISOString())}</div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </>
  );
}

// ─── Access requests ──────────────────────────────────────────────────
function AccessRequestsTab({ requests, onChanged }) {
  const pending = requests.filter(r => !r.resolved_at);
  const resolved = requests.filter(r => r.resolved_at);
  return (
    <>
      <div className="card">
        <h3>Pending access requests ({pending.length})</h3>
        <p className="muted small">People who hit the GT-05 URL without an invitation and asked for access. Grant directly (no invite email round-trip), or deny.</p>
        {pending.length === 0
          ? <div className="muted small">Nothing pending.</div>
          : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--txtMuted)", fontFamily: "monospace", fontSize: 11 }}>
                  <th style={cellPad}>STUDENT</th>
                  <th style={cellPad}>REQUESTED</th>
                  <th style={cellPad}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {pending.map(r => (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={cellPad}>
                      <div style={{ fontWeight: 600 }}>{r.user_full_name || <span className="mono">{r.user_email}</span>}</div>
                      {r.user_full_name && <div className="tiny mono muted">{r.user_email}</div>}
                    </td>
                    <td style={cellPad} className="muted small">{fmtDate(r.requested_at)}</td>
                    <td style={cellPad}>
                      <button className="btn btn-primary small-btn" onClick={async () => { try { await api.adminGrantAccessRequest(r.user_id); onChanged(); } catch (e) { alert(e.message); }}}>Grant</button>{" "}
                      <button className="btn btn-ghost small-btn" onClick={async () => { if (confirm(`Deny request from ${r.user_email}?`)) { try { await api.adminDenyAccessRequest(r.user_id); onChanged(); } catch (e) { alert(e.message); }}}}>Deny</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
      {resolved.length > 0 && (
        <div className="card">
          <h4>Resolved</h4>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--txtMuted)", fontFamily: "monospace", fontSize: 11 }}>
                <th style={cellPad}>STUDENT</th>
                <th style={cellPad}>REQUESTED</th>
                <th style={cellPad}>RESOLVED</th>
                <th style={cellPad}>RESULT</th>
              </tr>
            </thead>
            <tbody>
              {resolved.slice(0, 50).map(r => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={cellPad}><span className="mono">{r.user_email}</span></td>
                  <td style={cellPad} className="muted small">{fmtDate(r.requested_at)}</td>
                  <td style={cellPad} className="muted small">{fmtDate(r.resolved_at)}</td>
                  <td style={cellPad}><StatusPill status={r.resolution} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ─── small UI helpers ─────────────────────────────────────────────────
const cellPad = { padding: "8px 10px", verticalAlign: "top" };

function StatusPill({ status }) {
  const map = {
    pending: { bg: "rgba(250,204,21,.15)", color: "var(--warn)" },
    accepted: { bg: "rgba(74,222,128,.15)", color: "var(--good)" },
    active: { bg: "rgba(74,222,128,.15)", color: "var(--good)" },
    revoked: { bg: "rgba(255,107,107,.12)", color: "var(--bad)" },
    granted: { bg: "rgba(74,222,128,.15)", color: "var(--good)" },
    denied: { bg: "rgba(255,107,107,.12)", color: "var(--bad)" },
  };
  const c = map[status] || { bg: "var(--bg4)", color: "var(--txtMuted)" };
  return (
    <span style={{ display: "inline-block", fontSize: 10, padding: "2px 8px", borderRadius: 4, background: c.bg, color: c.color, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700 }}>{status}</span>
  );
}

function fmtDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const day = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${day} ${time}`;
  } catch { return ""; }
}

export { CONTACT_EMAIL };
