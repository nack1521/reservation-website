# Frontend API Sheet (Role Workflow + Migration Behavior)

## Auth and Role Rules
- Role list includes `student`.
- Server assigns default role from email domain:
- `@mail.kmutt.ac.th` -> `student`
- Other domains -> `user`
- Frontend must not send `roles` in register payload.

## Register Request (Updated)
Endpoint:
- `POST /users/register`

Request body:
- `email: string`
- `password: string`
- `name: string`

Example:
```json
{
  "email": "john@mail.kmutt.ac.th",
  "password": "secret123",
  "name": "John"
}
```

Notes:
- `roles` is removed from register payload.
- Response user role is server-assigned (`student` or `user`).

## Teacher Request APIs

### Create teacher request
- Method: `POST`
- Path: `/users/me/request-teacher`
- Auth: Required (JWT)
- Body: none

Success example:
```json
{
  "message": "Teacher role request submitted",
  "user": {
    "_id": "USER_ID",
    "email": "user@example.com",
    "roles": ["user", "pending"]
  }
}
```

Behavior:
- Adds `pending` role.
- If already `teacher`/`admin`/`super_admin`, returns error.
- If already pending, returns existing user.

### List pending teacher requests (admin)
- Method: `GET`
- Path: `/users/teacher-requests`
- Auth: Required (JWT)
- Role: `admin` or `super_admin`
- Body: none

Success example:
```json
[
  {
    "_id": "USER_ID",
    "email": "user@example.com",
    "name": "User Name",
    "roles": ["user", "pending"],
    "picture": "https://...",
    "createdAt": "2026-04-06T10:00:00.000Z"
  }
]
```

### Approve teacher request
- Method: `PATCH`
- Path: `/users/:id/approve-teacher`
- Auth: Required (JWT)
- Role: `admin` or `super_admin`
- Body: none

Success example:
```json
{
  "message": "Teacher role approved",
  "user": {
    "_id": "USER_ID",
    "roles": ["user", "teacher"]
  }
}
```

### Reject teacher request
- Method: `PATCH`
- Path: `/users/:id/reject-teacher`
- Auth: Required (JWT)
- Role: `admin` or `super_admin`
- Body: none

Success example:
```json
{
  "message": "Teacher role request rejected",
  "user": {
    "_id": "USER_ID",
    "roles": ["user"]
  }
}
```

## Super Admin API

### Grant admin role
- Method: `PATCH`
- Path: `/users/:id/grant-admin`
- Auth: Required (JWT)
- Role: `super_admin`
- Body: none

Success example:
```json
{
  "message": "Admin role granted",
  "user": {
    "_id": "USER_ID",
    "roles": ["user", "admin"]
  }
}
```

## OAuth and Login Behavior
- Google login follows same default-role assignment rules.
- Legacy KMUTT users with only `user` role are normalized to `student` at login.

## Reservation Impact
No reservation API changes in this role update.

Existing behavior remains:
- Non-teacher users above 2 hours/day -> reservation becomes `pending` for admin approval.
- `teacher` / `admin` / `super_admin` bypass 2-hour cap.

## Common Error Cases To Handle
- `401 Unauthorized`: missing/invalid JWT.
- `403 Forbidden`: role not allowed for endpoint.
- `400 Bad Request`:
- requesting teacher when user already has elevated role
- invalid user id
- user not found during approve/reject/grant-admin

## Frontend Service Mapping
Implemented in [src/services/users.js](../src/services/users.js):
- `usersAPI.register`
- `usersAPI.requestTeacherRole`
- `usersAPI.teacherRequests`
- `usersAPI.approveTeacher`
- `usersAPI.rejectTeacher`
- `usersAPI.grantAdmin`

## Source References
- `user.controller.ts`
- `user.service.ts`
- `register.dto.ts`
- `auth.service.ts`
- `roles.enum.ts`
