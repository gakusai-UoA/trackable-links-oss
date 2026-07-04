# Security

## Reporting a vulnerability

Please report security issues privately using GitHub's
[Security Advisories](https://github.com/gakusai-UoA/trackable-links-oss/security/advisories/new)
("Report a vulnerability" on the Security tab) rather than opening a public issue.

## Known security tradeoffs

These are deliberate simplifications documented for transparency, not oversights — see
[Authentication](README.md#authentication) for how to replace them:

- **Single shared admin password**, not per-user accounts. Anyone with the password has full
  access to every project and QR code.
- **Session tokens are stored in `localStorage`** on the admin dashboard, not an `httpOnly`
  cookie — this is simpler to run without a backend-for-frontend proxy, but is more exposed to
  token theft via XSS than a cookie-based session would be.
- **No login rate limiting.** `POST /auth/login` can be brute-forced; use a strong
  `ADMIN_PASSWORD` and consider adding rate limiting (e.g. Cloudflare Turnstile or a KV-backed
  counter) if you expose this publicly.
- **The location-setup passcode (`LOCATION_SETUP_PASSCODE`) is a single shared secret** with no
  per-QR-code distinction, by design (it's meant for whoever is physically installing a QR code,
  not an authenticated user).
