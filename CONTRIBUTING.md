# Contributing to Llamita

Thanks for helping! This guide explains how the team works so changes stay safe and easy to review.

## Branches

| Branch                         | Purpose                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `main`                         | Production. Only updated through pull requests from `develop`.     |
| `develop`                      | Integration. Every feature branch starts here and comes back here. |
| `feature/<name>`               | New functionality, e.g. `feature/protected-areas`                  |
| `fix/<name>` / `hotfix/<name>` | Bug fixes                                                          |
| `docs/<name>`                  | Documentation only                                                 |
| `chore/<name>`                 | Tooling, CI, dependencies, configuration                           |

Never commit directly to `main` or `develop`, and never force-push shared branches.

## Workflow

1. **Update `develop`**

   ```bash
   git switch develop
   git pull --ff-only origin develop
   pnpm install
   ```

2. **Create your branch**

   ```bash
   git switch -c feature/my-change
   ```

3. **Make your change**, keeping it small and focused on one thing.

4. **Run every check locally** (the same ones CI runs):

   ```bash
   pnpm format        # or pnpm format:check
   pnpm lint
   pnpm test
   pnpm build
   ```

5. **Review what you are about to commit**, then commit only the files that belong to the change:

   ```bash
   git status
   git add <files>
   git diff --cached   # look for keys, .env files or unrelated changes
   git commit -m "feat(map): add protected areas layer"
   ```

   Tip: `git --no-pager diff --cached` prints the diff without opening a pager.

6. **Push and open a pull request**

   ```bash
   git push -u origin feature/my-change
   ```

   On GitHub, open the pull request with **base: `develop`** (GitHub suggests `main` by default — change it).

7. **Ask for review** from the people who own the code you touched (`git log --format='%an' -- <file>` shows who). Wait for CI to pass and for approval before merging.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/), as in the existing history:

```
<type>(<optional scope>): <short summary in imperative mood>
```

| Type                     | When                                                    |
| ------------------------ | ------------------------------------------------------- |
| `feat`                   | A new feature                                           |
| `fix`                    | A bug fix                                               |
| `refactor`               | Code change that neither fixes a bug nor adds a feature |
| `test`                   | Adding or updating tests                                |
| `docs`                   | Documentation only                                      |
| `style`                  | Formatting, no logic change                             |
| `chore` / `build` / `ci` | Tooling, dependencies, pipelines                        |

Examples: `feat(header): add GitHub repository link`, `fix(backend): retrieve FIRMS observations by area`.

## Pull requests

A good pull request:

- Has a clear title (same style as commits) and explains **what** changed and **why**.
- Includes screenshots for visual changes.
- Mentions new environment variables, dependencies or data sources (with their license).
- Adds or updates tests when it changes logic in `src/lib/`.
- Does not mix unrelated changes. If you need to touch code another teammate owns, or anything that could affect other components (CI/CD, Docker, shared styles, shared components), talk to them first and add them as reviewers.

## Code guidelines

- **TypeScript strict:** no `any`; validate external input and handle errors explicitly.
- **Formatting and linting:** Prettier and ESLint decide; don't fight them.
- **Next.js 16:** this version has breaking changes compared to older guides. Check the docs bundled in `node_modules/next/dist/docs/` and follow deprecation notices.
- **Language:** user-facing text is in Spanish; code, identifiers and comments are in English.
- **Styling:** reuse the design tokens in `src/app/globals.css` (colors, spacing, radii) instead of hard-coded values. The heat scale (`heatColor`) is reserved for map data, legends and charts.
- **Small, focused modules:** domain logic lives in `src/lib/`, UI in `src/components/`.
- **Dependencies:** propose new packages in the pull request description. Prefer well-maintained libraries, keep `pnpm-lock.yaml` in sync and never install with `curl | sh`-style scripts.

## Tests

Tests live in `tests/` and use the built-in Node.js test runner:

```bash
pnpm test
```

Add a `*.test.ts` file next to the existing ones and import it in `tests/run.mjs`, which is the entry point the runner uses. Mock network calls (FIRMS, GAMC, Redis) instead of hitting real services.

## Security rules

- **Never commit secrets.** Keys go in `.env.local` (local) or `.env` (Docker), both ignored by git. Only `.env.example`, with empty values, is versioned.
- Secrets stay on the server: never prefix them with `NEXT_PUBLIC_`, log them or return them in API responses or error messages.
- Validate and bound every query parameter in API routes; public endpoints that spend external quota need limits and caching.
- Don't disable security checks (SSL verification, checksums) in CI/CD.
- If a key leaks, tell the team and rotate it immediately.

## Questions

Open a discussion in the pull request or ask the team. When in doubt, ask before changing shared code.
