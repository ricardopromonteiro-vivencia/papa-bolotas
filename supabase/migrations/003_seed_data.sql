-- ================================================
-- SEED DATA FOR INITIAL SETUP
-- ================================================

-- Insert initial admin user
-- Password: 'PapaBolotasAdmin123!' (this should be changed after first login)
-- Password hash generated with bcrypt (cost factor 10)
INSERT INTO users (username, password_hash, role, created_at, updated_at)
VALUES 
  ('admin', '$2a$10$YourHashedPasswordHere', 'admin', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- Note: The actual password hash needs to be generated using bcrypt
-- This is a placeholder that should be replaced during actual setup
-- You can generate it using Node.js:
-- const bcrypt = require('bcrypt');
-- bcrypt.hash('PapaBolotasAdmin123!', 10, (err, hash) => console.log(hash));

-- ================================================
-- SAMPLE MENU CATEGORIES VALIDATION
-- ================================================
-- The application supports these categories:
-- - Sandes
-- - Tábuas
-- - Batatas
-- - Doces
-- - Bebidas

-- ================================================
-- OPTIONAL: Insert sample menu items for testing
-- ================================================
-- Uncomment these if you want to start with sample data

-- INSERT INTO menu_items (name, category, price, stock_level, is_active) VALUES
--   ('Sandes de Leitão', 'Sandes', 5.50, 20, TRUE),
--   ('Sandes de Presunto', 'Sandes', 4.50, 25, TRUE),
--   ('Tábua de Queijos', 'Tábuas', 12.00, 10, TRUE),
--   ('Tábua Mista', 'Tábuas', 15.00, 8, TRUE),
--   ('Batatas Fritas', 'Batatas', 3.00, 50, TRUE),
--   ('Batatas Rústicas', 'Batatas', 3.50, 40, TRUE),
--   ('Pastel de Nata', 'Doces', 1.20, 30, TRUE),
--   ('Bolo de Chocolate', 'Doces', 2.50, 15, TRUE),
--   ('Coca-Cola', 'Bebidas', 2.00, 100, TRUE),
--   ('Água', 'Bebidas', 1.00, 150, TRUE),
--   ('Cerveja Super Bock', 'Bebidas', 2.50, 80, TRUE),
--   ('Vinho Tinto', 'Bebidas', 8.00, 20, TRUE);

-- ================================================
-- CREATE VIEWS FOR REPORTING
-- ================================================

-- View for session sales report
CREATE OR REPLACE VIEW session_sales_report AS
SELECT 
  s.id as session_id,
  s.user_id,
  u.username,
  s.started_at,
  s.ended_at,
  s.is_active,
  COUNT(DISTINCT o.id) FILTER (WHERE o.is_cancelled = FALSE AND o.is_complimentary = FALSE) as completed_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.is_complimentary = TRUE AND o.is_cancelled = FALSE) as complimentary_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.is_cancelled = TRUE) as cancelled_orders,
  COALESCE(SUM(o.total) FILTER (WHERE o.is_cancelled = FALSE AND o.is_complimentary = FALSE), 0) as total_revenue,
  s.expected_cash,
  s.actual_cash,
  s.discrepancy
FROM sessions s
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN orders o ON o.session_id = s.id
GROUP BY s.id, s.user_id, u.username, s.started_at, s.ended_at, s.is_active, 
         s.expected_cash, s.actual_cash, s.discrepancy;

-- View for item sales by session
CREATE OR REPLACE VIEW session_item_sales AS
SELECT 
  o.session_id,
  oi.menu_item_id,
  oi.menu_item_name,
  mi.category,
  SUM(oi.quantity) as total_quantity,
  SUM(oi.subtotal) as total_sales,
  AVG(oi.unit_price) as avg_price
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
WHERE o.is_cancelled = FALSE
GROUP BY o.session_id, oi.menu_item_id, oi.menu_item_name, mi.category;

-- View for current stock levels with warnings
CREATE OR REPLACE VIEW stock_status AS
SELECT 
  mi.id,
  mi.name,
  mi.category,
  mi.stock_level,
  mi.price,
  mi.is_active,
  CASE 
    WHEN mi.stock_level = 0 THEN 'OUT_OF_STOCK'
    WHEN mi.stock_level < 5 THEN 'LOW_STOCK'
    ELSE 'NORMAL'
  END as stock_status,
  mi.updated_at as last_stock_update
FROM menu_items mi
WHERE mi.is_active = TRUE
ORDER BY 
  CASE 
    WHEN mi.stock_level = 0 THEN 1
    WHEN mi.stock_level < 5 THEN 2
    ELSE 3
  END,
  mi.category,
  mi.name;

-- Grant SELECT permissions on views to authenticated users
GRANT SELECT ON session_sales_report TO authenticated;
GRANT SELECT ON session_item_sales TO authenticated;
GRANT SELECT ON stock_status TO authenticated;
