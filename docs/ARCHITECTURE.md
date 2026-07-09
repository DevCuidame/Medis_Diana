# medisdiana Architecture Guide

## Overview

medisdiana is a modern, modular monorepo built with a client/server architecture, emphasizing clean separation of concerns, scalability, and maintainability.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, Vite, TypeScript | User interface & client-side logic |
| **Backend** | Node.js, Express, PostgreSQL | API & business logic |
| **Build** | Turborepo, pnpm workspaces | Monorepo orchestration |
| **Shared** | TypeScript interfaces | Type-safe contracts |

## Directory Structure

```
medisdiana/
├── apps/
│   ├── frontend/    # React + Vite SPA
│   └── backend/     # Express API server
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   ├── ui-components/    # Reusable React components
│   ├── config/           # ESLint, TypeScript, Prettier configs
│   └── database/         # SQL schemas & migrations
├── tools/           # Scripts & deployment configs
├── docs/            # Documentation
└── .github/         # CI/CD workflows
```

## Communication Flow

```
Client (React)
    ↓
HTTP/REST (JSON)
    ↓
Express Router → Controllers → Services → Repositories
    ↓
PostgreSQL Database
```

## Key Design Decisions

### 1. Monorepo with Workspaces
- **Why**: Single source of truth, unified versioning, shared dependencies
- **How**: pnpm workspaces + Turborepo for caching & parallelization
- **Benefit**: Easy refactoring across packages, consistent tooling

### 2. Strict Client/Server Separation
- **Why**: Independent deployment, clear boundaries, scalability
- **How**: Separate `apps/frontend` and `apps/backend`
- **Benefit**: Teams can work independently without conflicts

### 3. Shared Types Package
- **Why**: Type-safe communication, single contract definition
- **How**: `packages/shared-types` imported by both apps
- **Benefit**: Compile-time verification of API contracts

### 4. Clean Architecture (Backend)
- **Why**: Testability, maintainability, separation of concerns
- **How**: Controllers → Services → Repositories → Database
- **Benefit**: Easy to mock & test, clear responsibility chain

### 5. Environment-Based Configuration
- **Why**: Different settings for dev/staging/production
- **How**: `.env.local` files (ignored from git) + `.env.example`
- **Benefit**: Secrets safe, configuration flexible

## Deployment Strategy

### Frontend
- Build: `pnpm build` → static files in `dist/`
- Deploy: Upload to CDN or static host
- URL: https://docxime.cuidame.tech

### Backend
- Build: `pnpm build` → compiled JS in `dist/`
- Deploy: Docker container → Cloud (K8s, Render, Railway)
- URL: https://docxime.cuidame.tech/api

### Database
- Migrations: Run before backend startup
- Backups: Regular automated backups
- Versioning: SQL migrations tracked in git

## Development Workflow

### Local Development

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Setup environment**
   ```bash
   cp apps/backend/.env.example apps/backend/.env.local
   cp apps/frontend/.env.example apps/frontend/.env.local
   ```

3. **Start PostgreSQL** (Docker recommended)
   ```bash
   docker run -d --name postgres \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 postgres:15
   ```

4. **Run migrations**
   ```bash
   pnpm -F @medisdiana/backend migrate
   ```

5. **Start dev servers**
   ```bash
   pnpm dev
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3007

### Code Organization

**Frontend (`apps/frontend/src/`)**
- `components/` → React components (organized by feature)
- `pages/` → Route components
- `hooks/` → Custom React hooks
- `services/` → API clients
- `store/` → Global state management
- `styles/` → CSS/TailwindCSS
- `types/` → Local TypeScript interfaces

**Backend (`apps/backend/src/`)**
- `routes/` → API endpoint definitions
- `controllers/` → Request handlers
- `services/` → Business logic
- `repositories/` → Database access
- `middleware/` → Express middleware
- `types/` → TypeScript interfaces
- `utils/` → Helper functions
- `config/` → Configuration (DB, environment)

## Testing Strategy

### Unit Tests
- Location: `__tests__/unit/`
- Tool: Node's built-in test runner or Jest
- Target: Services, utilities, pure functions

### Integration Tests
- Location: `__tests__/integration/`
- Tool: Jest with test database
- Target: Controllers, API endpoints, database operations

### E2E Tests
- Tool: Playwright or Cypress
- Target: User workflows across frontend & backend

## API Design

### Request/Response Format

**Success Response (200)**
```json
{
  "success": true,
  "data": { /* actual data */ }
}
```

**Error Response (4xx/5xx)**
```json
{
  "success": false,
  "error": "descriptive error message"
}
```

### Authentication
- JWT tokens in Authorization header
- Format: `Bearer <token>`
- Refresh tokens in httpOnly cookies (future)

### Versioning
- Current: v1 (implied by `/api/` path)
- Future: `/api/v2/` if major changes needed

## Performance Considerations

### Frontend
- Vite for fast builds and HMR
- Code splitting via React Router lazy loading
- Image optimization with TailwindCSS
- Caching: Service workers (future)

### Backend
- Database connection pooling
- Request rate limiting (future)
- Caching: Redis (future)
- Compression: gzip middleware

### Monorepo
- Turborepo caching to avoid rebuilding unchanged packages
- Parallel task execution
- Dependency tracking for CI/CD

## Security

- **Authentication**: JWT with secure secret
- **Authorization**: Role-based (RBAC) implementation planned
- **Data Validation**: Server-side validation on all inputs
- **CORS**: Configured to allow only frontend origin
- **Environment Secrets**: Never commit `.env.local` files
- **HTTPS**: Enforced in production

## Monitoring & Logging

- **Logging**: Structured logging in backend
- **Error Tracking**: Error handler middleware catches all errors
- **Metrics**: Response times, error rates (future: Sentry/Datadog)

## Contributing Guidelines

1. **Branch naming**: `feature/name`, `bugfix/name`, `docs/name`
2. **Commit messages**: Clear, descriptive, imperative mood
3. **Pull requests**: Link to issues, include tests
4. **Code style**: ESLint + Prettier (enforced)
5. **Type safety**: No `any` types without justification

## Future Enhancements

- [ ] Authentication (OAuth2, passwordless)
- [ ] Real-time features (WebSockets/Socket.io)
- [ ] Search (Elasticsearch)
- [ ] Caching (Redis)
- [ ] File uploads (S3)
- [ ] Email notifications
- [ ] Analytics
- [ ] Admin panel
