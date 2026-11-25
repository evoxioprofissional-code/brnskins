import { REFERRAL, REFERRAL_CODE_RE } from "@/config/referral";

/** Código de quem indicou o visitante (cookie gravado por /r/<code>), se houver. */
export function readReferralCode(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${REFERRAL.refCookie}=`));
  const code = match ? decodeURIComponent(match.slice(REFERRAL.refCookie.length + 1)) : "";
  return REFERRAL_CODE_RE.test(code) ? code : null;
}

