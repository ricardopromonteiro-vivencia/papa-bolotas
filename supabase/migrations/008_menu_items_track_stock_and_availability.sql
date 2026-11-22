-- ================================================
-- 008: Artigos sem controlo de stock e bloqueio de artigos esgotados
-- ================================================
-- track_stock  = FALSE → o artigo não tem número de stock: não aparece na página de Stock
--                        e os pedidos não descontam stock
-- is_available = FALSE → o artigo está bloqueado (esgotado) e não pode ser adicionado a pedidos
--
-- Seguro para correr mais do que uma vez. Os artigos existentes ficam com controlo de stock
-- e disponíveis (comportamento atual).

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;

-- A vista de stock passa a mostrar só os artigos com controlo de stock
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
  AND mi.track_stock = TRUE
ORDER BY
  CASE
    WHEN mi.stock_level = 0 THEN 1
    WHEN mi.stock_level < 5 THEN 2
    ELSE 3
  END,
  mi.category,
  mi.name;

GRANT SELECT ON stock_status TO authenticated;

-- Verificação
DO $$
DECLARE
  has_track BOOLEAN;
  has_avail BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'menu_items' AND column_name = 'track_stock') INTO has_track;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'menu_items' AND column_name = 'is_available') INTO has_avail;
  RAISE NOTICE 'track_stock: %, is_available: %', has_track, has_avail;
END $$;
