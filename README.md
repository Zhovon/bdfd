# Internal Officers' Welfare & Community Portal — prototype

A closed-membership welfare & community portal for departmental officers. The
public landing is open; the core is members-only (login-gated). Officers register,
an administrator verifies and approves them, and only then can they log in.

- **Stack:** Next.js 16 (App Router, TypeScript) · Tailwind v4 · Postgres (`pg`) · bcryptjs · nodemailer
- **Palette:** Bangladesh green / white / national red

## What's built

**Auth & membership**
- Public landing with Register / Log in
- Registration (Full name, Official email, Mobile, Govt PDS/Service ID, Designation, Present posting, Password)
- Admin approval workflow: pending → approve/reject → confirmation email → login enabled
- Sessions (signed cookie), bcrypt password hashing, roles (admin / moderator / member)
- Forgot / reset password (emailed token link, 1-hour expiry)
- Profile edit with photo upload and blood-donor opt-in

**Members' area (`/portal`, login-gated)**
- Dashboard: fund total, blood-donor count, notices, module grid, latest notices
- Travel & Tourism — tour notices + next-trip poll (one vote per member)
- Welfare — support appeals, each with its own open-amount donation button
- Blood Directory — volunteer donors, searchable by blood group
- Condolence & Support — remembrance notices
- Association Information — committee info + neutral election notices
- Rich notices — cover image, excerpt, and ordered content sections with per-section photo galleries; each board links to a full notice detail page

**Per-post payments (no Stripe / no card processing — gateway-ready)**
- Every notice can carry a payment intent: **participation** (a fixed tour fee) or **donation** (open amount)
- A tour notice shows a **Participate — ৳fee** button; a welfare appeal shows a **Donate** button (payer chooses the amount, with quick-pick chips)
- The payment page shows the mobile-banking / bank details, then the member **reports** what they paid (amount, method, transaction reference)
- Admin **verifies** each contribution; verified totals show per appeal and as the welfare fund (scoped to donations, so tour fees don't inflate it)
- Amounts and kind are **server-authoritative** — the tour fee is re-read from the post, never trusted from the client
- **Gateway-ready:** the `donations` table carries `provider` / `gateway_ref` columns; a real gateway (SSLCommerz / bKash PGW) fills them and lands the row verified, no rework

**Admin panel (`/admin`, role-gated, tabbed)**
- Membership — dashboard counts, pending approvals, roles, block/unblock, delete, CSV export
- Content — publish / delete notices per board; set each notice's payment mode + fee
- Polls — create polls (closes the previous), view live results
- Payments — verify / reject reported contributions (tour + welfare), running fund totals
- Accounts — edit the mobile-banking & bank-transfer details shown on every payment page

**Security**
- `robots.txt` disallows `/admin` and `/portal`; `noindex` on both
- All server actions and the CSV route re-check auth server-side
- Cloudflare Turnstile captcha on registration (verified server-side; dev uses Cloudflare's always-pass test keys)

## Run it locally

```bash
docker compose up -d   # 1. Postgres
npm install            # 2. deps (first time)
npm run dev            # 3. app
```

Open http://localhost:3000 — all tables, the bootstrap admin, seed notices, a seed
poll, and the four payment methods are created automatically on first run.

## Accounts & config (`.env`)

- **Database** — `DATABASE_URL`. Local dev uses the docker Postgres (no TLS). Hosted providers need TLS, which the app enables automatically for any non-local host. On Vercel + **Supabase**, use the **pooled** connection string (Supavisor, port **6543**, transaction mode) — serverless needs the pooler, not the direct 5432 connection.
- **Bootstrap admin** — `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults `admin@portal.gov.bd` / `admin-change-me`). Log in at **/login**, then visit **/admin**.
- **Emails** — if no `SMTP_*` vars are set, approval / reset emails are logged to the server console (fine for local dev). Set `SMTP_HOST` etc. to send for real.
- **Image storage** — set the five `R2_*` vars (Cloudflare R2) to store uploads in object storage; unset, uploads fall back to local disk (dev only). Vercel's filesystem is read-only, so R2 is **required** for uploads to work in production.
- `SESSION_SECRET` signs the login cookie; `APP_URL` builds reset links — set both in production.

## Where things live

| What | File |
| --- | --- |
| Identity, modules, nav, blood groups | `src/lib/site.ts` |
| Colours & tokens | `src/app/globals.css` |
| DB schema + user model | `src/lib/db.ts` |
| Content (posts, polls) | `src/lib/content.ts` |
| Payments & donations | `src/lib/payments.ts` |
| Sessions, guards, reset tokens | `src/lib/session.ts` · `src/lib/password.ts` |
| Email | `src/lib/mailer.ts` |
| Public landing / auth pages | `src/app/page.tsx` · `register/` · `login/` · `forgot/` · `reset/` |
| Members' area | `src/app/portal/` (+ `layout.tsx`, `actions.ts`) |
| Admin panel | `src/app/admin/` (`page.tsx`, `content/`, `polls/`, `donations/`, `payments/`, `export/`) |

## Before production

Feature work is complete; what's left is deployment hardening:

- **Migrations** — `ensureSchema()` auto-creates/seeds tables on first run as a prototype stand-in; swap for a real migration tool.
- **Secrets** — rotate `SESSION_SECRET`, change `ADMIN_PASSWORD`, and replace the Turnstile **test** keys with real ones from dash.cloudflare.com.
- **Email** — set the `SMTP_*` vars (unset = emails logged to console).
- **HTTPS/SSL** — handled at deploy.

## Inspect the database

```bash
docker exec annapurna_db psql -U annapurna -d annapurna -c "SELECT id, full_name, official_email, role, status FROM users ORDER BY id;"
docker exec annapurna_db psql -U annapurna -d annapurna -c "SELECT donor_name, amount, method, status FROM donations ORDER BY id DESC;"
```
