# Guia de Atualização do Menu Papa Bolotas

Este guia explica como atualizar o menu da aplicação com os artigos reais do Papa Bolotas.

## ⚠️ IMPORTANTE

Esta atualização irá **APAGAR todos os artigos existentes** e substituí-los pelos novos artigos fornecidos.

## 📋 O que será adicionado

### Categorias e Artigos

1. **Sandes** (4 artigos)
   - Sandes de Presunto - 5,00€
   - Sandes Presunto e Queijo - 6,00€
   - Sandes Presunto e Ovo - 6,00€
   - Sandes Presunto, Queijo e Ovo - 7,00€

2. **Tábuas** (8 artigos)
   - Chouriço Assado - 5,00€
   - Tábua Alheira - 7,00€
   - Tábua Enchidos - 8,00€
   - Tábua Presunto e Queijo - 9,00€
   - Tábua Presunto e Enchidos - 9,00€
   - Tábua Enchidos e Queijo - 9,00€
   - Tábua Presunto - 12,00€
   - Tábua Completa - 12,00€

3. **Batatas** (6 artigos)
   - Batatas Simples - 3,00€
   - Nachos c/ Cheddar - 4,00€
   - Batatas c/ Cheddar - 4,50€
   - Batatas Presunto e Cheddar - 7,00€
   - Ovos Rotos - 8,00€
   - Ovos Rotos c/ Cheddar - 9,00€

4. **Doces** (1 artigo)
   - Fatia de Bolo - 1,00€

5. **Bebidas** (32 artigos)
   - Águas, refrigerantes, cervejas, vinhos, café, etc.

6. **Petiscos** (3 artigos)
   - 3 Amigos - 5,00€
   - Croquetas 6 unid. - 5,00€
   - Croquetas 1 unid. - 1,00€

**Total: 54 artigos**

## 🚀 Como Aplicar a Atualização

### Opção 1: Através do Supabase Dashboard (Recomendado)

1. Aceda ao [Supabase Dashboard](https://app.supabase.com)
2. Selecione o projeto "Papa Bolotas"
3. Vá a **SQL Editor** no menu lateral
4. Clique em **New Query**
5. Copie todo o conteúdo do ficheiro `migrations/007_update_papa_bolotas_menu.sql`
6. Cole no editor SQL
7. Clique em **Run** ou pressione `Ctrl+Enter`

### Opção 2: Usando Supabase CLI

Se tiver o Supabase CLI instalado:

```bash
# No diretório raiz do projeto
cd supabase

# Aplicar a migração
supabase db push

# Ou aplicar manualmente
supabase db reset
```

### Opção 3: Usando psql (para utilizadores avançados)

```bash
# Conectar ao banco de dados
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Executar o script
\i migrations/007_update_papa_bolotas_menu.sql
```

## ✅ Verificação

Após executar a migração, deverá ver uma mensagem de sucesso com:
- Total de artigos inseridos
- Contagem por categoria

Para verificar manualmente:

```sql
-- Ver todos os artigos
SELECT category, name, price, stock_level 
FROM menu_items 
ORDER BY category, name;

-- Contagem por categoria
SELECT category, COUNT(*) as total
FROM menu_items
GROUP BY category
ORDER BY category;

-- Artigos com stock baixo
SELECT name, category, stock_level
FROM menu_items
WHERE stock_level < 10
ORDER BY stock_level;
```

## 📊 Níveis de Stock Iniciais

Os artigos foram configurados com os seguintes níveis de stock:

- **Stock Alto** (>900): Sandes, Tábuas, Batatas (produtos principais)
- **Stock Médio** (100-900): Café (834), Petiscos (~100)
- **Stock Normal** (10-99): Bebidas variadas
- **Stock Baixo** (<10): 
  - Ice Tea Limão (1)
  - Muralhas (2)
  - Coca Cola Zero (6)
  - Sprite Zero (4)
  - HITZ Maracujá (5)
  - Monte São Sebastião Rosé (1)
  - Pepsi Zero (0) - ESGOTADO
  - Fatia de Bolo (0) - ESGOTADO

## 🔄 Reverter Alterações

Se precisar reverter para o menu anterior, terá de:

1. Fazer backup dos dados antes de executar esta migração
2. Ou criar uma nova migração com os artigos antigos

**Recomendação**: Faça sempre backup antes de executar operações destrutivas!

## 📝 Notas

- Todos os artigos estão marcados como ativos (`is_active = true`)
- Os preços estão em euros (€)
- O stock é ajustável através da aplicação
- Alguns artigos adicionais foram incluídos baseados no stock fornecido (3 Amigos, Croquetas)

## 🐛 Resolução de Problemas

### Erro: "permission denied"
- Certifique-se de que está autenticado como admin no Supabase
- Verifique as RLS (Row Level Security) policies

### Erro: "relation does not exist"
- Certifique-se de que as migrações anteriores foram aplicadas
- Execute `001_initial_schema.sql` primeiro se necessário

### Artigos não aparecem na aplicação
- Limpe o cache do browser (Ctrl+Shift+Delete)
- Verifique a ligação à base de dados
- Confirme que o sync está ativo

## 📞 Suporte

Para questões ou problemas, contacte o administrador do sistema.
