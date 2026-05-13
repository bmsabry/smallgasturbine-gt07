# GT-07 — Axial Turbine Learning Module

Login-gated interactive learning module for the GT-07 session of ProReadyEngineer's *Small Jet Engine Design Training*.

Live at: **smallgasturbine.gt-07.proreadyengineer.com**

## Stack

- Vite 8 + React 19 static SPA
- Authenticates against `combustion-toolkit-api.onrender.com`
- Per-user progress stored server-side; cross-device
- Hosted on Cloudflare Workers + Static Assets

## Course content

9 sections, ~4 hr session covering NGV + rotor architecture, velocity triangles, dimensionless blade-loading and reaction coefficients, the Lamé equations for disc stress, Campbell-diagram vibration checks, a 7-step design workflow, the KJ-66 worked example (blade speed → whirl velocity → stage loading → structural margin), practical engineering checks, and four common traps.

## Access model

Auto-granted to anyone who has access to GT-05 or GT-06 via the backend's
`_AUTO_GRANT_ON_ACCEPT` recursive cascade.

## Local dev

```
npm install
npm run dev
```
