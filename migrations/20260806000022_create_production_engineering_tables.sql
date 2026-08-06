-- Migration 20260806000022: Phase 15 Production Engineering, Cloud and Governance (QSRE-001..010)

-- 1. System Health & Observability Table (QSRE-001, QSRE-002)
CREATE TABLE IF NOT EXISTS system_health_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(100) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY', -- HEALTHY, DEGRADED, UNHEALTHY
    latency_ms INT NOT NULL DEFAULT 0,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_health_checked ON system_health_checks(checked_at);

-- 2. Backup Verification & Restore Drills Table (QSRE-004, QSRE-005)
CREATE TABLE IF NOT EXISTS system_backup_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    backup_name VARCHAR(255) NOT NULL,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    backup_status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- COMPLETED, FAILED, RESTORED
    restore_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_logs_tenant ON system_backup_logs(tenant_id);

-- 3. Tenant Control-Plane Provisioning Table (QSRE-008)
CREATE TABLE IF NOT EXISTS tenant_provisioning_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    site_domain VARCHAR(255) NOT NULL UNIQUE,
    provision_status VARCHAR(50) NOT NULL DEFAULT 'INITIATED', -- INITIATED, PROVISIONED, FAILED
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tenant_prov_tenant ON tenant_provisioning_logs(tenant_id);
