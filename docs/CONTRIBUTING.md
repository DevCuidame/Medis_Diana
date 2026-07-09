# Contributing Guidelines

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Install dependencies: `pnpm install`
4. Make your changes
5. Follow the guidelines below
6. Push and create a pull request

## Branch Naming

- `feature/feature-name` - New features
- `bugfix/bug-name` - Bug fixes
- `docs/doc-name` - Documentation updates
- `refactor/refactor-name` - Code refactoring
- `chore/task-name` - Maintenance tasks

## Commit Messages

Write clear, descriptive commit messages in imperative mood:

```
✨ Add user authentication feature
🐛 Fix null pointer in user service
📚 Update API documentation
♻️ Refactor error handling middleware
```

**Good practices:**
- Use emoji prefix for quick scanning
- Be specific about what changed
- Reference issue numbers: `Closes #123`

## Code Style

### TypeScript
- No `any` types without justification
- Prefer interfaces over types
- Strict mode enabled
- Proper error handling

### File Organization
```
feature/
├── FeatureName.tsx       # Main component
├── FeatureName.test.tsx  # Tests
├── index.ts              # Exports
└── hooks/                # Related hooks
```

### Naming Conventions
- Components: PascalCase (`UserProfile.tsx`)
- Functions: camelCase (`getUserById()`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Files: Match exported name
- Folders: kebab-case (`user-profile/`)

### Formatting
- 2-space indentation
- Single quotes for strings
- Trailing commas in objects
- Max line length: 100 characters

**Auto-format with:**
```bash
pnpm format
```

## Testing

### Unit Tests
```bash
pnpm test
```

- Test services, utilities, pure functions
- Aim for >80% coverage
- Use descriptive test names

### Integration Tests
- Test API endpoints with database
- Mock external services
- Test error scenarios

### E2E Tests (Future)
- Test user workflows
- Use Playwright or Cypress
- Focus on critical paths

## Frontend Development

### Component Structure
```tsx
import React from 'react';
import styles from './Component.module.css';

interface ComponentProps {
  title: string;
  onAction?: () => void;
}

export const Component: React.FC<ComponentProps> = ({ title, onAction }) => {
  return <div>{title}</div>;
};
```

### Hooks
- Keep hooks focused and reusable
- Extract logic from components
- Document side effects

### State Management
- Use Zustand for global state
- Prefer Context for local state
- Props for component data

### Styling
- Use TailwindCSS utilities
- Create custom components for reuse
- Avoid inline styles

## Backend Development

### Architecture Layers
1. **Routes** - Endpoint definitions
2. **Controllers** - Request handling
3. **Services** - Business logic
4. **Repositories** - Data access
5. **Database** - Data persistence

### Error Handling
```typescript
// Use custom errors
throw new ValidationError('Invalid email format');
throw new NotFoundError('User not found');
throw new UnauthorizedError('Invalid credentials');
```

### API Response Format
```typescript
// Success
{ success: true, data: { /* payload */ } }

// Error
{ success: false, error: 'Error message' }
```

### Database
- Write migrations for schema changes
- Use connection pooling
- Index frequently queried columns
- Keep queries performant

## Pull Request Process

1. **Create PR with descriptive title**
   ```
   [Feature] Add user authentication
   [Bugfix] Fix database connection leak
   ```

2. **Provide context in description:**
   - What problem does it solve?
   - How were changes tested?
   - Any breaking changes?
   - Screenshots/videos if UI-related

3. **Link related issues**
   ```
   Closes #123
   Related to #456
   ```

4. **Ensure all checks pass:**
   - ✅ Linting
   - ✅ Type checking
   - ✅ Tests
   - ✅ Build succeeds

5. **Request reviewers** from relevant area

6. **Address feedback** promptly

## Code Review

### As a Reviewer
- ✓ Check code quality and style
- ✓ Verify tests are adequate
- ✓ Look for performance issues
- ✓ Be constructive and respectful
- ✓ Approve or request changes

### As an Author
- ✓ Response to feedback promptly
- ✓ Push new commits (don't force push)
- ✓ Mark conversations as resolved
- ✓ Thank reviewers for feedback

## Documentation

### When to Document
- New features
- API changes
- Complex logic
- Setup instructions
- Important decisions

### Where to Document
- **Code comments**: Why, not what
- **JSDoc/TSDoc**: Function signatures
- **README.md**: Package overview
- **docs/**: Guides and architecture
- **Commit messages**: What changed

## Performance

### Frontend
- Lazy load routes and components
- Optimize images
- Monitor bundle size
- Use React DevTools Profiler

### Backend
- Profile API endpoints
- Optimize database queries
- Use caching strategies
- Monitor memory usage

## Security

- Never commit secrets (use `.env.local`)
- Validate all user inputs
- Use parameterized queries
- Implement rate limiting
- Keep dependencies updated

## Deployment

### Before Deploying
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] No console errors/warnings
- [ ] Migrations prepared
- [ ] Environment variables documented

### Deployment Checklist
- [ ] Create release notes
- [ ] Update version numbers
- [ ] Tag commit in git
- [ ] Deploy backend migrations first
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Verify in production
- [ ] Monitor for errors

## Getting Help

- **Documentation**: Check docs/ folder
- **Architecture**: Read ARCHITECTURE.md
- **Questions**: Ask in team chat
- **Issues**: Create GitHub issue with details

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md
- Release notes
- Project README

---

**Thank you for contributing to medisdiana! 🚀**
