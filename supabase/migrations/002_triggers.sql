-- ================================================
-- AUTOMATIC TIMESTAMP UPDATE TRIGGERS
-- ================================================

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for menu_items table
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for sync_metadata table
CREATE TRIGGER update_sync_metadata_updated_at
  BEFORE UPDATE ON sync_metadata
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- AUTOMATIC VERSION INCREMENT TRIGGERS
-- ================================================

-- Create a function to increment version numbers
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for menu_items version increment
CREATE TRIGGER increment_menu_items_version
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- Trigger for orders version increment
CREATE TRIGGER increment_orders_version
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- Trigger for sessions version increment
CREATE TRIGGER increment_sessions_version
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- ================================================
-- AUDIT LOG TRIGGERS
-- ================================================

-- Function to automatically log menu_item changes
CREATE OR REPLACE FUNCTION log_menu_item_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (NEW.last_modified_by, 'CREATE', 'menu_item', NEW.id, 
            jsonb_build_object('name', NEW.name, 'price', NEW.price, 'category', NEW.category));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (NEW.last_modified_by, 'UPDATE', 'menu_item', NEW.id,
            jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (OLD.last_modified_by, 'DELETE', 'menu_item', OLD.id,
            jsonb_build_object('name', OLD.name));
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger for menu_items changes
CREATE TRIGGER audit_menu_items
  AFTER INSERT OR UPDATE OR DELETE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION log_menu_item_change();

-- Function to automatically log order changes
CREATE OR REPLACE FUNCTION log_order_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (NEW.created_by, 'CREATE', 'order', NEW.id,
            jsonb_build_object('order_number', NEW.order_number, 'total', NEW.total, 
                              'is_complimentary', NEW.is_complimentary));
  ELSIF TG_OP = 'UPDATE' AND NEW.is_cancelled = TRUE AND OLD.is_cancelled = FALSE THEN
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (NEW.cancelled_by, 'CANCEL', 'order', NEW.id,
            jsonb_build_object('order_number', NEW.order_number, 'total', OLD.total));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for order changes
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_change();

-- Function to automatically log stock adjustments
CREATE OR REPLACE FUNCTION log_stock_adjustment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (NEW.created_by, 'STOCK_ADJUST', 'stock_adjustment', NEW.id,
          jsonb_build_object('menu_item_id', NEW.menu_item_id, 
                            'adjustment_type', NEW.adjustment_type,
                            'quantity_change', NEW.quantity_change,
                            'previous_level', NEW.previous_level,
                            'new_level', NEW.new_level));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for stock_adjustments
CREATE TRIGGER audit_stock_adjustments
  AFTER INSERT ON stock_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION log_stock_adjustment();
