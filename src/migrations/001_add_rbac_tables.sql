-- RBAC (Role-Based Access Control) Database Migration
-- Run this to set up roles, admin_users, and audit_logs tables

-- ============================================================
-- 1. Create admin_users table with role support
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

-- ============================================================
-- 2. Create roles table (for advanced permission management)
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
    ('admin', 'Full system access', '["*"]'),
    ('inventory_manager', 'Can manage inventory and product stock', '["dashboard:view","products:view","products:update_inventory","inventory:view","inventory:manage"]'),
    ('order_manager', 'Can manage customer orders', '["dashboard:view","orders:view","orders:manage","orders:update_status"]'),
    ('viewer', 'Read-only access to view data', '["dashboard:view","products:view","orders:view","inventory:view"]')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 3. Create audit_logs table for tracking user actions
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
    email VARCHAR(255),
    role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- 4. Add trigger to update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON admin_users;
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;

-- Create triggers
CREATE TRIGGER update_admin_users_updated_at
    BEFORE UPDATE ON admin_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. Insert default admin user (password: admin123)
-- ============================================================
-- Note: In production, use a proper hashed password
INSERT INTO admin_users (email, password_hash, name, role, is_active)
VALUES (
    'admin@gmail.com',
    '$2b$10$YourHashedPasswordHereChangeThisInProduction', -- Placeholder hash
    'System Administrator',
    'admin',
    true
)
ON CONFLICT (email) DO UPDATE 
SET role = 'admin', is_active = true;

-- Insert inventory manager user (password: inventory123)
INSERT INTO admin_users (email, password_hash, name, role, is_active)
VALUES (
    'inventory@gmail.com',
    '$2b$10$YourHashedPasswordHereChangeThisInProduction',
    'Inventory Manager',
    'inventory_manager',
    true
)
ON CONFLICT (email) DO UPDATE 
SET role = 'inventory_manager', is_active = true;

-- Insert order manager user (password: orders123)
INSERT INTO admin_users (email, password_hash, name, role, is_active)
VALUES (
    'orders@gmail.com',
    '$2b$10$YourHashedPasswordHereChangeThisInProduction',
    'Order Manager',
    'order_manager',
    true
)
ON CONFLICT (email) DO UPDATE 
SET role = 'order_manager', is_active = true;

-- Insert viewer user (password: viewer123)
INSERT INTO admin_users (email, password_hash, name, role, is_active)
VALUES (
    'viewer@gmail.com',
    '$2b$10$YourHashedPasswordHereChangeThisInProduction',
    'Viewer User',
    'viewer',
    true
)
ON CONFLICT (email) DO UPDATE 
SET role = 'viewer', is_active = true;

-- ============================================================
-- 6. Add comment to document the migration
-- ============================================================
COMMENT ON TABLE admin_users IS 'Admin users with role-based access control';
COMMENT ON TABLE roles IS 'Role definitions with permissions';
COMMENT ON TABLE audit_logs IS 'Audit trail for tracking user actions';
