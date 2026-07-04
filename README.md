# Trackable Links

A self-hosted QR code link tracker on Cloudflare Workers + D1: print QR codes that redirect to
a destination URL, log every scan (time, location, user agent, IP), and see the results in a
small admin dashboard.

Originally built in-house for a university festival to track foot traffic from posters/flyers to
installed QR codes around a venue, and extracted here as a standalone, generic project.

## How it works

- A **project** groups QR codes that all redirect to the same destination URL (e.g. one flyer
  campaign, one poster design).
- Each **QR code** belongs to a project and has its own **location** label (e.g. "Main entrance",
  "2F hallway"). Printed QR codes start with no location — the first scan shows a small
  passcode-gated form so whoever installs the code can label where it ended up.
- Every scan after that is logged (timestamp, user agent, IP) and redirects (HTTP 301) to the
  project's destination URL.
- The admin dashboard shows scan counts per project, a QR code manager (create/print/delete), and
  an analytics view (scans by hour and by location).

```
 Visitor scans QR ──▶ GET /?id={qrId} (packages/api) ──▶ log scan ──▶ 301 redirect
                                │
                                ▼
                      D1 database (Projects, QRCodes, AccessLogs)
                                ▲
                                │
        Admin dashboard (packages/web) ──▶ /projects/*, /auth/* (Bearer JWT)
```

## Packages

- [`packages/api`](packages/api) — a [Hono](https://hono.dev) Worker: the public redirect
  endpoint, the location-setup flow, and the authenticated project/QR-code management API. Data
  lives in a Cloudflare D1 (SQLite) database via [Drizzle ORM](https://orm.drizzle.team).
- [`packages/web`](packages/web) — a React + Vite + Tailwind admin dashboard that talks to the API
  over `fetch`. Deployable as static assets (Cloudflare Workers Assets, Pages, or any static host).

## Quick start

Requires Node 20+, [pnpm](https://pnpm.io), and a Cloudflare account.

```sh
pnpm install
```

### 1. Create the D1 database

```sh
pnpm --filter @trackable-links/api exec wrangler d1 create trackable-links-db
```

Copy the printed `database_id` into `packages/api/wrangler.jsonc`, and set `account_id` at the
top of that file to your own Cloudflare account id (`wrangler whoami`).

Apply the schema:

```sh
pnpm --filter @trackable-links/api run db:apply:local   # for local `wrangler dev`
pnpm --filter @trackable-links/api run db:apply:remote  # once you're ready to deploy
```

### 2. Configure secrets

```sh
cp packages/api/.dev.vars.example packages/api/.dev.vars
```

Edit `packages/api/.dev.vars` and set:

| Variable                   | Purpose                                                                 |
| --------------------------- | ------------------------------------------------------------------------ |
| `JWT_SECRET`                | Signs/verifies admin session tokens. Generate with `openssl rand -base64 48`. |
| `ADMIN_PASSWORD`            | The password used to log in to the admin dashboard.                    |
| `LOCATION_SETUP_PASSCODE`   | Shared passcode required to label a QR code's location after printing. |

In production, set the same three values as Worker secrets instead of committing them:

```sh
pnpm --filter @trackable-links/api exec wrangler secret put JWT_SECRET
pnpm --filter @trackable-links/api exec wrangler secret put ADMIN_PASSWORD
pnpm --filter @trackable-links/api exec wrangler secret put LOCATION_SETUP_PASSCODE
```

### 3. Run locally

```sh
pnpm dev
```

This runs the API on `http://localhost:8789` and the dashboard on `http://localhost:5173`. Copy
`packages/web/.env.example` to `packages/web/.env.local` if you need to point the dashboard at a
different API URL. Log in with the `ADMIN_PASSWORD` you set above.

### 4. Deploy

```sh
pnpm deploy:api   # deploys packages/api with `wrangler deploy`
pnpm deploy:web   # builds and deploys packages/web as static assets
```

Both `wrangler.jsonc` files have a commented-out `routes` block if you want to put them on a
custom domain instead of the default `workers.dev` subdomain. Set `VITE_API_URL` (via `.env`
or your CI) to the deployed API URL before building `packages/web`.

## Authentication

There's no external identity provider by design — the admin dashboard uses a single shared
`ADMIN_PASSWORD`. `POST /auth/login` exchanges it for a short-lived (24h) HS256 JWT that carries
the full permission bitmask; the dashboard sends it back as `Authorization: Bearer <token>` on
every request.

If you need real per-user accounts or SSO, that logic lives entirely in
[`packages/api/src/auth.ts`](packages/api/src/auth.ts) and
[`packages/api/src/routes/auth.ts`](packages/api/src/routes/auth.ts) — replace
`verifyLocalSession`/`POST /auth/login` with a call to your own identity provider (Auth0, Clerk,
your org's SSO, ...); every other route only cares that it ends up with a Bearer token that
resolves to `{ sub, permissions }`.

### Permissions

Four independent bits, combined into one bitmask (see
[`packages/api/src/permissions.ts`](packages/api/src/permissions.ts)):

| Bit  | Value | Grants |
| ---- | ----- | ------ |
| `TRACKABLE_LINKS_VIEW`      | 1 | List projects and QR codes |
| `TRACKABLE_LINKS_EDIT`      | 2 | Create projects/QR codes, delete QR codes you created |
| `TRACKABLE_LINKS_ANALYTICS` | 4 | View the analytics dashboard |
| `TRACKABLE_LINKS_DELETE`    | 8 | Delete any project or QR code |

The built-in single-admin login always grants all four. If you add multi-user auth, issue a
`permissions` integer per user from whatever subset of these bits they should hold.

## API reference

All `/projects/*` routes require `Authorization: Bearer <token>`.

| Method | Path                              | Auth                | Description |
| ------ | ---------------------------------- | -------------------- | ----------- |
| GET    | `/?id={qrId}`                      | none                 | Scan a QR code: log the visit and redirect, or show the location-setup form |
| GET    | `/view/:qrId`                      | none                 | Human-readable info page for a QR code |
| POST   | `/api/set-location`                | passcode             | Label a QR code's location for the first time |
| POST   | `/api/edit-location/:qrId`         | passcode             | Re-label a QR code's location |
| POST   | `/auth/login`                      | none                 | Exchange `ADMIN_PASSWORD` for a session token |
| GET    | `/auth/me`                         | Bearer               | Resolve the current session |
| GET    | `/projects`                        | Bearer               | Paginated project list with scan counts |
| POST   | `/projects`                        | Bearer               | Create a project |
| GET    | `/projects/:id`                    | Bearer               | Project detail |
| PUT    | `/projects/:id`                    | Bearer               | Update a project |
| DELETE | `/projects/:id`                    | Bearer + `DELETE`    | Delete a project (QR codes cascade) |
| GET    | `/projects/:id/qrcodes`            | Bearer               | Paginated QR codes for a project |
| POST   | `/projects/:id/qrcodes`            | Bearer               | Create a QR code |
| GET    | `/projects/:id/access-stats`       | Bearer               | Scan counts grouped by hour × location |
| GET    | `/projects/:id/access-logs`        | Bearer               | Paginated raw scan log |
| GET    | `/projects/qrcodes`                | Bearer               | All QR codes across all projects |
| GET    | `/projects/qrcodes/:id`            | Bearer               | Single QR code |
| PUT    | `/projects/qrcodes/:id`            | Bearer               | Update a QR code's location |
| DELETE | `/projects/qrcodes/:id`            | Bearer + `DELETE`/own | Delete a QR code (and its scan log) |

## Not included

A couple of features from the original internal tool were left out of this extraction because
they depended on the host organization's internal infrastructure or were already broken:

- **LINE Bot / LIFF QR scanner** — a webhook integration for scanning codes from inside LINE.
- **Receipt printer integration** — printing QR labels directly to a local Epson ESC/POS printer
  bridge running on the operator's machine.

Both are reasonable things to add back as optional features — PRs welcome.

## License

MIT — see [LICENSE](LICENSE).
