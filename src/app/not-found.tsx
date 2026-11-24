import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";

export default function NotFound() {
  return (
    <PageContainer className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <p className="promo-title text-[56px] leading-none">404</p>
        <h1 className="mt-3 text-[20px] font-bold">Página não encontrada</h1>
        <p className="mt-1 text-[13.5px] text-fg-2">O endereço acessado não existe ou foi movido.</p>
        <Link href="/" className="btn-solid-red mt-6 inline-flex h-10 items-center rounded-[8px] px-5 text-[14px] font-semibold">
          Voltar ao catálogo
        </Link>
      </div>
    </PageContainer>
  );
}
