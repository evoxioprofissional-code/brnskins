# BRN Skins

Marketplace de skins de CS2. Next.js 15 (App Router) · TypeScript strict · Tailwind CSS v4 · Framer Motion · Lucide · Zustand · Playwright.

> **Etapa atual:** somente frontend em localhost. O catálogo usa **dados demonstrativos** (`src/data/demo`) — os preços não são reais.
> O banco (Supabase) está preparado em `supabase/migrations`, mas não conectado.

## Rodando

```bash
npm install
npx playwright install chromium   # uma vez
npm run dev                       # http://localhost:3000
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run typecheck` | checagem TypeScript |
| `npm run test:e2e` | testes Playwright (desktop 1648×928 + mobile) |
| `npm run visual` | captura 1648×928 com o drawer aberto e compara com `references/redesign-desktop-1648x928.png` → `visual-output/` |
| `python scripts/side-by-side.py x0 y0 x1 y1 escala nome.png` | recorte referência × atual para inspeção |

## Painel administrativo

`/admin` é protegido por middleware + verificação no layout (cookie httpOnly assinado com HMAC).
As credenciais locais ficam em `.env.local` (`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`) — nunca vão para o navegador.
Sem banco, as edições do admin (preços, visibilidade, WhatsApp, configurações) ficam salvas no navegador.

## WhatsApp

Defina o número em `NEXT_PUBLIC_WHATSAPP_NUMBER` (`.env.local`) ou em **Admin → WhatsApp**. Sem número, a finalização avisa que não está configurado.

## Estrutura

```
src/
  app/                 rotas (loja, kits, carrinho, como-funciona, faq, admin)
  components/
    layout/            header, app-shell, containers
    home/              banner principal e faixa promocional
    catalog/           abas, filtros, toolbar, cards, bottom sheet
    product/           drawer de detalhes, stepper, selos
    cart/ kits/ admin/ ui/ icons/
  config/              site, catálogo (categorias, raridades, desgastes), layout
  data/demo/           DADOS DEMONSTRATIVOS (únicos mocks do projeto)
  services/            catalog (repositório), pricing (contrato p/ APIs futuras), checkout (WhatsApp)
  stores/              Zustand (carrinho, favoritos, UI do catálogo, pedidos, configurações)
  hooks/ types/ validations/ integrations/ lib/
supabase/migrations/   schema, RLS e dados de referência
public/images/         logo, banners, recortes da faixa promo, imagens oficiais das skins
```

## Assets

- `public/images/promo/*` são recortes de `promo-banner.png` (karambit, logotipo, butterfly), sem deformação.
- `public/images/skins/*` são as imagens oficiais das skins (CDN da Steam), salvas localmente e sem margens transparentes.

## BRN Inspect 3D (`/inspect`)

Visualizador 3D em tela cheia com a API gratuita do [CS2Inspect](https://cs2inspect.skin/docs/api), usando o SDK oficial `embed.js`.

1. Entre em cs2inspect.skin → menu da conta → **API** → **New key**.
2. Em sites permitidos, adicione `localhost` e o domínio da loja.
3. Coloque a chave em `.env.local` como `NEXT_PUBLIC_CS2INSPECT_KEY` e reinicie o `npm run dev`.

A chave é pública por design (fica no HTML); a proteção é a lista de sites permitidos. A marca do CS2Inspect é exibida no visualizador (obrigatória no plano gratuito) e só um visualizador é montado por vez (uso justo).

Código: `src/integrations/cs2inspect` (tipos, configuração e hook do SDK) e `src/components/inspect/inspect-studio.tsx` (interface). O botão **Inspecionar 3D** do drawer de cada skin abre `/inspect?skin=<id>&wear=<float>[&st=1]`.

## Banco de dados (Supabase)

As migrations ficam em `supabase/migrations` e são aplicadas em ordem, cada uma em uma transação, com registro em `brn_meta.migrations`.

| Comando | O que faz |
| --- | --- |
| `npm run db:status` | lista migrations aplicadas e pendentes |
| `npm run db:migrate` | aplica as pendentes |
| `npm run db:verify` | confere tabelas, RLS, buckets e o acesso da chave pública |
| `npm run db:test` | testa compra, venda, clientes e sub-lojas com admin simulado (transação desfeita) |

Precisa de `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_DB_PASSWORD` e `SUPABASE_DB_URL` no `.env.local`.

**Estrutura:**
- Catálogo: `categories`, `rarities`, `conditions`, `products`, `product_variants`, `prices` (+ visão `current_prices`) e `kits`/`kit_items`.
- Vendas: `orders`/`order_items` (criados pela função `create_order`, que recalcula os preços no servidor).
- Painel: `clients`, `stock_lots`, `movements`, `sub_store_plans`, `sub_stores`, `recovery_rules`/`recovery_contacts`, `settings` e `admin_users`.
- Operações atômicas: `register_purchase`, `register_sale` e `confirm_sub_store_payment`.
- Visões do dashboard: `v_daily_sales`, `v_stock_summary` e `v_client_status`.
- Storage: buckets `banners` e `skins` (leitura pública, escrita só de admin).

**Segurança:** RLS em todas as tabelas. O visitante só lê o catálogo, os planos e as configurações públicas; todo o resto é exclusivo de quem está em `admin_users`. A chave secreta e a senha do banco nunca vão para o frontend.

## Catálogo e preços de mercado

Com `NEXT_PUBLIC_CATALOG_SOURCE=supabase`, a loja usa o catálogo real gravado no Supabase
(tabelas `market_skins` e `market_offers`). Enquanto não houver sincronização, cai nos dados de demonstração.

- **Catálogo:** todos os itens negociáveis do CS2 do projeto aberto [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API): armas, facas (inclusive vanilla), luvas, Zeus, agentes, adesivos, caixas e chaves, grafites, kits de música, patches e chaveiros (~16 mil itens com preço).
- **Paginação no servidor:** a busca, os filtros, a ordenação e as contagens rodam no banco (`search_market_catalog`, `market_category_counts`). O navegador recebe só a página atual (48 itens) pela rota `GET /api/catalog`.
- **Preços:** arquivos públicos e gratuitos do [CSGO Trader](https://csgotrader.app/) (BUFF163, C5Game, CSFloat, Skinport e Steam), em USD, atualizados cerca de uma vez por dia. Não é uma API oficial nem tem garantia; se a fonte falhar, a loja mantém o último preço salvo.
- **Preço de venda:** `preço do mercado base × dólar do dia × (1 + margem)`. Mercado base e margem ficam em **Admin → Preços de mercado** (que também tem o botão "Sincronizar agora").

Sincronizar manualmente (com o servidor rodando):

```bash
npm run catalog:sync                              # http://localhost:3000
BASE_URL=https://seusite.com npm run catalog:sync # produção
```

Em produção, agende uma chamada diária para `POST /api/cron/catalog-sync` com o cabeçalho
`Authorization: Bearer <CRON_SECRET>` (defina `CRON_SECRET` nas variáveis do servidor).

Os testes (`npm run test:e2e`) sobem um servidor próprio na porta 3100 com o catálogo de demonstração,
para que preços e itens sejam sempre os mesmos.
