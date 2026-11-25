import { NextResponse } from "next/server";
import { fetchSteamInventory } from "@/integrations/steam/inventory";
import { isSteamId64 } from "@/integrations/steam/trade-link";

/** GET /api/steam/inventory?steamid=7656119... → itens comercializáveis de CS2 */
export async function GET(request: Request) {
  const steamId = new URL(request.url).searchParams.get("steamid") ?? "";
  if (!isSteamId64(steamId)) return NextResponse.json({ ok: false, code: "invalid" }, { status: 400 });

  const result = await fetchSteamInventory(steamId);
  return NextResponse.json(result, {
    status: result.ok ? 200 : 502,
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
