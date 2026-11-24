import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { PageContainer, PageHeading } from "@/components/layout/page-container";

export const metadata: Metadata = { title: "Carrinho" };

export default function CartPage() {
  return (
    <PageContainer>
      <PageHeading eyebrow="Carrinho" title="Revisar pedido" description="Confira os itens e finalize pelo WhatsApp com atendimento direto." />
      <CartView />
    </PageContainer>
  );
}
