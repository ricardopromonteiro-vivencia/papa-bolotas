-- ================================================
-- PAPA BOLOTAS MENU UPDATE
-- ================================================
-- This migration clears the existing menu and populates it with the real Papa Bolotas items

-- First, disable triggers temporarily to avoid conflicts
ALTER TABLE menu_items DISABLE TRIGGER ALL;

-- Clear existing menu items
TRUNCATE TABLE menu_items RESTART IDENTITY CASCADE;

-- Re-enable triggers
ALTER TABLE menu_items ENABLE TRIGGER ALL;

-- ================================================
-- CATEGORIA: Sandes
-- ================================================
INSERT INTO menu_items (name, category, price, stock_level, is_active) VALUES
('Sandes de Presunto', 'Sandes', 5.00, 964, true),
('Sandes Presunto e Queijo', 'Sandes', 6.00, 978, true),
('Sandes Presunto e Ovo', 'Sandes', 6.00, 982, true),
('Sandes Presunto, Queijo e Ovo', 'Sandes', 7.00, 987, true);

-- ================================================
-- CATEGORIA: Tábuas
-- ================================================
INSERT INTO menu_items (name, category, price, stock_level, is_active) VALUES
('Chouriço Assado', 'Tábuas', 5.00, 983, true),
('Tábua Alheira', 'Tábuas', 7.00, 998, true),
('Tábua Enchidos', 'Tábuas', 8.00, 999, true),
('Tábua Presunto e Queijo', 'Tábuas', 9.00, 992, true),
('Tábua Presunto e Enchidos', 'Tábuas', 9.00, 995, true),
('Tábua Enchidos e Queijo', 'Tábuas', 9.00, 997, true),
('Tábua Presunto', 'Tábuas', 12.00, 1000, true),
('Tábua Completa', 'Tábuas', 12.00, 979, true);

-- ================================================
-- CATEGORIA: Batatas
-- ================================================
INSERT INTO menu_items (name, category, price, stock_level, is_active) VALUES
('Batatas Simples', 'Batatas', 3.00, 997, true),
('Nachos c/ Cheddar', 'Batatas', 4.00, 997, true),
('Batatas c/ Cheddar', 'Batatas', 4.50, 995, true),
('Batatas Presunto e Cheddar', 'Batatas', 7.00, 1000, true),
('Ovos Rotos', 'Batatas', 8.00, 901, true),
('Ovos Rotos c/ Cheddar', 'Batatas', 9.00, 969, true);

-- ================================================
-- CATEGORIA: Doces
-- ================================================
INSERT INTO menu_items (name, category, price, stock_level, is_active) VALUES
('Fatia de Bolo', 'Doces', 1.00, 0, true);

-- ================================================
-- CATEGORIA: Bebidas
-- ================================================
INSERT INTO menu_items (name, category, price, stock_level, is_active) VALUES
-- Águas
('Água (Lisa)', 'Bebidas', 1.00, 56, true),
('Água com Gás', 'Bebidas', 1.50, 20, true),

-- Cervejas
('Cerveja Mini', 'Bebidas', 1.50, 24, true),
('Cerveja Mini Preta', 'Bebidas', 1.50, 20, true),

-- Refrigerantes
('Coca Cola', 'Bebidas', 2.00, 20, true),
('Coca Cola Zero', 'Bebidas', 2.00, 6, true),
('Ice Tea Limão', 'Bebidas', 2.00, 1, true),
('Ice Tea Pêssego', 'Bebidas', 2.00, 15, true),
('Sumol Ananás', 'Bebidas', 2.00, 8, true),
('Sumol Laranja', 'Bebidas', 2.00, 4, true),
('Pepsi Zero', 'Bebidas', 2.00, 0, true),
('Sprite', 'Bebidas', 2.00, 9, true),
('Sprite Zero', 'Bebidas', 2.00, 4, true),
('Guaraná', 'Bebidas', 2.00, 10, true),

-- Bebidas Premium
('HITZ Maracujá', 'Bebidas', 7.00, 5, true),
('HITZ Frutos Vermelhos', 'Bebidas', 7.00, 7, true),
('Castiço', 'Bebidas', 7.00, 8, true),
('Muralhas', 'Bebidas', 7.00, 2, true),
('Pegões', 'Bebidas', 7.00, 8, true),
('Pegões Branco', 'Bebidas', 7.00, 6, true),
('Monte São Sebastião Rosé', 'Bebidas', 7.00, 1, true),
('Moscatel', 'Bebidas', 7.00, 24, true),

-- Sidras e outras
('Somersby', 'Bebidas', 7.00, 11, true),
('Pedras Limão', 'Bebidas', 7.00, 13, true),

-- Café
('Café', 'Bebidas', 1.00, 834, true),

-- Champarrião
('Champarrião 1 L', 'Bebidas', 8.00, 1000, true),
('Champarrião 2 L', 'Bebidas', 13.50, 1000, true);

-- ================================================
-- CATEGORIA: Petiscos (Artigos adicionais do stock fornecido)
-- ================================================
INSERT INTO menu_items (name, category, price, stock_level, is_active) VALUES
('3 Amigos', 'Petiscos', 5.00, 100, true),
('Croquetas 6 unid.', 'Petiscos', 5.00, 95, true),
('Croquetas 1 unid.', 'Petiscos', 1.00, 99, true);

-- ================================================
-- VERIFICATION
-- ================================================
-- Count items by category
DO $$
DECLARE
  total_count INTEGER;
  sandes_count INTEGER;
  tabuas_count INTEGER;
  batatas_count INTEGER;
  doces_count INTEGER;
  bebidas_count INTEGER;
  petiscos_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM menu_items;
  SELECT COUNT(*) INTO sandes_count FROM menu_items WHERE category = 'Sandes';
  SELECT COUNT(*) INTO tabuas_count FROM menu_items WHERE category = 'Tábuas';
  SELECT COUNT(*) INTO batatas_count FROM menu_items WHERE category = 'Batatas';
  SELECT COUNT(*) INTO doces_count FROM menu_items WHERE category = 'Doces';
  SELECT COUNT(*) INTO bebidas_count FROM menu_items WHERE category = 'Bebidas';
  SELECT COUNT(*) INTO petiscos_count FROM menu_items WHERE category = 'Petiscos';

  RAISE NOTICE 'Menu Papa Bolotas atualizado com sucesso!';
  RAISE NOTICE 'Total de artigos: %', total_count;
  RAISE NOTICE '  - Sandes: %', sandes_count;
  RAISE NOTICE '  - Tábuas: %', tabuas_count;
  RAISE NOTICE '  - Batatas: %', batatas_count;
  RAISE NOTICE '  - Doces: %', doces_count;
  RAISE NOTICE '  - Bebidas: %', bebidas_count;
  RAISE NOTICE '  - Petiscos: %', petiscos_count;
END $$;
