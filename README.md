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
