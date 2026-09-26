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
- Welfare & Donation — support notices + **manual payment gateway** + donation reporting
- Blood Directory — volunteer donors, searchable by blood group
- Condolence & Support — remembrance notices
- Association Information — committee info + neutral election notices

**Manual payment gateway (no Stripe / no card processing)**
- Members see mobile-banking numbers (bKash / Nagad / Rocket) and bank-transfer details
- Members send money manually, then **report the donation** (amount, method, transaction reference)
- Admin **verifies** each reported donation; verified total shows on the welfare page and dashboard
- Admins edit all the account numbers / instructions from the admin Payments tab

**Admin panel (`/admin`, role-gated, tabbed)**
- Membership — dashboard counts, pending approvals, roles, block/unblock, delete, CSV export
- Content — publish / delete notices per board
- Polls — create polls (closes the previous), view live results
- Donations — verify / reject reported donations, running fund totals
- Payments — edit the mobile-banking & bank-transfer details shown to members

**Security**
- `robots.txt` disallows `/admin` and `/portal`; `noindex` on both
- All server actions and the CSV route re-check auth server-side

## Run it locally

```bash
docker compose up -d   # 1. Postgres
npm install            # 2. deps (first time)
npm run dev            # 3. app
```

Open http://localhost:3000 — all tables, the bootstrap admin, seed notices, a seed
poll, and the four payment methods are created automatically on first run.

## Accounts & config (`.env`)

- **Bootstrap admin** — `ADMIN_EMAIL` / `ADMIN_PASSWORD` (defaults `admin@portal.gov.bd` / `admin-change-me`). Log in at **/login**, then visit **/admin**.
- **Emails** — if no `SMTP_*` vars are set, approval / reset emails are logged to the server console (fine for local dev). Set `SMTP_HOST` etc. to send for real.
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

## Not yet built (later, per SRS)

- Photo galleries on the notice boards (uploads wired for avatars; extend to posts)
- HTTPS/SSL (handled at deploy) · real captcha (swap the math check for Turnstile/hCaptcha)

## Inspect the database

```bash
docker exec annapurna_db psql -U annapurna -d annapurna -c "SELECT id, full_name, official_email, role, status FROM users ORDER BY id;"
docker exec annapurna_db psql -U annapurna -d annapurna -c "SELECT donor_name, amount, method, status FROM donations ORDER BY id DESC;"
```
