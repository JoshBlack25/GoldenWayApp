# GoldenWay — The Bus For Us

Commuter mobile app for **Golden Arrow Bus Services**: load trips onto your
transit card, manage payment methods, and review your travel history.

> Student project (PRP3) — frontend prototype stage. Data and payments are
> mocked; auth uses a placeholder context ready to be swapped for a real
> backend.

## Stack

- [React 19](https://react.dev) + [Vite 8](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com) (design tokens in `src/index.css`)
- [React Router 7](https://reactrouter.com) — protected dashboard routes
- [Framer Motion](https://motion.dev) for screen transitions
- [Vitest](https://vitest.dev) for unit tests, [Oxlint](https://oxc.rs) for linting

## Getting started

```bash
npm install
npm run dev       # start dev server
```

## Scripts

| Command           | What it does                    |
| ----------------- | ------------------------------- |
| `npm run dev`     | Dev server with HMR             |
| `npm run build`   | Production build to `dist/`     |
| `npm run preview` | Serve the production build      |
| `npm run lint`    | Lint with Oxlint                |
| `npm test`        | Run unit tests once (Vitest)    |
| `npm run test:watch` | Run tests in watch mode      |

## Project structure

```
src/
├── App.jsx                  # Routes + auth provider
├── context/AuthContext.jsx  # Placeholder auth + ProtectedRoute
├── layout/DashboardLayout.jsx  # Shell: header, animated outlet, bottom nav
├── components/              # Shared UI (BottomNav, DashboardHeader)
└── screens/
    ├── LoginScreen / RegisterScreen / AccountCreatedScreen / NotFoundScreen
    └── Dashboard/
        ├── home/            # (coming next)
        ├── load-trips/      # Full purchase flow: route → payment → review → receipt
        │   ├── components/  # One component per step + drawer
        │   └── data/        # Mock routes/fares + pure pricing helpers (unit-tested)
        ├── card/            # (coming next)
        ├── history/         # (coming next)
        └── profile/         # User info + log out
```

## Where the money math lives

All fare calculations are pure functions in
`src/screens/Dashboard/load-trips/data/loadTripsData.js`
(`planFare`, `planSavings`, `SERVICE_FEE_RATE`) and covered by tests in
`loadTripsData.test.js`. When real fares arrive from a backend, swap the
data module — the step components shouldn't need to change.

## Team workflow

- `main` is protected-ish: merge feature branches via PR, don't push straight to it.
- Branch names: `<name>/<short-description>` (e.g. `raul/card-screen`).
- Keep line endings LF (`.gitattributes` + `.editorconfig` handle this).
