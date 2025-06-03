# Contributing to 2048 Dark

## Commit Message Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification. This leads to more readable messages that are easy to follow when looking through the project history and enables automatic version management.

### Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Types

Must be one of the following:

- **feat**: A new feature (MINOR version bump)
- **fix**: A bug fix (PATCH version bump)
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Scope

The scope should be the name of the affected component (optional).

Examples: `game`, `touch`, `ui`, `analytics`, `settings`

### Subject

The subject contains a succinct description of the change:

- Use the imperative, present tense: "change" not "changed" nor "changes"
- Don't capitalize the first letter
- No period (.) at the end

### Breaking Changes

Breaking changes should be indicated by a `!` after the type/scope, and/or a `BREAKING CHANGE:` footer.

Examples:
```
feat!: remove support for Node 6

feat(api)!: remove deprecated endpoints

fix!: correct major security issue

BREAKING CHANGE: This removes all legacy API endpoints.
```

### Examples

#### Feature
```
feat: add dark mode toggle

feat(game): implement undo functionality

feat(touch): add pinch-to-zoom support
```

#### Fix
```
fix: prevent duplicate tile spawning on full board

fix(analytics): correct event tracking for game over

fix(ui): resolve score display overflow on mobile
```

#### Breaking Change
```
feat!: change default grid size to 5x5

BREAKING CHANGE: The default grid size is now 5x5 instead of 4x4.
This affects all saved games.
```

## Version Management

This project uses [GitVersion](https://gitversion.net/) for automatic semantic versioning based on commit messages:

- `feat:` commits bump MINOR version (1.2.0 → 1.3.0)
- `fix:` commits bump PATCH version (1.2.0 → 1.2.1)  
- Breaking changes bump MAJOR version (1.2.0 → 2.0.0)
- Other types don't trigger version changes

### Working with Versions

```bash
# Show current version
npm run version:show

# Preview next version based on commits
npm run version:next

# Update package.json with current version
npm run version:update

# Create a git tag for release
npm run version:tag
```

## Testing

Before committing:

1. **Syntax Check**: Run `npm test` to check for syntax errors
2. **Lint**: Run `npm run lint` to check JavaScript files
3. **Manual Testing**: Test your changes in the browser

The pre-push hook will automatically run tests before pushing to prevent syntax errors from being deployed.

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes using conventional commits
4. Run tests (`npm test`)
5. Push to your fork
6. Open a Pull Request with a clear description

## Code Style

- Use 4 spaces for indentation
- Follow existing code patterns
- Keep functions small and focused
- Add comments for complex logic
- No console.log statements in production code (except for debugging features)