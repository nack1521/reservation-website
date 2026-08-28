# FIET Room Reservation Frontend

React and Vite frontend for KMUTT S13 room booking. One codebase provides user and admin modes while sharing the same backend-confirmed cookie session.

## Setup

```bash
npm install
cp .env.example .env
cp .env.user.example .env.user
cp .env.admin.example .env.admin
```

Default local configuration:

```env
VITE_API_URL=http://localhost:3000
```

User mode runs on port 5173 and admin mode on port 5715.

## Run

```bash
npm run dev:user
npm run dev:admin
```

Run them in separate terminals when testing both portals.

## Validate

```bash
npm run lint
npm run build
npm run build:user
npm run build:admin
npm audit --omit=dev
```

## Authentication

1. Login opens `GET /auth/google` with the current frontend origin.
2. The backend accepts only `@mail.kmutt.ac.th`, validates OAuth state, and sets an HTTP-only JWT cookie.
3. The app calls `/auth/me` on startup before rendering protected routes.
4. Admin routes require a backend-confirmed `admin` or `super_admin` role.
5. Logout calls `POST /auth/logout`, clears display cache, and returns to `/login`.

JWTs are not stored in localStorage. LocalStorage contains display-only cached name/email/roles and is not an authorization boundary. API requests include credentials.

## Main routes

```txt
/login
/
/book
/dashboard
/dashboard/reservation/:id
/profile
/user-guide
/admin-dashboard
/admin-rooms
/admin-teacher-requests
/admin-transactions/:page
```

## Booking behavior

- Dates and time blocks follow `Asia/Bangkok`.
- The booking page uses backend rooms only by default.
- Development mock rooms require `VITE_ENABLE_MOCK_ROOMS=true` explicitly.
- Reservation detail loads a guarded detail endpoint and shows check-in only during the valid window.
- The backend remains authoritative for notice, overlap, role, and status rules.

## Troubleshooting

- Login loop: verify backend is running, `VITE_API_URL`, `FRONTEND_URLS`, and browser cookie settings.
- Admin redirects to dashboard: the authenticated user lacks `admin`/`super_admin` in MongoDB.
- No rooms: seed/create real backend rooms; mock rooms are intentionally disabled by default.
- CORS error: add the exact frontend origin to backend `FRONTEND_URLS`.
- OAuth failure: confirm the backend callback URL in Google Cloud and rotate any previously committed secret.

## Manual QA checklist

The frontend currently has no automated browser-test framework. Before release:

1. Open user and admin modes while logged out; both should redirect to `/login`.
2. Sign in with a KMUTT student account; user pages should load and admin pages should reject it.
3. Sign in with an admin account on port 5715; admin pages should load.
4. Create a future reservation, verify dashboard/detail, check in during the 15-minute window, and cancel a separate pending reservation.
5. Log out from both the navbar and profile; `/auth/me` should return 401 afterward.
6. Verify an empty room search shows an empty state rather than generated rooms.
