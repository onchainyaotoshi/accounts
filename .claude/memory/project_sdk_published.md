---
name: auth-sdk published to npm
description: @yaotoshi/auth-sdk is public on npm and used by multiple projects — avoid breaking changes
type: project
---

`@yaotoshi/auth-sdk` is published to npm as a public package and used by multiple Yaotoshi ecosystem projects as their auth integration.

**Why:** Breaking changes to the SDK API (YaotoshiAuth constructor, login/logout/handleCallback/getUser methods, storage keys) will break all apps that depend on it.

**How to apply:** When modifying `packages/auth-sdk/src/`, treat it as a public API:
- Don't rename or remove existing methods/properties
- Don't change storage key formats (would log out all users)
- Additive changes only (new optional params, new methods)
- If a breaking change is truly needed, bump major version and coordinate with dependent projects
- Auto-publish workflow runs on every push to `packages/auth-sdk/src/**` on main
