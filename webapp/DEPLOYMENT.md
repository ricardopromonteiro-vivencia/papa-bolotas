# Papa Bolotas Webapp - Deployment Configuration

## Netlify Deployment

[![Netlify Status](https://api.netlify.com/api/v1/badges/YOUR_SITE_ID/deploy-status)](https://app.netlify.com/sites/YOUR_SITE_NAME/deploys)

### Prerequisites

1. **Supabase Project Setup**
   - Create a Supabase project at https://app.supabase.com
   - Run the SQL migrations (see `database/migrations/`)
   - Get your project URL and anon key from Settings > API

2. **Netlify Account**
   - Create account at https://netlify.com
   - Install Netlify CLI: `npm install -g netlify-cli`

### Environment Variables Needed

Configure these in Netlify: Site Settings > Environment Variables

```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (your anon key)
VITE_APP_NAME=Papa Bolotas
VITE_SECURITY_CODE=1234
VITE_SESSION_TIMEOUT_HOURS=12
```

### Deployment Steps

#### Option 1: Netlify CLI (Recommended)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

#### Option 2: Git Integration

1. Push code to GitHub/GitLab
2. Go to Netlify Dashboard
3. Click "New site from Git"
4. Select your repository
5. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. Add environment variables
7. Deploy!

### Build Configuration

The `netlify.toml` file configures:
- Build command and output directory
- Redirect rules for SPA routing
- Headers for security and caching
- PWA service worker caching

### Post-Deployment

1. **Custom Domain (Optional)**
   - Go to Domain Settings in Netlify
   - Add your custom domain
   - Configure DNS records
   - SSL is automatic

2. **Test Deployment**
   - Visit your site URL
   - Test login functionality
   - Test offline mode
   - Test order creation
   - Test sync after going offline/online

3. **Monitor**
   - Check Netlify deploy logs
   - Monitor browser console for errors
   - Check Supabase dashboard for database activity

### Rollback

If needed, rollback to previous deployment:
```bash
netlify rollback
```

Or use Netlify UI: Deploys > Select previous > Publish deploy

---

## Supabase Configuration Required

### 1. Database Setup

Run these SQL migrations in Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items table
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  stock_level INTEGER NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_modified_by UUID REFERENCES users(id),
  version INTEGER DEFAULT 1
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number INTEGER NOT NULL,
  session_id UUID NOT NULL,
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
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  menu_item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL
);

-- Sessions table
CREATE TABLE sessions (
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

-- Stock adjustments table
CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID REFERENCES menu_items(id),
  adjustment_type TEXT NOT NULL,
  quantity_change INTEGER NOT NULL,
  previous_level INTEGER NOT NULL,
  new_level INTEGER NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_active ON menu_items(is_active);
CREATE INDEX idx_orders_session ON orders(session_id);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_sessions_active ON sessions(is_active);
CREATE INDEX idx_stock_adjustments_item ON stock_adjustments(menu_item_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies (authenticated users can access all data)
CREATE POLICY "Authenticated users can view all" ON menu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON menu_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON menu_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON menu_items FOR DELETE TO authenticated USING (true);

-- Repeat for other tables
CREATE POLICY "Authenticated users can view all orders" ON orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert orders" ON orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update orders" ON orders FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view order_items" ON order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert order_items" ON order_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view sessions" ON sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sessions" ON sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sessions" ON sessions FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view stock_adjustments" ON stock_adjustments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert stock_adjustments" ON stock_adjustments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view audit_logs" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert audit_logs" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can view users" ON users FOR SELECT TO authenticated USING (true);
```

### 3. Real-time Subscriptions

Enable real-time in Supabase Dashboard:
1. Go to Database > Replication
2. Enable replication for these tables:
   - menu_items
   - orders
   - sessions
   - stock_adjustments

### 4. Authentication

Configure in Supabase Dashboard > Authentication > Settings:
- Enable Email provider
- Set session timeout: 12 hours
- Configure password requirements: min 8 characters

### 5. Create Initial Admin User

In Supabase SQL Editor:
```sql
-- Create admin user (will need to login via Supabase Auth)
INSERT INTO users (id, username, role)
VALUES (
  'USER_ID_FROM_AUTH',  -- Get this after creating auth user
  'admin',
  'admin'
);
```

Or use Supabase Dashboard:
1. Authentication > Users > Add user
2. Create user with email/password
3. Copy the user ID
4. Insert into users table with SQL above

---

## Security Checklist

- [ ] Environment variables configured in Netlify
- [ ] `.env.local` added to `.gitignore`
- [ ] Supabase RLS policies enabled
- [ ] Strong admin password set
- [ ] Session timeout configured (12 hours)
- [ ] HTTPS enforced (automatic with Netlify)
- [ ] Security code changed from default (1234)

---

## Troubleshooting

### Build Fails
- Check environment variables are set
- Verify Node version (18+)
- Check build logs in Netlify

### Can't Login
- Verify Supabase URL and anon key
- Check user exists in Supabase Auth
- Check browser console for errors

### Offline Mode Not Working
- Check service worker is registered
- Verify PWA configuration
- Test in production build (not dev)

### Sync Not Working
- Check Supabase connection
- Verify real-time is enabled
- Check browser console for sync errors
