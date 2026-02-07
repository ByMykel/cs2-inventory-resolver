# Project Guidelines

## Commit Style

Always use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add highlight resolution via attribute 314
fix: correct keychain lookup for souvenir items
chore: update dependencies
docs: improve resolver usage examples
refactor: simplify attribute extraction logic
```

## Release Process

Follow these steps in order when publishing a new release:

1. **Make all feature/fix commits first** using conventional commits.
2. **Bump the version** in both `package.json` and `package-lock.json` (run `npm install` after editing `package.json` to sync the lock file).
3. **The version bump must be the last commit** of the release. This commit should:
   - Only change `package.json` and `package-lock.json`.
   - Use the version as the commit message: `v0.3.0`.
4. **Create a lightweight tag** on the version bump commit: `git tag v0.3.0`.
5. **Push** commit and tag: `git push origin main --tags`.
6. **Create a GitHub release** from the tag using `gh release create`.
7. **Publish to npm**: `npm publish` (requires OTP).

## Tag & Release Style

### Release title

Use the version number: `v0.3.0`.

### Release notes

List all changes as bullet points. Use the conventional commit messages from the release as a reference.

```markdown
- Add highlight (souvenir charm) resolution via attribute 314
- Fix incorrect keychain lookup for items with multiple attributes
- Update inventory.json data
```

## Build

```
npm run build    # Compiles TypeScript to dist/
```

`dist/` is gitignored and not committed. It is included in the npm package via the `files` field in `package.json`.
