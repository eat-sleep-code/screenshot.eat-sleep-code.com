# Download site

Single static HTML page (no build step), styled like [skills.eat-sleep-code.com](https://skills.eat-sleep-code.com). Detects the visitor's OS, and pulls the latest release's download links/version/notes straight from the GitHub API client-side — no server needed.

Domain: `screenshot.eat-sleep-code.com` (confirmed) — `docs/CNAME` is already set. Point its DNS at GitHub Pages (same pattern as `skills.eat-sleep-code.com`) once the repo is live.

## Publish via GitHub Pages

1. Repo Settings -> Pages -> Deploy from a branch -> branch `main`, folder `/site/docs`.
2. Update the `REPO` constant in `docs/index.html` if the GitHub repo name/owner ever changes from `eat-sleep-code/screenshot.eat-sleep-code.com`.
