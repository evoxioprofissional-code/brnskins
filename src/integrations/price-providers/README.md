# Provedores de preço

Nenhum provedor externo está configurado. Para integrar uma API oficial de preços
ou de catálogo de skins:

1. Implemente a interface `PriceProvider` (`src/services/pricing/price-provider.ts`)
   neste diretório, lendo endpoint e credenciais de variáveis de ambiente **somente
   do servidor** (sem prefixo `NEXT_PUBLIC_`).
2. Registre a implementação em `priceProviders` (`src/services/pricing/index.ts`).
3. Grave as cotações na tabela `prices` com `source` = id do provedor.

Não adicione endpoints ou chaves que não tenham sido fornecidos oficialmente.
