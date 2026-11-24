import type { Metadata } from "next";
import Image from "next/image";
import { siteConfig } from "@/config/site";
import { getAdminConfig } from "@/lib/admin-session";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Admin · Entrar", robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const { enabled } = getAdminConfig();
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(50%_40%_at_50%_0%,rgb(160_0_25/0.25),transparent_70%)] px-4">
      <div className="panel w-full max-w-[380px] p-7">
        <Image src={siteConfig.assets.logo} alt={siteConfig.name} width={297} height={160} className="mx-auto h-14 w-auto" priority />
        <h1 className="mt-5 text-center text-[18px] font-bold">Painel administrativo</h1>
        <p className="mt-1 text-center text-[13px] text-fg-2">Acesso restrito à equipe BRN Skins.</p>
        {enabled ? (
          <LoginForm next={next ?? "/admin"} />
        ) : (
          <p className="mt-6 rounded-[8px] border border-primary/30 bg-primary/10 p-3 text-[12.5px] text-fg">
            Painel desativado. Defina <code className="font-mono">ADMIN_PASSWORD</code> (mín. 8 caracteres) e{" "}
            <code className="font-mono">ADMIN_SESSION_SECRET</code> (mín. 32 caracteres) no arquivo{" "}
            <code className="font-mono">.env.local</code> e reinicie o servidor.
          </p>
        )}
      </div>
    </main>
  );
}
