// API-backed per-user learning state.
// Replaces the previous localStorage-only implementation. The state shape
// is identical so all UI code stays the same; this file is the only thing
// that has to know about persistence.
//
// Save strategy: debounced write-through. Updates are applied to an
// in-memory cache immediately (synchronous reads stay snappy) and then
// PUT to /learning/gt-05/progress on a short timer (300 ms).
//
// First-load migration: if the API returns an empty payload AND there's
// progress in legacy localStorage for this user, upload that once and
// clear localStorage so we don't double-source.

import * as api from "./api.js";

const VERSION = 1;
const SAVE_DEBOUNCE_MS = 300;

const DEFAULT_STATE = {
  version: VERSION,
  needs: null,
  sectionState: {},
  summative: null,
  reviews: {},
  notes: {},
};

const INTERVALS = [1, 3, 7, 14];

// In-memory cache keyed by user email. Holds the live state; flushed to API.
const _cache = new Map();
const _pendingTimers = new Map();
const _legacyKey = (email) => `gt07_progress::${(email || "anon").toLowerCase()}`;

function _clone(s) {
  return JSON.parse(JSON.stringify(s || DEFAULT_STATE));
}

function _scheduleSave(email) {
  const prev = _pendingTimers.get(email);
  if (prev) clearTimeout(prev);
  const t = setTimeout(async () => {
    _pendingTimers.delete(email);
    const state = _cache.get(email);
    if (!state) return;
    try {
      await api.saveProgress(state);
    } catch (err) {
      // Soft fail — keep state in memory; we'll retry on the next update.
      // eslint-disable-next-line no-console
      console.warn("[gt05 progress] save failed, will retry on next change:", err.message || err);
    }
  }, SAVE_DEBOUNCE_MS);
  _pendingTimers.set(email, t);
}

async function _maybeMigrateLegacyLocalStorage(email, currentPayload) {
  // Only migrate if API has nothing AND localStorage has something
  const hasApi = currentPayload && Object.keys(currentPayload).length > 0;
  if (hasApi) return null;
  let legacy;
  try {
    const raw = localStorage.getItem(_legacyKey(email));
    if (!raw) return null;
    legacy = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!legacy || typeof legacy !== "object") return null;
  // Upload + clear
  try {
    await api.saveProgress(legacy);
    try { localStorage.removeItem(_legacyKey(email)); } catch {}
    // eslint-disable-next-line no-console
    console.info("[gt05 progress] migrated legacy localStorage to API for", email);
    return legacy;
  } catch (e) {
    // Leave localStorage in place; we'll try again next load.
    // eslint-disable-next-line no-console
    console.warn("[gt05 progress] legacy migration failed, will retry next load:", e.message || e);
    return null;
  }
}

// ─── public API (matches the old localStorage module signature) ───────
export async function loadProgress(email) {
  let payload;
  try {
    payload = await api.fetchProgress();
  } catch (err) {
    // If access is denied (403), surface that to caller via thrown error
    if (err.status === 403) throw err;
    payload = {};
  }
  const migrated = await _maybeMigrateLegacyLocalStorage(email, payload);
  const state = { ...DEFAULT_STATE, ...(migrated || payload || {}) };
  _cache.set(email, state);
  return _clone(state);
}

export function getCached(email) {
  return _clone(_cache.get(email) || DEFAULT_STATE);
}

function _mutate(email, mutator) {
  const current = _cache.get(email) || _clone(DEFAULT_STATE);
  const next = _clone(current);
  mutator(next);
  _cache.set(email, next);
  _scheduleSave(email);
  return _clone(next);
}

export function recordNeeds(email, needs) {
  return _mutate(email, (s) => { s.needs = { ...needs, completedAt: Date.now() }; });
}

export function startSection(email, sectionId) {
  return _mutate(email, (s) => {
    if (!s.sectionState[sectionId]) {
      s.sectionState[sectionId] = { startedAt: Date.now(), probeAttempts: {}, mastered: false };
    }
  });
}

export function recordProbe(email, sectionId, probeId, correct) {
  return _mutate(email, (s) => {
    if (!s.sectionState[sectionId]) {
      s.sectionState[sectionId] = { startedAt: Date.now(), probeAttempts: {}, mastered: false };
    }
    const sec = s.sectionState[sectionId];
    if (!sec.probeAttempts[probeId]) sec.probeAttempts[probeId] = [];
    sec.probeAttempts[probeId].push(!!correct);
    if (correct) _scheduleReview(s, probeId, true);
  });
}

export function completeSection(email, sectionId, mastered = true) {
  return _mutate(email, (s) => {
    if (!s.sectionState[sectionId]) s.sectionState[sectionId] = { startedAt: Date.now(), probeAttempts: {} };
    s.sectionState[sectionId].completedAt = Date.now();
    s.sectionState[sectionId].mastered = !!mastered;
    _scheduleReview(s, `section::${sectionId}`, true);
  });
}

export function recordSummative(email, score, total, byItem) {
  return _mutate(email, (s) => {
    s.summative = { takenAt: Date.now(), score, total, byItem };
  });
}

export function setNote(email, sectionId, text) {
  return _mutate(email, (s) => { s.notes[sectionId] = text; });
}

// Wipe all module progress — needs analysis, sections, summative, reviews,
// notes. The debounced save flushes the cleared state to the backend.
// Useful for live demos: instructor resets so students can watch a fresh run.
export function resetProgress(email) {
  return _mutate(email, (s) => {
    s.needs = null;
    s.sectionState = {};
    s.summative = null;
    s.reviews = {};
    s.notes = {};
  });
}

function _scheduleReview(s, conceptId, success) {
  if (!s.reviews) s.reviews = {};
  const now = Date.now();
  const prev = s.reviews[conceptId];
  let streak = success ? (prev ? prev.streak + 1 : 1) : 0;
  let nextInterval;
  if (success) {
    nextInterval = streak <= INTERVALS.length
      ? INTERVALS[streak - 1]
      : INTERVALS[INTERVALS.length - 1] * Math.pow(2, streak - INTERVALS.length);
  } else {
    nextInterval = 1;
  }
  s.reviews[conceptId] = {
    lastReviewedAt: now,
    nextDueAt: now + nextInterval * 24 * 60 * 60 * 1000,
    intervalDays: nextInterval,
    streak,
  };
}

export function dueReviews(email) {
  const s = _cache.get(email) || DEFAULT_STATE;
  const now = Date.now();
  return Object.entries(s.reviews || {})
    .map(([conceptId, r]) => ({ conceptId, ...r }))
    .sort((a, b) => a.nextDueAt - b.nextDueAt)
    .map((r) => ({
      ...r,
      due: r.nextDueAt <= now,
      daysUntil: Math.max(0, Math.round((r.nextDueAt - now) / (24 * 60 * 60 * 1000))),
    }));
}

export function overallStats(email, sectionCount) {
  const p = _cache.get(email) || DEFAULT_STATE;
  let completed = 0, totalProbes = 0, correctProbes = 0;
  for (const sid of Object.keys(p.sectionState || {})) {
    const s = p.sectionState[sid];
    if (s.completedAt) completed++;
    for (const probeId of Object.keys(s.probeAttempts || {})) {
      const attempts = s.probeAttempts[probeId];
      totalProbes++;
      if (attempts && attempts.includes(true)) correctProbes++;
    }
  }
  return {
    sectionsCompleted: completed,
    sectionsTotal: sectionCount,
    pctComplete: sectionCount ? Math.round((completed / sectionCount) * 100) : 0,
    probeAccuracy: totalProbes ? Math.round((correctProbes / totalProbes) * 100) : 0,
    summative: p.summative,
    needsCompleted: !!p.needs,
  };
}

// Force-flush any pending writes (used on signout to avoid losing the last edit).
export async function flush(email) {
  const t = _pendingTimers.get(email);
  if (t) { clearTimeout(t); _pendingTimers.delete(email); }
  const state = _cache.get(email);
  if (!state) return;
  try { await api.saveProgress(state); } catch {}
}
