-- =====================================================
-- Papa Bolotas - Supabase Database Migration
-- =====================================================
-- Run this script in Supabase SQL Editor
-- https://app.supabase.com/project/YOUR_PROJECT/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_username CHECK (length(username) >= 3)
);

-- Menu items table
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  stock_level INTEGER NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1,
  CONSTRAINT valid_name CHECK (length(name) > 0),
  CONSTRAINT valid_category CHECK (category IN ('Sandes', 'Tábuas', 'Batatas', 'Doces', 'Bebidas'))
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expected_cash DECIMAL(10,2),
  actual_cash DECIMAL(10,2),
  discrepancy DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number INTEGER NOT NULL,
  session_id UUID REFERENCES sessions(id) NOT NULL,
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  is_complimentary BOOLEAN DEFAULT false,
  is_cancelled BOOLEAN DEFAULT false,
  observations TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  menu_item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0)
);

-- Stock adjustments table
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID REFERENCES menu_items(id),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('manual', 'order', 'cancellation', 'loss')),
  quantity_change INTEGER NOT NULL,
  previous_level INTEGER NOT NULL CHECK (previous_level >= 0),
  new_level INTEGER NOT NULL CHECK (new_level >= 0),
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
CREATE INDEX IF NOT EXISTS idx_menu_items_active ON menu_items(is_active);
CREATE INDEX IF NOT EXISTS idx_menu_items_updated ON menu_items(updated_at);

CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_cancelled ON orders(is_cancelled);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu ON order_items(menu_item_id);

CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_item ON stock_adjustments(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created ON stock_adjustments(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_menu_items_updated_at ON menu_items;
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users full access" ON users;
DROP POLICY IF EXISTS "Authenticated users full access" ON menu_items;
DROP POLICY IF EXISTS "Authenticated users full access" ON orders;
DROP POLICY IF EXISTS "Authenticated users full access" ON order_items;
DROP POLICY IF EXISTS "Authenticated users full access" ON sessions;
DROP POLICY IF EXISTS "Authenticated users full access" ON stock_adjustments;
DROP POLICY IF EXISTS "Authenticated users full access" ON audit_logs;

-- Policies: Authenticated users have full access
CREATE POLICY "Authenticated users full access" ON users 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access" ON menu_items 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access" ON orders 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access" ON order_items 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access" ON sessions 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access" ON stock_adjustments 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users full access" ON audit_logs 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert sample menu items (uncomment to use)
/*
INSERT INTO menu_items (name, category, price, stock_level) VALUES
  ('Sandes de Leitão', 'Sandes', 8.00, 20),
  ('Sandes de Queijo', 'Sandes', 5.00, 30),
  ('Tábua Mista', 'Tábuas', 50.00, 10),
  ('Batata Frita', 'Batatas', 3.00, 50),
  ('Pastel de Nata', 'Doces', 2.00, 40),
  ('Coca-Cola', 'Bebidas', 2.50, 100),
  ('Água', 'Bebidas', 2.00, 100),
  ('Café', 'Bebidas', 1.00, 200)
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- NOTES
-- =====================================================

/*
1. After running this script, configure these in Supabase Dashboard:

   A. Authentication Settings (Authentication > Settings):
      - Enable Email provider
      - Set session timeout: 12 hours
      - Min password length: 8 characters

   B. Real-time Replication (Database > Replication):
      - Enable for: menu_items, orders, sessions, stock_adjustments

   C. Create Admin User:
      1. Go to Authentication > Users > Add user
      2. Create user with email/password
      3. Copy the UUID
      4. Run: INSERT INTO users (id, username, role) 
              VALUES ('UUID_HERE', 'admin', 'admin');

2. Get API credentials (Settings > API):
   - Project URL: https://YOUR_PROJECT.supabase.co
   - Anon/Public Key: eyJ...

3. Configure in Netlify (or .env.local):
   - VITE_SUPABASE_URL=your_url
   - VITE_SUPABASE_ANON_KEY=your_key
*/
