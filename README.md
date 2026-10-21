# Cryptic Together

A private, real-time room for solving Guardian cryptic crosswords with a friend.
The app uses a user-operated browser bookmarklet to copy puzzle data from the
Guardian page, then synchronizes grid letters, cursors, presence, and chat
through Convex.

Live app: [crypt-brown.vercel.app](https://crypt-brown.vercel.app)

Chat includes a room-wide channel plus a dedicated thread for every clue, so
discussion stays attached to the answer being solved.

## Stack

- Next.js App Router, React, TypeScript, and Tailwind CSS
- Convex for persistent rooms and reactive subscriptions
- Zod and sanitize-html for strict import validation
- Vitest, convex-test, and Playwright

## Local setup

Requirements: Node.js 24+ and a free [Convex](https://www.convex.dev/) account.

```bash
npm install
npx convex dev
npm run dev
```

The Convex command creates a development deployment and writes
`NEXT_PUBLIC_CONVEX_URL` to `.env.local`. Open
[http://localhost:3000](http://localhost:3000).

Useful checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

The two-browser collaboration Playwright test runs when
`NEXT_PUBLIC_CONVEX_URL` points to a reachable development deployment. Without
it, the static import-flow test still runs and the live test is skipped.

## How puzzle import works

1. The user drags the **Copy Guardian cryptic** bookmarklet to their bookmarks
   bar.
2. On a Guardian crossword page, the bookmarklet reads the
   `CrosswordComponent` data already present in that browser tab.
3. It copies `{ sourceUrl, data }` JSON to the clipboard. If clipboard access is
   blocked, it shows a copyable prompt.
4. The import screen validates the source URL, dimensions, clues, positions,
   optional solutions, and total payload size. Clue markup is reduced to a
   small formatting allowlist.
5. Only the normalized puzzle is written to the private room. The application
   server never fetches or crawls Guardian pages.

The importer intentionally has no public puzzle directory or background
scraper. Rooms are unlisted and addressed by high-entropy capability URLs.
Anyone who has a room URL can enter that room, so links should be shared
privately.

## Deploy with Vercel and Convex

1. Push the repository to GitHub or Cursor Origin.
2. Run `npx convex dev` once and create the associated Convex project.
3. In the Convex dashboard, open the production deployment and generate a
   deploy key with `deployment:deploy`.
4. Import the repository into Vercel.
5. Set the Vercel build command to:

   ```bash
   npx convex deploy --cmd 'npm run build'
   ```

6. Add `CONVEX_DEPLOY_KEY` as a **Production-only** Vercel environment variable.
7. Deploy. Convex supplies `NEXT_PUBLIC_CONVEX_URL` during the production build,
   and each subsequent push deploys both the backend functions and frontend.

See the official [Convex Vercel guide](https://docs.convex.dev/production/hosting/vercel).
A custom domain can be attached from Vercel after the first deployment.

## Content and licensing

Cryptic Together is an independent collaboration tool and is not affiliated
with or endorsed by The Guardian. Crossword clues, grids, and associated
content remain the property of Guardian News & Media and their contributors.

User-initiated, private import, source attribution, and the absence of a public
catalogue are product safeguards; they do **not** grant content-reuse rights.
Before promoting a public or commercial service that reproduces Guardian
crosswords, obtain appropriate permission from
[Guardian Licensing](https://licensing.theguardian.com/products/puzzles-and-crosswords).
Do not commit captured Guardian puzzle payloads to this repository; tests use a
synthetic fixture.
