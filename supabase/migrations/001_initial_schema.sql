-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- USERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (auth.uid() = id);

-- Create index on username for faster lookups
CREATE INDEX idx_users_username ON users(username);

-- ================================================
-- SESSIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  expected_cash DECIMAL(10, 2),
  actual_cash DECIMAL(10, 2),
  discrepancy DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1
);

-- Add indexes for sessions
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_active ON sessions(is_active);
CREATE INDEX idx_sessions_started_at ON sessions(started_at);

-- Add RLS policies for sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage sessions" ON sessions
  FOR ALL USING (auth.role() = 'authenticated');

-- ================================================
-- MENU_ITEMS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  stock_level INTEGER NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1
);

-- Add indexes for menu_items
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_active ON menu_items(is_active);
CREATE INDEX idx_menu_items_name ON menu_items(name);

-- Add RLS policies for menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view menu items" ON menu_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can modify menu items" ON menu_items
  FOR ALL USING (auth.role() = 'authenticated');

-- ================================================
-- ORDERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number INTEGER NOT NULL,
  session_id UUID NOT NULL REFERENCES sessions(id),
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  is_complimentary BOOLEAN DEFAULT FALSE,
  is_cancelled BOOLEAN DEFAULT FALSE,
  observations TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1
);

-- Add indexes for orders
CREATE INDEX idx_orders_session ON orders(session_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_cancelled ON orders(is_cancelled);
CREATE INDEX idx_orders_complimentary ON orders(is_complimentary);

-- Add RLS policies for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage orders" ON orders
  FOR ALL USING (auth.role() = 'authenticated');

-- ================================================
-- ORDER_ITEMS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  menu_item_name VARCHAR(100) NOT NULL -- denormalized for historical accuracy
);

-- Add indexes for order_items
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item ON order_items(menu_item_id);

-- Add RLS policies for order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage order items" ON order_items
  FOR ALL USING (auth.role() = 'authenticated');

-- ================================================
-- STOCK_ADJUSTMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  adjustment_type VARCHAR(20) NOT NULL, -- 'manual', 'order', 'cancellation', 'loss'
  quantity_change INTEGER NOT NULL,
  previous_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for stock_adjustments
CREATE INDEX idx_stock_adjustments_item ON stock_adjustments(menu_item_id);
CREATE INDEX idx_stock_adjustments_created_at ON stock_adjustments(created_at);
CREATE INDEX idx_stock_adjustments_type ON stock_adjustments(adjustment_type);

-- Add RLS policies for stock_adjustments
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view adjustments" ON stock_adjustments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create adjustments" ON stock_adjustments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ================================================
-- AUDIT_LOGS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for audit_logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Add RLS policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view own logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'authenticated');

-- ================================================
-- SYNC_METADATA TABLE (for offline sync)
-- ================================================
CREATE TABLE IF NOT EXISTS sync_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  client_id UUID NOT NULL, -- identifies the device
  sync_status VARCHAR(20) NOT NULL, -- 'pending', 'synced', 'conflict'
  last_synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id, client_id)
);

-- Add indexes for sync_metadata
CREATE INDEX idx_sync_metadata_status ON sync_metadata(sync_status);
CREATE INDEX idx_sync_metadata_entity ON sync_metadata(entity_type, entity_id);
CREATE INDEX idx_sync_metadata_client ON sync_metadata(client_id);

-- Add RLS policies for sync_metadata
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage sync metadata" ON sync_metadata
  FOR ALL USING (auth.role() = 'authenticated');
