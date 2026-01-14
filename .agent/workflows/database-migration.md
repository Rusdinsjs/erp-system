---
description: How to create and run database migrations
---

# Database Migration Workflow

## Prerequisites
- SQLx CLI installed: `cargo install sqlx-cli`
- DATABASE_URL set in environment or .env file

## Creating a New Migration

1. Create a new migration file:
```bash
sqlx migrate add <migration_name>
```
Example:
```bash
sqlx migrate add add_loan_management
```

This creates a new file in `migrations/` with timestamp prefix.

2. Edit the migration file with your SQL changes.

## Running Migrations

// turbo
1. Run all pending migrations:
```bash
sqlx migrate run
```

2. Check migration status:
```bash
sqlx migrate info
```

## Reverting Migrations

1. Revert the last migration:
```bash
sqlx migrate revert
```

Note: Only works if migrations have `down.sql` files.

## Preparing for Offline Mode (CI/CD)

// turbo
1. Generate SQLx query cache:
```bash
cargo sqlx prepare
```

This creates `.sqlx/` directory with query metadata for compile-time verification without database connection.

2. Verify queries work offline:
```bash
SQLX_OFFLINE=true cargo build
```

## Common Migration Patterns

### Adding a new table
```sql
CREATE TABLE table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_name ON table_name(name);
```

### Adding a column
```sql
ALTER TABLE existing_table
ADD COLUMN new_column VARCHAR(100);
```

### Adding a foreign key
```sql
ALTER TABLE child_table
ADD COLUMN parent_id UUID REFERENCES parent_table(id);
```
