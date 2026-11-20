-- ================================================
-- PERFORMANCE OPTIMIZATION
-- ================================================

-- Enable query statistics extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ================================================
-- ADDITIONAL INDEXES FOR COMMON QUERIES
-- ================================================

-- Composite index for finding active session orders
CREATE INDEX IF NOT EXISTS idx_orders_session_active 
ON orders(session_id, is_cancelled, is_complimentary) 
WHERE is_cancelled = FALSE;

-- Index for order items by menu item (for stock tracking)
CREATE INDEX IF NOT EXISTS idx_order_items_menu_date 
ON order_items(menu_item_id, order_id);

-- Index for recent audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent 
ON audit_logs(created_at DESC, entity_type);

-- Index for active menu items by category
CREATE INDEX IF NOT EXISTS idx_menu_items_active_category 
ON menu_items(category, name) 
WHERE is_active = TRUE;

-- Index for pending sync items
CREATE INDEX IF NOT EXISTS idx_sync_pending 
ON sync_metadata(sync_status, entity_type, updated_at) 
WHERE sync_status = 'pending';

-- ================================================
-- MATERIALIZED VIEW FOR DASHBOARD METRICS
-- ================================================

-- Create materialized view for faster dashboard queries
CREATE MATERIALIZED VIEW IF NOT EXISTS dashboard_metrics AS
SELECT 
  -- Current active sessions
  (SELECT COUNT(*) FROM sessions WHERE is_active = TRUE) as active_sessions,
  
  -- Today's orders
  (SELECT COUNT(*) FROM orders 
   WHERE created_at >= CURRENT_DATE 
   AND is_cancelled = FALSE) as orders_today,
  
  -- Today's revenue
  (SELECT COALESCE(SUM(total), 0) FROM orders 
   WHERE created_at >= CURRENT_DATE 
   AND is_cancelled = FALSE 
   AND is_complimentary = FALSE) as revenue_today,
  
  -- Low stock items
  (SELECT COUNT(*) FROM menu_items 
   WHERE is_active = TRUE 
   AND stock_level < 5) as low_stock_items,
  
  -- Out of stock items
  (SELECT COUNT(*) FROM menu_items 
   WHERE is_active = TRUE 
   AND stock_level = 0) as out_of_stock_items,
  
  -- Total menu items
  (SELECT COUNT(*) FROM menu_items 
   WHERE is_active = TRUE) as total_menu_items,
  
  -- Last sync status
  (SELECT MAX(last_synced_at) FROM sync_metadata) as last_sync_time,
  
  -- Pending sync items
  (SELECT COUNT(*) FROM sync_metadata 
   WHERE sync_status = 'pending') as pending_sync_count,
  
  -- Last updated timestamp
  NOW() as last_updated;

-- Create unique index for materialized view refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_metrics_refresh 
ON dashboard_metrics (last_updated);

-- Grant access to authenticated users
GRANT SELECT ON dashboard_metrics TO authenticated;

-- ================================================
-- FUNCTION TO REFRESH DASHBOARD METRICS
-- ================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- FUNCTION TO GET ORDER WITH ITEMS (OPTIMIZED)
-- ================================================

CREATE OR REPLACE FUNCTION get_order_with_items(order_uuid UUID)
RETURNS TABLE (
  order_id UUID,
  order_number INTEGER,
  session_id UUID,
  total DECIMAL(10, 2),
  is_complimentary BOOLEAN,
  is_cancelled BOOLEAN,
  observations TEXT,
  created_at TIMESTAMPTZ,
  items JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.order_number,
    o.session_id,
    o.total,
    o.is_complimentary,
    o.is_cancelled,
    o.observations,
    o.created_at,
    jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'menu_item_id', oi.menu_item_id,
        'menu_item_name', oi.menu_item_name,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'subtotal', oi.subtotal
      )
    ) as items
  FROM orders o
  LEFT JOIN order_items oi ON o.id = oi.order_id
  WHERE o.id = order_uuid
  GROUP BY o.id, o.order_number, o.session_id, o.total, o.is_complimentary, 
           o.is_cancelled, o.observations, o.created_at;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ================================================
-- FUNCTION TO GET SESSION SUMMARY (OPTIMIZED)
-- ================================================

CREATE OR REPLACE FUNCTION get_session_summary(session_uuid UUID)
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  username VARCHAR(50),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN,
  total_orders INTEGER,
  completed_orders INTEGER,
  complimentary_orders INTEGER,
  cancelled_orders INTEGER,
  total_revenue DECIMAL(10, 2),
  expected_cash DECIMAL(10, 2),
  actual_cash DECIMAL(10, 2),
  discrepancy DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.user_id,
    u.username,
    s.started_at,
    s.ended_at,
    s.is_active,
    COUNT(o.id)::INTEGER as total_orders,
    COUNT(o.id) FILTER (WHERE o.is_cancelled = FALSE AND o.is_complimentary = FALSE)::INTEGER as completed_orders,
    COUNT(o.id) FILTER (WHERE o.is_complimentary = TRUE AND o.is_cancelled = FALSE)::INTEGER as complimentary_orders,
    COUNT(o.id) FILTER (WHERE o.is_cancelled = TRUE)::INTEGER as cancelled_orders,
    COALESCE(SUM(o.total) FILTER (WHERE o.is_cancelled = FALSE AND o.is_complimentary = FALSE), 0) as total_revenue,
    s.expected_cash,
    s.actual_cash,
    s.discrepancy
  FROM sessions s
  LEFT JOIN users u ON s.user_id = u.id
  LEFT JOIN orders o ON o.session_id = s.id
  WHERE s.id = session_uuid
  GROUP BY s.id, s.user_id, u.username, s.started_at, s.ended_at, s.is_active,
           s.expected_cash, s.actual_cash, s.discrepancy;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ================================================
-- VACUUM AND ANALYZE SETTINGS
-- ================================================

-- Set autovacuum parameters for high-traffic tables
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE order_items SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE audit_logs SET (
  autovacuum_vacuum_scale_factor = 0.2,
  autovacuum_analyze_scale_factor = 0.1
);

-- ================================================
-- GRANT EXECUTE PERMISSIONS
-- ================================================

GRANT EXECUTE ON FUNCTION refresh_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_with_items(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_summary(UUID) TO authenticated;

-- ================================================
-- INITIAL STATISTICS
-- ================================================

-- Collect initial statistics for query planner
ANALYZE users;
ANALYZE sessions;
ANALYZE menu_items;
ANALYZE orders;
ANALYZE order_items;
ANALYZE stock_adjustments;
ANALYZE audit_logs;
ANALYZE sync_metadata;
