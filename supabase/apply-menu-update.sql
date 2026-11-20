-- ================================================
-- SCRIPT PARA APLICAR ATUALIZAÇÃO DO MENU
-- ================================================
-- Execute este script no SQL Editor do Supabase Dashboard
-- ou através do psql: psql -U postgres -d postgres -f apply-menu-update.sql

\echo '================================================'
\echo 'PAPA BOLOTAS - Atualização do Menu'
\echo '================================================'
\echo ''
\echo 'ATENÇÃO: Este script vai APAGAR todos os artigos existentes!'
\echo 'Prima Ctrl+C para cancelar ou Enter para continuar...'
\echo ''

-- Incluir o conteúdo da migração
\i migrations/007_update_papa_bolotas_menu.sql

\echo ''
\echo '================================================'
\echo 'Atualização concluída!'
\echo '================================================'
\echo ''
\echo 'Verificação rápida:'
SELECT 
  category as "Categoria",
  COUNT(*) as "Nº Artigos",
  SUM(stock_level) as "Stock Total"
FROM menu_items
GROUP BY category
ORDER BY category;

\echo ''
\echo 'Artigos com stock baixo (< 10):'
SELECT 
  name as "Artigo",
  category as "Categoria",
  stock_level as "Stock",
  price as "Preço"
FROM menu_items
WHERE stock_level < 10
ORDER BY stock_level ASC, category, name;
