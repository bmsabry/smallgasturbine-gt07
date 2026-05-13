import { useEffect, useMemo, useRef, useState } from "react";
import * as auth from "./auth";
import * as P from "./progress";
import * as api from "./api.js";
import { COURSE_META, SECTIONS, SUMMATIVE, REFERENCE_ENGINE, findConcept } from "./content.js";
import Instructor from "./instructor.jsx";

const CONTACT_EMAIL = "info@proreadyengineer.com";
const MODULE_ID = "gt-07";

// ─────────────────────────────────────────────────────────────────────────
// Top-level state machine
//   "login"     — auth gate
//   "checking"  — fetching access status
//   "accept"    — handling ?token=xxx invitation URL
//   "awaiting"  — signed in but not enrolled
//   "needs"     — needs-analysis intake
//   "overview"  — module landing page
//   "section"   — drill into a section
//   "calculator", "quiz", "dashboard", "instructor" — auxiliary views
// ─────────────────────────────────────────────────────────────────────────

function getUrlToken() {
  try {
    const u = new URL(window.location.href);
    return u.searchParams.get("token");
  } catch { return null; }
}

function clearUrlToken() {
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete("token");
    const newPath = u.pathname + (u.searchParams.toString() ? "?" + u.searchParams.toString() : "");
    window.history.replaceState({}, "", newPath);
  } catch {}
}

export default function App() {
  const [user, setUser] = useState(auth.getCachedUser());
  const [view, setView] = useState("login");
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [progress, setProgressLocal] = useState(null);
  const [access, setAccess] = useState(null); // {enrolled, has_pending_invitation, is_admin}
  const [bootError, setBootError] = useState(null);
  // remember the invitation token across the auth flow
  const pendingToken = useRef(getUrlToken());

  // refresh /me on mount to validate the stored token
  useEffect(() => {
    let cancelled = false;
    if (auth.getToken()) {
      auth.fetchMe()
        .then((me) => { if (!cancelled) setUser(me); })
        .catch(() => { auth.clearAuth(); if (!cancelled) setUser(null); });
    }
    return () => { cancelled = true; };
  }, []);

  // When user changes, decide where to go
  useEffect(() => {
    if (!user) { setView("login"); return; }
    (async () => {
      setView("checking");
      // If there's a pending invitation token in the URL, try to accept it first.
      if (pendingToken.current) {
        try {
          await api.acceptInvitation(pendingToken.current);
        } catch (e) {
          setBootError(e.message || String(e));
          pendingToken.current = null;
          clearUrlToken();
          // Continue to access check regardless — they might still be enrolled.
        }
        if (!bootError) {
          pendingToken.current = null;
          clearUrlToken();
        }
      }
      let a;
      try { a = await api.getAccess(); } catch (e) { setBootError(e.message || String(e)); return; }
      setAccess(a);
      if (!a.enrolled) {
        setView("awaiting");
        return;
      }
      // Enrolled — load progress and route to needs or overview
      try {
        const p = await P.loadProgress(user.email);
        setProgressLocal(p);
        setView(p.needs ? "overview" : "needs");
      } catch (e) {
        if (e.status === 403) {
          setView("awaiting");
        } else {
          setBootError(e.message || String(e));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const refreshProgress = () => setProgressLocal(P.getCached(user.email));

  if (!user) {
    return <LoginGate onSignedIn={(u) => setUser(u)} pendingToken={pendingToken.current} />;
  }

  return (
    <>
      <TopBar
        user={user}
        access={access}
        onHome={() => view !== "instructor" && setView("overview")}
        onInstructor={() => setView("instructor")}
        onSignOut={async () => {
          if (user?.email) await P.flush(user.email);
          auth.signOut();
          setUser(null);
        }}
      />
      <main className="fade-in">
        {bootError && (
          <div className="shell"><div className="card" style={{ borderColor: "var(--bad)" }}>
            <h3 style={{ color: "var(--bad)" }}>Something went wrong</h3>
            <div className="small">{bootError}</div>
            <div className="btn-row"><button className="btn btn-ghost" onClick={() => { setBootError(null); window.location.reload(); }}>Reload</button></div>
          </div></div>
        )}
        {view === "checking" && !bootError && <LoadingShell />}
        {view === "awaiting" && (
          <AwaitingAccess
            user={user}
            access={access}
            onRequestAccess={async () => { try { await api.requestAccess(); const a = await api.getAccess(); setAccess(a); } catch (e) { alert(e.message); }}}
            onOpenInstructor={() => setView("instructor")}
          />
        )}
        {view === "needs" && (
          <NeedsAnalysis
            onSubmit={(needs) => { P.recordNeeds(user.email, needs); refreshProgress(); setView("overview"); }}
          />
        )}
        {view === "overview" && progress && (
          <Overview
            progress={progress}
            onOpenSection={(sid) => { setActiveSectionId(sid); P.startSection(user.email, sid); refreshProgress(); setView("section"); }}
            onOpenCalculator={() => setView("calculator")}
            onOpenQuiz={() => setView("quiz")}
            onOpenDashboard={() => setView("dashboard")}
            onRestart={() => {
              if (window.confirm("Restart the entire module? This wipes your needs analysis, section completions, summative quiz score, and review queue. Useful for live demos.\n\nThis cannot be undone.")) {
                P.resetProgress(user.email);
                refreshProgress();
                setView("needs");
              }
            }}
            needs={progress?.needs}
          />
        )}
        {view === "section" && activeSectionId && progress && (
          <SectionView
            section={SECTIONS.find((s) => s.id === activeSectionId)}
            email={user.email}
            onProbeAnswer={(probeId, correct) => { P.recordProbe(user.email, activeSectionId, probeId, correct); refreshProgress(); }}
            onComplete={(mastered) => { P.completeSection(user.email, activeSectionId, mastered); refreshProgress(); setView("overview"); }}
            onBack={() => setView("overview")}
          />
        )}
        {view === "calculator" && (
          <Calculator onBack={() => setView("overview")} />
        )}
        {view === "quiz" && progress && (
          <Quiz onSubmit={(score, total, byItem) => { P.recordSummative(user.email, score, total, byItem); refreshProgress(); }} onBack={() => setView("overview")} />
        )}
        {view === "dashboard" && progress && (
          <Dashboard email={user.email} progress={progress} onBack={() => setView("overview")} />
        )}
        {view === "instructor" && access?.is_admin && (
          <Instructor onBack={() => setView(progress ? "overview" : "awaiting")} />
        )}
      </main>
      <Footer />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function TopBar({ user, access, onHome, onInstructor, onSignOut }) {
  return (
    <header className="topbar">
      <h1 onClick={onHome} style={{ cursor: "pointer" }}>
        <span>{COURSE_META.code}</span> — Axial Turbine
        <span style={{ color: "var(--txtMuted)", fontWeight: 400, fontSize: 13, marginLeft: 10 }}>
          ProReadyEngineer · Small Jet Engine Design Training
        </span>
      </h1>
      <div className="user-chip">
        {access?.is_admin && (
          <button onClick={onInstructor} style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
            Instructor panel
          </button>
        )}
        <span className="mono">{user.email}</span>
        <button onClick={onSignOut}>Sign out</button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer shell">
      <div>© ProReadyEngineer LLC — Proprietary course content. Do not redistribute.</div>
      <div className="dim small">Questions? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div>
    </footer>
  );
}

function LoadingShell() {
  return (
    <div className="shell fade-in">
      <div className="card center">
        <div className="muted small">Loading your course…</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function LoginGate({ onSignedIn, pendingToken }) {
  // Default to signup when arriving via an invitation link — invited folks
  // typically don't have an account yet. They can still toggle to "Sign in"
  // via the link at the bottom if they're an existing user.
  const [mode, setMode] = useState(pendingToken ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const me = mode === "login"
        ? await auth.login(email, password)
        : await auth.signup(email, password, fullName);
      onSignedIn(me);
    } catch (ex) { setErr(ex.message || String(ex)); }
    finally { setBusy(false); }
  };

  return (
    <div className="login-shell">
      <form className="login-card fade-in" onSubmit={submit}>
        <div className="brand">
          <span>{COURSE_META.code}</span> — Axial Turbine
        </div>
        <div className="tag">
          {pendingToken
            ? "You've been invited! Sign in (or create an account with the invited email) to accept."
            : (mode === "login"
              ? "Sign in with your ProReadyEngineer account to start the module."
              : "Create a free ProReadyEngineer account to begin.")}
        </div>
        {mode === "signup" && (
          <div className="field">
            <label>Full name (optional)</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </div>
        )}
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="field">
          <label>Password{mode === "signup" && <span className="dim"> (min 8 chars)</span>}</label>
          <input type="password" required minLength={mode === "signup" ? 8 : undefined}
                 value={password} onChange={(e) => setPassword(e.target.value)}
                 autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>
        {err && <div className="err">{err}</div>}
        <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={busy}>
          {busy ? "..." : mode === "login" ? "Sign in" : "Create account"}
        </button>
        <div className="footer-note center">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); setErr(null); setMode(mode === "login" ? "signup" : "login"); }}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </a>
        </div>
        <div className="footer-note">
          Your ProReadyEngineer account works across <span className="mono">combustion-toolkit.proreadyengineer.com</span> and this learning module.
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function AwaitingAccess({ user, access, onRequestAccess, onOpenInstructor }) {
  return (
    <div className="shell fade-in">
      <div className="card">
        <h2>This module is by invitation only.</h2>
        <p>
          You're signed in as <span className="mono">{user.email}</span>, but this email isn't on the access list for{" "}
          <b>{COURSE_META.title}</b>.
        </p>
        {access?.has_pending_invitation && (
          <div className="probe-feedback correct">
            ✓ You have a pending invitation. Use the link in the invitation email — it activates access on click. If you've lost it, request a new one below.
          </div>
        )}
        {access?.has_pending_request ? (
          <div className="probe-feedback" style={{ background: "rgba(250,204,21,.08)", border: "1px solid rgba(250,204,21,.4)" }}>
            ⏳ Your access request has been recorded. The instructor will review it and reach out at <span className="mono">{user.email}</span>.
          </div>
        ) : (
          <p>
            If you believe you should have access (e.g. you've paid, or you're enrolled in a cohort), let the instructor know.
          </p>
        )}
        <div className="btn-row">
          {!access?.has_pending_request && (
            <button className="btn btn-primary" onClick={onRequestAccess}>Request access</button>
          )}
          <a className="btn btn-ghost" href={`mailto:${CONTACT_EMAIL}?subject=GT-07%20access%20request%20for%20${encodeURIComponent(user.email)}`}>
            Email {CONTACT_EMAIL}
          </a>
          {access?.is_admin && (
            <button className="btn btn-secondary" onClick={onOpenInstructor}>
              Open instructor panel →
            </button>
          )}
        </div>
      </div>
      <div className="card">
        <h3>What is this?</h3>
        <p className="muted small">{COURSE_META.title} is a {COURSE_META.durationMin}-minute interactive learning module from ProReadyEngineer's Small Jet Engine Design Training. It walks through impeller aerodynamics, velocity triangles, slip factor, compressor mapping, stall vs surge, and a worked KJ-66 example. Designed for engineers who want to go from "I've heard of centrifugal compressors" to "I can size and analyse one for a 700 N-class turbojet."</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function NeedsAnalysis({ onSubmit }) {
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [time, setTime] = useState("");
  const [modality, setModality] = useState("");
  const [obstacles, setObstacles] = useState("");
  const canSubmit = level && goal && time && modality;
  return (
    <div className="shell fade-in">
      <div className="card">
        <h2>Welcome — let's calibrate this module to you.</h2>
        <p className="muted">
          Five quick diagnostics. We use your answers to set the depth, pacing, and review schedule.
          You can change these later from the dashboard.
        </p>
      </div>

      <div className="card">
        <h4>Current knowledge level</h4>
        <p className="muted small">How much centrifugal-compressor aerodynamics have you already worked with?</p>
        <Choices value={level} onChange={setLevel} opts={[
          ["none", "None", "I've heard of compressors but never worked the equations."],
          ["basic", "Basic", "I've seen velocity triangles and Bernoulli; I struggle to apply them."],
          ["intermediate", "Intermediate", "I can apply Euler and slip-factor with prompting."],
          ["advanced", "Advanced", "I've sized impellers and read maps before."],
        ]} />
      </div>

      <div className="card">
        <h4>What outcome do you need?</h4>
        <p className="muted small">We'll bias examples and assessment toward this.</p>
        <Choices value={goal} onChange={setGoal} opts={[
          ["exam", "Pass an exam", "Heavy on definitions, formulas, and short-answer items."],
          ["apply", "Apply at work", "Heavy on design workflow and worked examples."],
          ["general", "General understanding", "Balanced — concepts plus light application."],
          ["teach", "Teach others", "We'll emphasise misconceptions and explanation quality."],
        ]} />
      </div>

      <div className="card">
        <h4>How much time can you commit?</h4>
        <Choices value={time} onChange={setTime} opts={[
          ["quick", "Quick overview", "~30 min — skim cards, do one quiz."],
          ["deep", "Deep study", "2–4 hr — full module with all probes."],
          ["ongoing", "Ongoing", "Spaced reviews over weeks."],
        ]} />
      </div>

      <div className="card">
        <h4>Preferred delivery</h4>
        <p className="muted small">We adapt the mix; you can override per section.</p>
        <Choices value={modality} onChange={setModality} opts={[
          ["reading", "Reading / writing", "Detailed text, outlines, rephrasing prompts."],
          ["visual", "Visual", "Diagrams, charts, structured layouts."],
          ["auditory", "Auditory", "Conversational explanations and verbal walkthroughs."],
          ["kinesthetic", "Hands-on", "Short content blocks followed immediately by exercises."],
        ]} />
      </div>

      <div className="card">
        <h4>Any obstacles?</h4>
        <p className="muted small">Optional — gaps in prerequisites, anxiety, time constraints. We don't share this.</p>
        <div className="field">
          <textarea value={obstacles} onChange={(e) => setObstacles(e.target.value)} placeholder="e.g. shaky on Bernoulli, only have 20 min/day, etc." />
        </div>
        <div className="btn-row">
          <button className="btn btn-primary" disabled={!canSubmit} onClick={() => onSubmit({ level, goal, time, modality, obstacles })}>
            Start the module →
          </button>
        </div>
      </div>
    </div>
  );
}

function Choices({ value, onChange, opts }) {
  return (
    <div className="probe-opts" style={{ marginTop: 4 }}>
      {opts.map(([id, label, desc]) => (
        <label key={id} className="probe-opt" style={{ cursor: "pointer", borderColor: value === id ? "var(--accent)" : undefined, background: value === id ? "rgba(0,212,255,.06)" : undefined }}>
          <input type="radio" checked={value === id} onChange={() => onChange(id)} />
          <div>
            <div style={{ fontWeight: 600 }}>{label}</div>
            <div className="muted small">{desc}</div>
          </div>
        </label>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function Overview({ progress, onOpenSection, onOpenCalculator, onOpenQuiz, onOpenDashboard, onRestart, needs }) {
  const completedSet = useMemo(() => new Set(Object.keys(progress?.sectionState || {}).filter(sid => progress.sectionState[sid].completedAt)), [progress]);

  const isAvailable = (idx) => {
    if (idx === 0) return true;
    const prev = SECTIONS[idx - 1];
    return completedSet.has(prev.id);
  };

  const completed = completedSet.size;
  let probeCorrect = 0, probeTotal = 0;
  for (const sid of Object.keys(progress?.sectionState || {})) {
    const ss = progress.sectionState[sid];
    for (const pid of Object.keys(ss.probeAttempts || {})) {
      const arr = ss.probeAttempts[pid];
      if (arr && arr.length) { probeTotal++; if (arr.includes(true)) probeCorrect++; }
    }
  }
  const accuracy = probeTotal ? Math.round((probeCorrect / probeTotal) * 100) : null;
  const pct = Math.round((completed / SECTIONS.length) * 100);

  return (
    <div className="shell fade-in">
      <div className="card">
        <h2>{COURSE_META.title}</h2>
        <div className="muted">{COURSE_META.subtitle} · {COURSE_META.durationMin} min · {SECTIONS.length} sections</div>
        <div className="progress-bar"><div style={{ width: `${pct}%` }} /></div>
        <div className="tiny muted">{completed} of {SECTIONS.length} sections complete · {pct}%</div>
        {needs && (
          <div className="muted small" style={{ marginTop: 10 }}>
            Tailored for: <b>{needs.level}</b> level · <b>{needs.goal}</b> goal · <b>{needs.time}</b> commitment · <b>{needs.modality}</b> delivery
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 6 }}>Learning outcomes</h3>
        <p className="muted small">By the end of this module you will be able to:</p>
        <ul>
          {COURSE_META.topLevelOutcomes.map((o, i) => (
            <li key={i}><b>{o.verb}</b> — {o.text}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 8 }}>Course sections</h3>
        <p className="muted small">Sections unlock progressively. Each section ends with a formative check; you must answer the probes before advancing.</p>
        <div className="section-list">
          {SECTIONS.map((s, idx) => {
            const done = completedSet.has(s.id);
            const avail = isAvailable(idx);
            return (
              <div
                key={s.id}
                className={`section-row ${done ? "done" : avail ? "current" : ""}`}
                onClick={() => avail && onOpenSection(s.id)}
                style={{ cursor: avail ? "pointer" : "not-allowed", opacity: avail ? 1 : 0.55 }}
              >
                <div className="num">{s.number}</div>
                <div>
                  <div className="title">{s.title}</div>
                  <div className="sub">{s.subtitle}</div>
                </div>
                <div className={`status ${done ? "done" : avail ? "available" : "locked"}`}>
                  {done ? "Done" : avail ? "Open" : "Locked"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3>Tools</h3>
        <p className="muted small">Reach for these any time during the module.</p>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={onOpenCalculator}>Worked-example calculator</button>
          <button className="btn btn-ghost" onClick={onOpenDashboard}>Progress dashboard</button>
          <button
            className="btn btn-primary"
            disabled={completed < SECTIONS.length}
            onClick={onOpenQuiz}
            title={completed < SECTIONS.length ? "Complete all sections to unlock the summative quiz" : ""}
          >
            {completed < SECTIONS.length ? `Summative quiz (locked — ${SECTIONS.length - completed} sections left)` : "Take the summative quiz"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={onRestart}
            style={{ borderColor: "var(--bad)", color: "var(--bad)", marginLeft: "auto" }}
            title="Wipe all progress and re-take the needs analysis. Useful for live demos."
          >
            Restart module
          </button>
        </div>
        {accuracy !== null && (
          <div className="muted small" style={{ marginTop: 10 }}>Formative-check accuracy so far: <b style={{ color: "var(--accent)" }}>{accuracy}%</b> over {probeTotal} probes attempted.</div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function SectionView({ section, email, onProbeAnswer, onComplete, onBack }) {
  const [probeState, setProbeState] = useState({});
  const probeStat = (pid) => probeState[pid] || { selected: null, answered: false };
  const allAnswered = section.probes.every((p) => probeStat(p.id).answered);
  const correctCount = section.probes.filter((p) => probeStat(p.id).correct).length;
  const mastered = correctCount === section.probes.length;

  const handleSelect = (probe, optIdx) => {
    const st = probeStat(probe.id);
    if (st.answered) return;
    const correct = optIdx === probe.correct;
    setProbeState({ ...probeState, [probe.id]: { selected: optIdx, answered: true, correct } });
    onProbeAnswer(probe.id, correct);
  };

  const handleRetry = (probe) => {
    setProbeState({ ...probeState, [probe.id]: { selected: null, answered: false } });
  };

  return (
    <div className="shell fade-in">
      <div className="card">
        <div className="section-banner">
          <div className="num">{section.number}</div>
          <div>
            <h2>{section.title}</h2>
            <div className="sub">{section.subtitle}</div>
          </div>
        </div>
        <div>
          <h4>Learning outcomes</h4>
          <p className="muted small">By the end of this section you will be able to:</p>
          <ul>
            {section.outcomes.map((o, i) => (
              <li key={i}><b>{o.verb}</b> — {o.text}</li>
            ))}
          </ul>
        </div>
      </div>

      {section.cards.map((c, idx) => (
        <div className="card" key={c.id}>
          <h4>Concept {idx + 1} of {section.cards.length}</h4>
          <h3>{c.heading}</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>{c.body}</p>
          {c.bullets && c.bullets.length > 0 && (
            <ul>{c.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
          )}
        </div>
      ))}

      <div className="card">
        <h3 style={{ marginBottom: 4 }}>Formative check</h3>
        <p className="muted small">Active recall before you advance. Mastery cycle: incorrect → reteach reading → retry. Section completes when every probe is correct.</p>
        {section.probes.map((p) => {
          const st = probeStat(p.id);
          return (
            <Probe
              key={p.id}
              probe={p}
              state={st}
              onSelect={(i) => handleSelect(p, i)}
              onRetry={() => handleRetry(p)}
            />
          );
        })}
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={onBack}>← Back to overview</button>
          {allAnswered && (
            mastered ? (
              <button className="btn btn-primary" onClick={() => onComplete(true)}>
                Section mastered → continue
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => onComplete(false)} title="You can move on, but the section is flagged for review.">
                Save progress (review later) →
              </button>
            )
          )}
          {allAnswered && !mastered && (
            <span className="muted small" style={{ alignSelf: "center" }}>
              Got {correctCount}/{section.probes.length}. Re-read the relevant concept above, then click "Retry" on any incorrect probe.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Probe({ probe, state, onSelect, onRetry }) {
  const tagLabel = probe.kind || "concept";
  return (
    <div className="probe fade-in">
      <span className={`probe-tag ${tagLabel}`}>{tagLabel}</span>
      <div className="probe-stem">{probe.stem}</div>
      <div className="probe-opts">
        {probe.options.map((opt, i) => {
          const isPicked = state.selected === i;
          const isCorrect = i === probe.correct;
          let cls = "probe-opt";
          if (state.answered) {
            if (isCorrect) cls += " correct";
            else if (isPicked) cls += " incorrect";
            else cls += " dim";
          }
          return (
            <label key={i} className={cls} style={{ cursor: state.answered ? "default" : "pointer" }}>
              <input type="radio" disabled={state.answered} checked={isPicked} onChange={() => onSelect(i)} />
              <div>{opt}</div>
            </label>
          );
        })}
      </div>
      {state.answered && (
        <div className={`probe-feedback ${state.correct ? "correct" : "incorrect"}`}>
          <div>{state.correct ? "✓ Correct." : "✗ Not quite."} <strong>Explanation:</strong> {probe.explain}</div>
          {!state.correct && (
            <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={onRetry}>Retry</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function Calculator({ onBack }) {
  // Turbine worked-example calculator. Mirrors the GT-07 KJ-66 worked example:
  // RPM × D → U → Cw1 from work demand → ψ → Lamé peak stress → SF.
  const [D_mm, setD] = useState(66);
  const [N_rpm, setN] = useState(115000);
  const [w_kJkg, setW] = useState(120);    // target work extraction
  const [Ca, setCa] = useState(150);       // axial velocity
  const [R_outer_mm, setRouter] = useState(35);
  const [R_bore_mm, setRbore] = useState(6);
  const [rho, setRho] = useState(8200);    // kg/m³ (Inconel 713)
  const [nu, setNu] = useState(0.3);       // Poisson's ratio
  const [UTS_MPa, setUTS] = useState(900); // Inconel 713 at 950 °C
  const [gap_mm, setGap] = useState(0.33);

  const D = D_mm / 1000;
  const omega = (2 * Math.PI * N_rpm) / 60;
  const U = (Math.PI * D * N_rpm) / 60;
  const w = w_kJkg * 1000;
  const Cw1 = w / Math.max(U, 1e-9);
  const psi = w / Math.max(U * U, 1e-9);
  const phi = Ca / Math.max(U, 1e-9);
  const alpha1_deg = (Math.atan2(Cw1, Math.max(Ca, 1e-9)) * 180) / Math.PI;

  // Lamé equations — peak stress at the BORE (r = 0)
  const Ro = R_outer_mm / 1000;
  const k_sigma = (3 + nu) / 8;            // common coefficient
  // σ_θ at r = 0 → coefficient on r² goes away
  const sigma_theta_bore_Pa = k_sigma * rho * omega * omega * Ro * Ro;
  const sigma_theta_MPa = sigma_theta_bore_Pa / 1e6;
  // σ_r at the bore: same form but with smaller coefficient (3+ν)/8 on full R²
  const sigma_r_bore_MPa = (k_sigma * rho * omega * omega * Ro * Ro) / 1e6; // identical at r=0 in this disc form

  const SF = UTS_MPa / Math.max(sigma_theta_MPa, 1e-9);

  // Tip-clearance target
  const gap_target_mm = 0.005 * D_mm;

  // Status flags
  const psi_status = psi < 0.7 ? "under-loaded (lower bound)" : psi <= 1.5 ? "moderate loading ✓" : "overloaded — separation risk";
  const psi_warn = psi < 0.7 || psi > 1.5;
  const SF_status = SF < 1.0 ? "FAIL — burst risk" : SF < 1.5 ? "below SF ≥ 1.5 target" : "meets SF ≥ 1.5 ✓";
  const SF_warn = SF < 1.5;
  const gap_status = gap_mm < 0.30 ? "too tight — thermal-jam risk on start" : gap_mm <= 0.50 ? "in 0.3–0.5 mm target band ✓" : gap_mm <= 1.0 ? "above 0.5 mm — efficiency penalty" : "above 1.0 mm — engine will not run";
  const gap_warn = gap_mm < 0.30 || gap_mm > 0.50;

  return (
    <div className="shell fade-in">
      <div className="card">
        <h2>Worked example — turbine calculator</h2>
        <p className="muted small">Mirrors the GT-07 KJ-66 worked example: RPM × wheel diameter → blade speed U → required whirl Cw1 from work demand → stage loading ψ → Lamé peak stress at the bore → safety factor against Inconel 713 at 950 °C. Defaults match the 700 N reference (66 mm wheel at 115 000 rpm).</p>
      </div>
      <div className="card">
        <div className="calc-grid">
          <div>
            <div className="field"><label>Wheel diameter D (mm)</label><input type="number" step="1" value={D_mm} onChange={(e)=>setD(+e.target.value||0)} /></div>
            <div className="field"><label>Shaft speed N (rpm)</label><input type="number" step="1000" value={N_rpm} onChange={(e)=>setN(+e.target.value||0)} /></div>
            <div className="field"><label>Target work extraction w (kJ/kg)</label><input type="number" step="5" value={w_kJkg} onChange={(e)=>setW(+e.target.value||0)} /></div>
            <div className="field"><label>Axial velocity Ca (m/s)</label><input type="number" step="5" value={Ca} onChange={(e)=>setCa(+e.target.value||0)} /></div>
            <div className="field"><label>Disc outer radius R_outer (mm)</label><input type="number" step="1" value={R_outer_mm} onChange={(e)=>setRouter(+e.target.value||0)} /></div>
            <div className="field"><label>Disc bore radius R_bore (mm)</label><input type="number" step="1" value={R_bore_mm} onChange={(e)=>setRbore(+e.target.value||0)} /></div>
            <div className="field"><label>Density ρ (kg/m³, Inconel 713 ≈ 8200)</label><input type="number" step="100" value={rho} onChange={(e)=>setRho(+e.target.value||0)} /></div>
            <div className="field"><label>Poisson's ratio ν</label><input type="number" step="0.05" value={nu} onChange={(e)=>setNu(+e.target.value||0)} /></div>
            <div className="field"><label>UTS at operating temp (MPa, Inconel 713 @ 950 °C ≈ 900)</label><input type="number" step="50" value={UTS_MPa} onChange={(e)=>setUTS(+e.target.value||0)} /></div>
            <div className="field"><label>Tip-clearance gap (mm, cold)</label><input type="number" step="0.05" value={gap_mm} onChange={(e)=>setGap(+e.target.value||0)} /></div>
          </div>
          <div className="calc-out">
            <Row lbl="Step 1 · Blade speed U" val={`${U.toFixed(1)} m/s`} />
            <Row lbl="" val={`(π · D · N / 60)`} small />
            <Row lbl="Step 2 · Required whirl Cw1" val={`${Cw1.toFixed(1)} m/s`} />
            <Row lbl="NGV exit angle α1 = atan(Cw1/Ca)" val={`${alpha1_deg.toFixed(1)}°`} />
            <Row lbl="Step 3 · Stage loading ψ" val={`${psi.toFixed(2)}`} cls={psi_warn ? "warn" : ""} />
            <Row lbl="" val={psi_status} small cls={psi_warn ? "warn" : ""} />
            <Row lbl="Flow coefficient φ" val={`${phi.toFixed(2)}`} />
            <Row lbl="Step 4 · Lamé σ_θ at bore" val={`${sigma_theta_MPa.toFixed(0)} MPa`} />
            <Row lbl="Safety factor SF = UTS / σ_θ" val={`${SF.toFixed(2)}`} cls={SF_warn ? "bad" : ""} />
            <Row lbl="" val={SF_status} small cls={SF_warn ? "bad" : ""} />
            <Row lbl="Target tip clearance (0.005 · D)" val={`${gap_target_mm.toFixed(2)} mm`} />
            <Row lbl="Gap status" val={gap_status} small cls={gap_warn ? "bad" : ""} />
          </div>
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={onBack}>← Back</button>
          <button className="btn btn-ghost" onClick={()=>{ setD(66); setN(115000); setW(120); setCa(150); setRouter(35); setRbore(6); setRho(8200); setNu(0.3); setUTS(900); setGap(0.33); }}>
            Load KJ-66 reference
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ lbl, val, cls = "", small = false }) {
  return (
    <div className="row">
      <div className={`lbl ${small ? "small" : ""}`}>{lbl}</div>
      <div className={`val ${cls}`} style={{ textAlign: "right", fontSize: small ? 11.5 : 13 }}>{val}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function Quiz({ onSubmit, onBack }) {
  const [picks, setPicks] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const allAnswered = SUMMATIVE.every((q) => picks[q.id] != null);
  const score = SUMMATIVE.filter((q) => picks[q.id] === q.correct).length;
  const byItem = Object.fromEntries(SUMMATIVE.map((q) => [q.id, picks[q.id] === q.correct]));

  const handleSubmit = () => {
    setSubmitted(true);
    onSubmit(score, SUMMATIVE.length, byItem);
  };

  return (
    <div className="shell fade-in">
      <div className="card">
        <h2>Summative quiz</h2>
        <p className="muted small">{SUMMATIVE.length} items mixing recall, application, analysis, and evaluation. Mostly novel material. Passing benchmark: ≥ 80% on application-and-higher items.</p>
      </div>
      {SUMMATIVE.map((q, idx) => {
        const picked = picks[q.id];
        const reveal = submitted;
        const correct = picked === q.correct;
        return (
          <div className="card" key={q.id}>
            <span className={`probe-tag ${q.kind}`}>{q.kind}</span>
            <div className="probe-stem"><b>Q{idx + 1}.</b> {q.stem}</div>
            <div className="probe-opts">
              {q.options.map((opt, i) => {
                let cls = "probe-opt";
                if (reveal) {
                  if (i === q.correct) cls += " correct";
                  else if (i === picked) cls += " incorrect";
                  else cls += " dim";
                }
                return (
                  <label key={i} className={cls} style={{ borderColor: !reveal && picked === i ? "var(--accent)" : undefined, background: !reveal && picked === i ? "rgba(0,212,255,.06)" : undefined }}>
                    <input type="radio" checked={picked === i} disabled={reveal} onChange={() => setPicks({ ...picks, [q.id]: i })} />
                    <div>{opt}</div>
                  </label>
                );
              })}
            </div>
            {reveal && (
              <div className={`probe-feedback ${correct ? "correct" : "incorrect"}`}>
                <div>{correct ? "✓" : "✗"} <strong>Explanation:</strong> {q.explain}</div>
              </div>
            )}
          </div>
        );
      })}
      <div className="card">
        {submitted ? (
          <>
            <h3>Result: <span style={{ color: "var(--accent)" }}>{score}/{SUMMATIVE.length}</span> ({Math.round((score / SUMMATIVE.length) * 100)}%)</h3>
            <p className="muted small">
              {score / SUMMATIVE.length >= 0.8
                ? "Above the 80% benchmark — you've demonstrated mastery."
                : "Below the 80% benchmark — review the explanations above, revisit any flagged sections, then re-take after a 24-hour gap (spaced retrieval beats cramming)."}
            </p>
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={onBack}>← Back to overview</button>
              <button className="btn btn-primary" onClick={() => { setSubmitted(false); setPicks({}); }}>Retake</button>
            </div>
          </>
        ) : (
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={onBack}>← Cancel</button>
            <button className="btn btn-primary" disabled={!allAnswered} onClick={handleSubmit}>
              {allAnswered ? "Submit quiz" : `Answer all ${SUMMATIVE.length} items to submit (${Object.keys(picks).length}/${SUMMATIVE.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
function Dashboard({ email, progress, onBack }) {
  const stats = P.overallStats(email, SECTIONS.length);
  const reviews = P.dueReviews(email);
  const dueNow = reviews.filter((r) => r.due);
  const upcoming = reviews.filter((r) => !r.due).slice(0, 12);

  return (
    <div className="shell shell-wide fade-in">
      <div className="card">
        <h2>Your progress</h2>
        <div className="kpi-grid">
          <div className="kpi"><div className="lbl">Sections done</div><div className="val">{stats.sectionsCompleted}<span className="unit">/ {stats.sectionsTotal}</span></div></div>
          <div className="kpi"><div className="lbl">Module complete</div><div className="val">{stats.pctComplete}<span className="unit">%</span></div></div>
          <div className="kpi"><div className="lbl">Probe accuracy</div><div className="val">{stats.probeAccuracy ?? "—"}<span className="unit">%</span></div></div>
          <div className="kpi"><div className="lbl">Summative score</div><div className="val">{stats.summative ? `${stats.summative.score}/${stats.summative.total}` : "—"}</div></div>
        </div>
      </div>

      <div className="card">
        <h3>Due for review now ({dueNow.length})</h3>
        <p className="muted small">Spaced-repetition schedule: 1 day → 3 days → 1 week → 2 weeks → doubling. Click a concept to revisit its section.</p>
        {dueNow.length === 0 ? (
          <div className="muted small">Nothing due. Come back tomorrow.</div>
        ) : dueNow.map((r) => {
          const c = findConcept(r.conceptId);
          return (
            <div className="review-row" key={r.conceptId}>
              <div><div><b>{c.label}</b></div><div className="muted tiny">Streak: {r.streak} · interval: {r.intervalDays}d</div></div>
              <div className="due now">DUE</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>Upcoming reviews</h3>
        {upcoming.length === 0 ? (
          <div className="muted small">No future reviews scheduled yet — complete more probes to populate this list.</div>
        ) : upcoming.map((r) => {
          const c = findConcept(r.conceptId);
          return (
            <div className="review-row" key={r.conceptId}>
              <div><div><b>{c.label}</b></div><div className="muted tiny">Streak: {r.streak} · interval: {r.intervalDays}d</div></div>
              <div className="due future">in {r.daysUntil}d</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>Reference engine — quick recall card</h3>
        <ul className="small">
          <li>Class: 700 N small turbojet — KJ-66 turbine reference</li>
          <li>Wheel D = {REFERENCE_ENGINE.D_wheel_mm} mm · N = {REFERENCE_ENGINE.N_rpm.toLocaleString()} rpm · vanes = {REFERENCE_ENGINE.vane_count}</li>
          <li>Target work w ≈ {(REFERENCE_ENGINE.work_target_Jkg / 1000)} kJ/kg · ψ ≈ {REFERENCE_ENGINE.psi_target} · 50% reaction</li>
          <li>TIT ≤ {REFERENCE_ENGINE.TIT_C} °C (Inconel 713 limit) · EGT max {REFERENCE_ENGINE.EGT_max_C} °C</li>
          <li>Inconel 713 ρ = {REFERENCE_ENGINE.rho_inconel} kg/m³ · UTS @ 950 °C ≈ {REFERENCE_ENGINE.inconel713_UTS_950C_MPa} MPa · ν = {REFERENCE_ENGINE.poisson}</li>
        </ul>
      </div>

      <div className="btn-row" style={{ padding: "0 22px 22px" }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back to overview</button>
      </div>
    </div>
  );
}
