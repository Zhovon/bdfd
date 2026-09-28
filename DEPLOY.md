# Deployment runbook — BengalCloud VPS + Coolify

Production stack for the Officers' Welfare Portal:

> **BengalCloud VPS 3** (4 vCPU / 4 GB / 50 GB NVMe, Ubuntu 24.04) + **Coolify** ·
> **Cloudflare** (domain + DNS) · **Cloudflare R2** (images + DB backups) ·
> **Zoho Mail** (mailboxes) · **Resend** (app email, over SMTP)

Follow the steps in order. Anything in `CAPS` is a value you supply.

---

## 0 · Have these ready before you start

- **Domain** added to Cloudflare (DNS managed there)
- **R2 bucket** + an API token (access key + secret) + its public URL
  (`https://pub-xxxx.r2.dev` or a custom `images.YOURDOMAIN`)
- **Resend** account, domain verified (SPF/DKIM added in Cloudflare DNS), API key `re_…`
- **Zoho Mail** set up for the domain (MX records in Cloudflare) — for human mailboxes
- Strong secrets:
  - `SESSION_SECRET` → run `openssl rand -hex 32`
  - `ADMIN_PASSWORD` → a long random password
  - Real **Turnstile** site + secret keys (not the test keys)

---

## 1 · Provision the VPS

Order **VPS 3**, image **Ubuntu 24.04 LTS**. Note the **public IP** and root login.

## 2 · Harden the server

```bash
ssh root@SERVER_IP
apt update && apt upgrade -y

# non-root sudo user
adduser deploy
usermod -aG sudo deploy

# add your SSH key for 'deploy' (from your laptop: ssh-copy-id deploy@SERVER_IP)
# then lock down SSH:
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw allow 8000      # Coolify UI (restrict to your IP later — step 11)
ufw --force enable

# brute-force protection
apt install -y fail2ban
```

> 4 GB is enough to build, but a swap file is cheap insurance:
> `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab`

## 3 · Install Coolify

Use BengalCloud's one-click **Coolify** app, or install manually (it sets up Docker):

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Open `http://SERVER_IP:8000`, create the **admin account**, finish the setup wizard.

## 4 · Point Cloudflare DNS at the box

In Cloudflare → DNS, add an **A record**:

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| A | `portal` (or `@`) | `SERVER_IP` | **DNS only (grey cloud)** — for now |

Grey cloud lets Coolify's Let's Encrypt HTTP challenge succeed. You'll turn the
proxy on **after** the cert is issued (step 11).

## 5 · Create the PostgreSQL database in Coolify

Coolify UI → **Project → New → Database → PostgreSQL 16**.
- Set a strong password, deploy it.
- Copy the **internal connection string** it shows, e.g.
  `postgres://USER:PASS@INTERNAL_HOST:5432/DB` — you'll use this as `DATABASE_URL`.
- The DB lives in a persistent volume on the VPS. No separate hosted DB, no
  serverless pooler needed (the app runs as a persistent Node process).

## 6 · Deploy the application

Coolify UI → **Project → New → Application → Private Repository**.
1. Connect **GitHub** (install the Coolify GitHub App), pick **`Zhovon/bdfd`**, branch **`main`**.
2. Build pack: **Nixpacks** (auto-detects Next.js). Port: **3000**.
3. If the build picks the wrong Node, set env `NIXPACKS_NODE_VERSION=20`.
4. Add the environment variables below, then **Deploy**.

### Environment variables (Coolify → the app → Environment)

```
DATABASE_URL=postgres://USER:PASS@INTERNAL_HOST:5432/DB   # from step 5
SESSION_SECRET=YOUR_64_HEX
ADMIN_EMAIL=YOU@YOURDOMAIN
ADMIN_PASSWORD=YOUR_STRONG_PASSWORD
APP_URL=https://portal.YOURDOMAIN

TURNSTILE_SITE_KEY=YOUR_REAL_SITE_KEY
TURNSTILE_SECRET_KEY=YOUR_REAL_SECRET_KEY

# App email via Resend (SMTP — no code change, mailer.ts already speaks SMTP)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_YOUR_RESEND_KEY
MAIL_FROM=Officers' Portal <no-reply@YOURDOMAIN>

# Image storage — REQUIRED in production (container disk is wiped each redeploy)
R2_ACCOUNT_ID=YOUR_ACCOUNT_ID
R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY
R2_SECRET_ACCESS_KEY=YOUR_SECRET
R2_BUCKET=YOUR_BUCKET
R2_PUBLIC_URL=https://images.YOURDOMAIN
```

`NODE_ENV=production` is set by Coolify automatically.

## 7 · Domain + HTTPS

In the app → **Domains**, set `https://portal.YOURDOMAIN`. Coolify auto-issues a
**Let's Encrypt** certificate (needs the grey-cloud A record from step 4 and ports
80/443 open).

## 8 · First run & smoke test

The schema builds itself on the first request (`ensureSchema()` runs the idempotent
`CREATE`/`ALTER` and seeds the admin, payment methods, and demo content).

- Open `https://portal.YOURDOMAIN` → **/login** → sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` → **/admin**
- Create a notice **with a cover photo** → confirm the image loads from your R2 URL
- Register a test member → approve → confirm the approval email arrives (Resend)

## 9 · Auto-deploy on push

In the app → enable **Auto Deploy**. Coolify adds a GitHub webhook when connected via
the GitHub App. From now on, `git push origin main` → automatic build + deploy.

## 10 · Backups — mandatory (BengalCloud does not back up for you)

Coolify → the **PostgreSQL** resource → **Backups → Scheduled backup**:
- Destination: **S3** → point at **R2** (it's S3-compatible):
  - Endpoint `https://ACCOUNT_ID.r2.cloudflarestorage.com`
  - Bucket, Access key, Secret (an R2 token that can write to a `backups` bucket)
- Schedule: nightly `0 2 * * *`, retention e.g. 14 days.

This gives you off-server, encrypted-at-rest DB snapshots holding officer PII.
Test a restore once so you know it works.

## 11 · Post-launch hardening

- **Cloudflare proxy on:** flip the A record to **orange cloud**, set SSL/TLS mode to
  **Full (strict)**. Add a basic WAF rule set. This hides the origin IP and adds CDN + DDoS.
- **Lock the Coolify port:** `ufw delete allow 8000` then
  `ufw allow from YOUR_HOME_IP to any port 8000` (or expose Coolify on its own
  subdomain with SSL and close 8000 entirely).
- **Uptime monitor:** add the domain to UptimeRobot / BetterStack (free) with an alert.
- **Email auth:** confirm SPF + DKIM (Resend) and DMARC records exist in Cloudflare DNS,
  and Zoho's MX records if you use mailboxes.
- **Rotate anything shared** during setup.

---

## App-specific notes

- **Images must use R2.** The container filesystem is ephemeral — it's wiped on every
  redeploy. With the `R2_*` vars set, uploads go to R2 and persist; unset, they fall back
  to container disk and would vanish on the next deploy.
- **Database.** `DATABASE_URL` points at the Coolify-managed Postgres container (persistent
  volume). Because the app is a long-running Node process (not serverless), the `pg` pool
  is fine as-is — no external pooler required.
- **Migrations.** `ensureSchema()` runs idempotent `CREATE TABLE / ALTER … IF NOT EXISTS`
  on boot; there's no separate migration step today. Before major schema changes in
  production, move to a real migration tool (the code notes this).
- **Payment gateway.** The manual report-and-verify flow works with zero fees. When the
  association's merchant account is approved, a gateway (ShurjoPay/SSLCommerz) drops into
  the existing `donations.provider` / `gateway_ref` seam — see the README.
