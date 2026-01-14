-- Migration: 010_add_notifications
-- Description: Add notification system
-- Created: 2026-01-07

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Template content
    subject_template TEXT,
    body_template TEXT,
    
    -- Channels: email, push, sms, in_app
    channels TEXT[] DEFAULT ARRAY['in_app'],
    
    -- Event that triggers this notification
    event_type VARCHAR(100) NOT NULL,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id),
    
    -- Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    
    -- Delivery
    channel VARCHAR(20) NOT NULL DEFAULT 'in_app',
    
    -- Reference
    entity_type VARCHAR(50),
    entity_id UUID,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES notification_templates(id),
    event_type VARCHAR(100),
    
    -- Channel preferences
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Digest settings
    digest_frequency VARCHAR(20),  -- immediate, hourly, daily, weekly
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, template_id),
    UNIQUE(user_id, event_type)
);

-- Insert default notification templates
INSERT INTO notification_templates (code, name, event_type, subject_template, body_template, channels) VALUES
    ('loan_requested', 'Loan Requested', 'loan.requested',
     'New Loan Request: {{asset_name}}',
     'A loan request has been submitted for {{asset_name}} by {{borrower_name}}. Expected return: {{return_date}}',
     ARRAY['in_app', 'email']),
    
    ('loan_approved', 'Loan Approved', 'loan.approved',
     'Loan Approved: {{asset_name}}',
     'Your loan request for {{asset_name}} has been approved. Please pick up the asset.',
     ARRAY['in_app', 'email', 'push']),
    
    ('loan_overdue', 'Loan Overdue', 'loan.overdue',
     'OVERDUE: {{asset_name}}',
     'Your loan for {{asset_name}} is {{days_overdue}} days overdue. Please return immediately.',
     ARRAY['in_app', 'email', 'push', 'sms']),
    
    ('maintenance_due', 'Maintenance Due', 'maintenance.due',
     'Maintenance Due: {{asset_name}}',
     'Scheduled maintenance for {{asset_name}} is due on {{due_date}}.',
     ARRAY['in_app', 'email']),
    
    ('work_order_assigned', 'Work Order Assigned', 'workorder.assigned',
     'Work Order Assigned: {{wo_number}}',
     'You have been assigned work order {{wo_number}} for {{asset_name}}.',
     ARRAY['in_app', 'email', 'push']),
    
    ('sensor_alert', 'Sensor Alert', 'sensor.alert',
     'ALERT: {{asset_name}} - {{sensor_type}}',
     '{{severity}} alert for {{asset_name}}: {{sensor_type}} reading {{value}} exceeds threshold {{threshold}}.',
     ARRAY['in_app', 'email', 'push', 'sms'])
ON CONFLICT (code) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- Trigger
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
