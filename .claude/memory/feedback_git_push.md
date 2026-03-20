---
name: Git push method
description: How to push to GitHub from this environment — gh auth setup-git doesn't work, must use token from gh config
type: feedback
---

Default `git push` and `gh auth setup-git` don't work in this environment. To push:

1. Read token from `/root/.config/gh/hosts.yml` (`oauth_token` field)
2. Set remote URL with token: `git remote set-url origin https://onchainyaotoshi:<TOKEN>@github.com/onchainyaotoshi/accounts.git`
3. Push: `git push origin main`
4. **Clean up**: reset remote URL to remove token: `git remote set-url origin https://github.com/onchainyaotoshi/accounts.git`

**Why:** `gh auth token` command doesn't exist in this gh version, and credential helper doesn't work. Direct token in URL is the only method that works.

**How to apply:** Every time user asks to push, use this method immediately instead of trying `git push` first.
