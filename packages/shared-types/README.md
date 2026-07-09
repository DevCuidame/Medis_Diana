# Shared Types

Shared TypeScript types, interfaces, and enums used across both frontend and backend applications.

## Structure

```
src/
├── api/           # API request/response types
├── models/        # Domain models
└── enums/         # Enumeration types
```

## Usage

### In Frontend

```typescript
import { User, ApiResponse, LoginRequest } from '@medisdiana/shared-types';
```

### In Backend

```typescript
import { User, ApiResponse, LoginRequest } from '@medisdiana/shared-types';
```

## Guidelines

- Keep types focused on data contracts between client and server
- Use meaningful names that reflect the domain
- Document complex types with JSDoc comments
- Export all types from `/src/index.ts`

## Contributing

When adding new types:
1. Place them in the appropriate directory (`api/`, `models/`, or `enums/`)
2. Export from the directory's `index.ts`
3. Re-export from root `index.ts`
4. Update this README with usage examples
