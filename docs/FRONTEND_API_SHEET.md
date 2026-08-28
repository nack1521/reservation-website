# Frontend API Sheet

The frontend uses Google OAuth and an HTTP-only JWT cookie. Password registration and `/users/register` are intentionally unsupported.

All authenticated calls use `credentials: "include"`.

## Authentication

| Method | Route | Purpose |
|---|---|---|
| GET | `/auth/google?returnOrigin=...` | Begin KMUTT Google login |
| GET | `/auth/google/callback` | OAuth callback and cookie creation |
| GET | `/auth/me` | Confirm session and load safe user |
| GET | `/auth/profile` | Alias of current safe profile |
| POST | `/auth/logout` | Clear the JWT cookie |

## Users and teacher roles

| Method | Route | Access |
|---|---|---|
| GET | `/users/me` | Current user |
| PATCH | `/users/me` | Current user's phone number |
| POST | `/users/me/request-teacher` | Current user |
| GET | `/users/teacher-requests` | Admin |
| PATCH | `/users/:id/approve-teacher` | Admin |
| PATCH | `/users/:id/reject-teacher` | Admin |
| PATCH | `/users/:id/grant-admin` | Super admin |

## Rooms

| Method | Route | Access |
|---|---|---|
| GET | `/room/all` | Public list of active rooms |
| GET | `/room/:id` | Room detail |
| POST | `/room/create` | Admin |
| PATCH | `/room/:id` | Admin |
| DELETE | `/room/:id` | Admin soft delete |
| GET | `/room/addons` | Add-on list |
| POST | `/room/addons/seed` | Admin |

## Reservations

| Method | Route | Purpose |
|---|---|---|
| POST | `/reservations` | Create reservation |
| GET | `/reservations/me` | Current user's reservations |
| GET | `/reservations/me/dashboard` | Grouped dashboard and summary |
| GET | `/reservations/:id` | Owner/admin detail |
| PATCH | `/reservations/:id` | Owner edit or admin edit |
| PATCH | `/reservations/:id/cancel` | Cancel pending/upcoming |
| PATCH | `/reservations/:id/check-in` | Check in during valid window |
| GET | `/reservations/availability` | Room/day hourly availability |
| GET | `/reservations/pending` | Admin pending queue |
| GET | `/reservations/all` | Admin paginated list |
| PATCH | `/reservations/:id/approve` | Admin approval |
| PATCH | `/reservations/:id/reject` | Admin rejection |

Reservation statuses are `pending`, `upcoming`, `done`, `rejected`, and `canceled`. `approved` is represented by `status=upcoming` plus `approvalState=approved`; it is not a status value.
