import { NextResponse, type NextRequest } from "next/server";
import { paramsToQuery } from "@/lib/catalog-query";
import { getCatalogRepository } from "@/services/catalog";

/**
 * Catálogo público:
 *   GET /api/catalog?q=&cat=&wears=FN,MW&min=&max=&sort=&page=   → página filtrada
 *   GET /api/catalog?ids=a,b,c                                    → itens específicos
 *   GET /api/catalog?names=AK-47 | Redline;AWP | Asiimov          → por nome de mercado
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const repo = await getCatalogRepository();
  const headers = { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" };
  try {
    const ids = sp.get("ids");
    if (ids !== null) {
      const items = await repo.getSkins(ids.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 200));
      return NextResponse.json({ items }, { headers });
    }
    const names = sp.get("names");
    if (names !== null) {
      const items = await repo.getSkinsByMarketName(names.split(";").map((s) => s.trim()).filter(Boolean).slice(0, 200));
      return NextResponse.json({ items }, { headers });
    }
    return NextResponse.json(await repo.queryCatalog(paramsToQuery(sp)), { headers });
  } catch {
    return NextResponse.json({ error: "catalog_unavailable" }, { status: 503 });
  }
}
