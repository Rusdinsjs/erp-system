-- Migration: 008_add_sensor_data
-- Description: Add IoT sensor data tables (timeseries)
-- Created: 2026-01-07

-- Note: For production, consider using TimescaleDB extension for better timeseries performance
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Sensor readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
    time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    sensor_id VARCHAR(100) NOT NULL,
    
    -- Common sensor readings
    temperature DOUBLE PRECISION,
    humidity DOUBLE PRECISION,
    vibration_x DOUBLE PRECISION,
    vibration_y DOUBLE PRECISION,
    vibration_z DOUBLE PRECISION,
    pressure DOUBLE PRECISION,
    power_consumption DOUBLE PRECISION,
    custom_value DOUBLE PRECISION,
    
    -- Metadata
    unit VARCHAR(20),
    status_code INTEGER,
    quality VARCHAR(20),  -- good, uncertain, bad
    
    PRIMARY KEY (time, asset_id, sensor_id)
);

-- If using TimescaleDB, convert to hypertable:
-- SELECT create_hypertable('sensor_readings', 'time', if_not_exists => TRUE);

-- Sensor thresholds for alerts
CREATE TABLE IF NOT EXISTS sensor_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    sensor_type VARCHAR(50) NOT NULL,
    
    -- Thresholds
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    warning_min DOUBLE PRECISION,
    warning_max DOUBLE PRECISION,
    
    -- Alert configuration
    alert_enabled BOOLEAN DEFAULT true,
    alert_delay_seconds INTEGER DEFAULT 60,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(asset_id, sensor_type)
);

-- Sensor alerts
CREATE TABLE IF NOT EXISTS sensor_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    sensor_id VARCHAR(100) NOT NULL,
    threshold_id UUID REFERENCES sensor_thresholds(id),
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL,  -- threshold_exceeded, offline, anomaly
    severity VARCHAR(20) NOT NULL,     -- info, warning, critical
    
    -- Values
    sensor_value DOUBLE PRECISION,
    threshold_value DOUBLE PRECISION,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',  -- active, acknowledged, resolved
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Aggregated sensor data for dashboards (hourly/daily summaries)
CREATE TABLE IF NOT EXISTS sensor_aggregates (
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    sensor_id VARCHAR(100) NOT NULL,
    period_type VARCHAR(10) NOT NULL,  -- hour, day, week, month
    period_start TIMESTAMPTZ NOT NULL,
    
    -- Aggregates
    min_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    avg_value DOUBLE PRECISION,
    sum_value DOUBLE PRECISION,
    count_readings INTEGER,
    
    PRIMARY KEY (asset_id, sensor_id, period_type, period_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sensor_readings_asset_time ON sensor_readings(asset_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor ON sensor_readings(sensor_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_thresholds_asset ON sensor_thresholds(asset_id);
CREATE INDEX IF NOT EXISTS idx_sensor_alerts_asset ON sensor_alerts(asset_id);
CREATE INDEX IF NOT EXISTS idx_sensor_alerts_status ON sensor_alerts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_sensor_aggregates_period ON sensor_aggregates(period_start);

-- Trigger for threshold updated_at
CREATE TRIGGER update_sensor_thresholds_updated_at
    BEFORE UPDATE ON sensor_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
