import { cookies } from "next/headers";
import { ADMIN_COOKIE, getAdminConfig, verifySessionToken } from "./admin-session";

/** Server actions do painel: confirma a sessão do admin antes de tocar no banco. */
export async function isAdminRequest() {
  const { secret, enabled } = getAdminConfig();
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return enabled && (await verifySessionToken(token, secret));
}
