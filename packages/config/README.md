# Shared Configuration

Centralized configuration for ESLint, TypeScript, and Prettier across all applications.

## Usage

Each package or app should reference these configurations:

### ESLint

Extend from this package's ESLint config:

```json
{
  "extends": ["@medisopimed/config/eslint"]
}
```

### TypeScript

Extend from the base TypeScript config:

```json
{
  "extends": "@medisopimed/config/tsconfig"
}
```

### Prettier

Use the shared Prettier config:

```json
{
  "prettier": "@medisopimed/config/prettier"
}
```

## Benefits

- 🎯 Single source of truth for code style
- 🔄 Easier updates across all packages
- ✨ Consistent developer experience
