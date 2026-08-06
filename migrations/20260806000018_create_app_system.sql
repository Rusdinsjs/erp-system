-- Migration 20260806000018: Phase 11 ERPQu App System (QAPP-001 s.d QAPP-004)

-- 1. Installed Apps Registry (QAPP-001, QAPP-003)
CREATE TABLE IF NOT EXISTS installed_apps (
    app_name VARCHAR(100) PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    required_kernel_version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    status VARCHAR(50) NOT NULL DEFAULT 'INSTALLED', -- "INSTALLED", "ENABLED", "DISABLED"
    installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Namespaced App Migration History (QAPP-004)
CREATE TABLE IF NOT EXISTS app_migration_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_name VARCHAR(100) NOT NULL REFERENCES installed_apps(app_name) ON DELETE CASCADE,
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_app_migration UNIQUE (app_name, migration_name)
);

CREATE INDEX IF NOT EXISTS idx_app_migration_app ON app_migration_history(app_name);
