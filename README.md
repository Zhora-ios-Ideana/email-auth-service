# Email Verification Auth Service

A production-ready Node.js/Express backend for email-based account verification.
Works seamlessly with **WordPress Elementor** registration forms and **iOS** apps.

---

## Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Runtime    | Node.js 18+                       |
| Framework  | Express 4                         |
| Database   | SQLite (via `better-sqlite3`)     |
| Passwords  | bcryptjs (cost factor 12)         |
| Auth       | JWT (Bearer token)                |
| Email      | Nodemailer + any SMTP provider    |
| Security   | helmet, CORS, rate-limiting       |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env
# → edit .env with your SMTP credentials and JWT secret

# 3. Create the database tables
npm run migrate

# 4. Start the server
npm start          # production
npm run dev        # development (auto-restart)
```

The server starts on `http://localhost:3000` (configurable via `PORT`).

---

## Project Structure

```
email-auth-service/
├── src/
│   ├── server.js                  # Entry point, Express app
│   ├── config/
│   │   └── database.js            # SQLite connection + WAL config
│   ├── models/
│   │   ├── migrate.js             # Schema / table creation
│   │   └── User.js                # All DB queries
│   ├── services/
│   │   ├── authService.js         # Business logic (register/verify/login)
│   │   └── emailService.js        # SMTP + HTML email templates
│   ├── routes/
│   │   └── auth.js                # Route handlers + rate limiters
│   └── middleware/
│       └── auth.js                # JWT requireAuth guard
├── docs/
│   ├── wordpress-elementor-integration.js
│   └── ios-swift-integration.swift
├── .env.example
└── package.json
```

---

## API Reference

Base URL: `https://your-domain.com`

All responses are JSON with a `success` (boolean) and `message` field.

---

### POST `/auth/register`

Register a new user. Sends a verification code via email.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success `201`**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email for the verification code.",
  "email": "user@example.com"
}
```

**Error responses**

| Status | Condition                        |
|--------|----------------------------------|
| 400    | Missing fields / invalid email / password too short |
| 409    | Email already registered & verified |
| 429    | Rate limit exceeded (10 req/hour/IP) |
| 500    | SMTP failure or server error     |

---

### POST `/auth/verify`

Submit the OTP to verify the account. Returns a JWT on success.

**Request body**
```json
{
  "email": "user@example.com",
  "code": "483920"
}
```

**Success `200`**
```json
{
  "success": true,
  "message": "Email verified successfully. Welcome!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "user": { "id": 1, "email": "user@example.com" }
}
```

**Error responses**

| Status | Condition                        |
|--------|----------------------------------|
| 400    | Wrong code or expired code       |
| 404    | Email not found                  |
| 409    | Already verified                 |

---

### POST `/auth/login`

Login with email and password.

**Request body**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Success `200`**
```json
{
  "success": true,
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "user": { "id": 1, "email": "user@example.com" }
}
```

**Error — unverified user `403`**
```json
{
  "success": false,
  "message": "Please verify your email before logging in.",
  "needsVerification": true,
  "email": "user@example.com"
}
```

Use `needsVerification: true` in your client to show the verification modal.

---

### POST `/auth/resend-code`

Request a new verification code (invalidates the previous one).

**Request body**
```json
{ "email": "user@example.com" }
```

**Success `200`**
```json
{
  "success": true,
  "message": "A new verification code has been sent to your email."
}
```

---

### GET `/auth/me` *(protected)*

Returns the currently authenticated user.

**Headers**
```
Authorization: Bearer <token>
```

**Success `200`**
```json
{
  "success": true,
  "user": { "id": 1, "email": "user@example.com" }
}
```

---

### GET `/health`

Service health check.

```json
{ "success": true, "message": "Service is running.", "timestamp": "..." }
```

---

## Integration Guides

### WordPress / Elementor

See `docs/wordpress-elementor-integration.js`.

1. Enqueue the script in `functions.php` (snippet included in the file).
2. Set `window.EmailAuth.apiBase` to your server URL.
3. The script intercepts Elementor form submissions, calls `/auth/register`, then
   shows a built-in OTP modal. On success it stores the JWT and redirects.

### iOS (Swift)

See `docs/ios-swift-integration.swift`.

1. Copy `AuthService.swift` into your Xcode project.
2. Set `baseURL` to your server URL.
3. Use the provided `RegisterViewModel` + `RegisterView` as a starting point.

---

## Security Notes

- Passwords are hashed with **bcrypt** at cost factor 12.
- JWTs are signed with `HS256`. Set a long random `JWT_SECRET` in `.env`.
- Rate limiting protects all auth endpoints (10 registrations/hour, 20 login attempts/15 min).
- Helmet adds hardened HTTP security headers.
- CORS is restricted to origins listed in `ALLOWED_ORIGINS`.
- Verification codes are single-use and expire after 15 minutes (configurable).
- Old unused codes are invalidated when a new one is issued.

---

## Deployment

Any Node.js host works: **Railway, Render, Fly.io, DigitalOcean App Platform, AWS EC2/ECS**, etc.

Minimal checklist:
- [ ] Set all env vars (especially `JWT_SECRET` and SMTP credentials)
- [ ] Run `npm run migrate` once on first deploy
- [ ] Serve behind HTTPS (required for iOS ATS and secure cookies)
- [ ] Point `ALLOWED_ORIGINS` to your WordPress site + any other clients
