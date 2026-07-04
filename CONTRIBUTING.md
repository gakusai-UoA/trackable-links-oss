# Contributing

Thanks for considering a contribution.

## Getting set up

Follow the [Quick start](README.md#quick-start) in the README — it covers installing
dependencies, creating a local D1 database, and running both packages with `pnpm dev`.

## Before opening a PR

```sh
pnpm lint        # biome check .
pnpm typecheck   # tsc --noEmit in both packages
pnpm build       # vite build for packages/web
```

There's no automated test suite yet (see "Not included" below for other gaps) — please describe
how you manually verified your change in the PR description.

## Scope

This project intentionally stays small: a redirect/logging Worker, an admin dashboard, and a
pluggable auth seam. Please open an issue to discuss anything that adds new infrastructure
dependencies (new Cloudflare bindings, new external services) before sending a PR — smaller,
focused PRs are much easier to review.

Known gaps that are welcome as contributions:

- A real test suite (`vitest` is already used elsewhere in the ecosystem and would fit naturally).
- The LINE Bot/LIFF QR scanner and receipt-printer (ePOS) integrations mentioned in the README's
  "Not included" section.
- Additional `Verifier` implementations under `packages/api/src/auth/` (see [Authentication](README.md#authentication)) for
  real identity providers.

## Commit style

Plain, descriptive commit messages explaining *why* a change was made are preferred over
conventional-commits-style prefixes. Keep PRs focused — one logical change per PR.

## Reporting bugs / requesting features

Open a GitHub issue. For security issues, see [SECURITY.md](SECURITY.md) instead of a public issue.
