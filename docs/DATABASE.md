# Database Schema

## Users Table

Stores user account information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key, auto-generated |
| `email` | VARCHAR(255) | Unique email address |
| `name` | VARCHAR(255) | User's display name |
| `password_hash` | VARCHAR(255) | Bcrypt hashed password |
| `created_at` | TIMESTAMP | Account creation time |
| `updated_at` | TIMESTAMP | Last modification time |

### Indexes

- `idx_users_email` - For fast email lookups during login

## Entity Relationships

```
Users
  ├─ Roles (Future)
  ├─ Sessions (Future)
  └─ AuditLog (Future)
```

## Planned Tables

### Posts (Future)
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
```

### Sessions (Future)
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Audit Log (Future)
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

## Conventions

### Naming
- Tables: snake_case, plural (`users`, `posts`)
- Columns: snake_case (`user_id`, `created_at`)
- Indexes: `idx_<table>_<column>`

### Timestamps
- All tables have `created_at` and `updated_at`
- Timestamps are UTC
- Triggers auto-update `updated_at`

### Foreign Keys
- Named `<table>_id` (e.g., `user_id`)
- Include `ON DELETE CASCADE` for cleanup
- Always indexed for performance

### Constraints
- Email is UNIQUE
- Required fields have NOT NULL
- IDs are UUID (better than auto-increment)

## Data Types

| PostgreSQL | Use Case |
|-----------|----------|
| UUID | Primary/foreign keys |
| VARCHAR(n) | Fixed-length strings |
| TEXT | Long strings |
| TIMESTAMP | Dates with time |
| DATE | Dates only |
| BOOLEAN | Yes/no fields |
| JSONB | Flexible data structures |
| INET | IP addresses |

## Backup & Recovery

### Backup Strategy
```bash
# Weekly full backups
pg_dump medisdiana_dev > backup_$(date +%Y%m%d).sql

# Point-in-time recovery
pg_restore -d medisdiana_dev backup.sql
```

### Disaster Recovery
- Production: Automated daily backups
- Retention: 30-day backups
- Testing: Monthly restore tests

## Performance Considerations

### Query Optimization
- Index frequently searched columns
- Use EXPLAIN ANALYZE for slow queries
- Keep indexes updated

### Maintenance
- Regular VACUUM and ANALYZE
- Monitor table bloat
- Partition large tables (future)

## Security

- Passwords stored as bcrypt hashes
- No sensitive data in logs
- Encrypt at rest (production)
- Regular security audits

## Migration Strategy

All schema changes go through numbered migrations:

```
001_create_users_table.sql
002_create_posts_table.sql
003_add_post_status_index.sql
```

This ensures:
- Version control
- Repeatable deployments
- Rollback capability
- Team synchronization
