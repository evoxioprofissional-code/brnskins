"use client";

import { formatBRL } from "@/lib/format";
import type { OrderStatus } from "@/types/cart";
import { useOrdersStore } from "@/stores/orders-store";
import { useHydrated } from "@/hooks/use-hydrated";
import { AdminCard, AdminPageHeader, DemoNotice, Table, inputClass } from "./admin-ui";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Aguardando",
  confirmed: "Confirmado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export function AdminOrders() {
  const hydrated = useHydrated();
  const orders = useOrdersStore((s) => s.orders);
  const setStatus = useOrdersStore((s) => s.setStatus);
  const list = hydrated ? orders : [];

  return (
    <>
      <AdminPageHeader title="Pedidos" description="Pedidos enviados pelo carrinho para o WhatsApp." />
      <DemoNotice>
        Os pedidos estão sendo registrados apenas neste navegador. Com o Supabase habilitado, serão gravados nas tabelas{" "}
        <code>orders</code> e <code>order_items</code>.
      </DemoNotice>
      <AdminCard>
        {list.length ? (
          <Table head={["Pedido", "Cliente", "Itens", "Total", "Data", "Status"]}>
            {list.map((o) => (
              <tr key={o.id}>
                <td className="font-mono text-[12px]">{o.id}</td>
                <td>
                  <p className="font-semibold">{o.customerName}</p>
                  {o.tradeLink && <p className="max-w-[200px] truncate text-[11.5px] text-faint">{o.tradeLink}</p>}
                </td>
                <td className="max-w-[260px]">
                  <p className="truncate text-fg-2">{o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}</p>
                </td>
                <td className="font-semibold">{formatBRL(o.total)}</td>
                <td className="text-fg-2">{new Date(o.createdAt).toLocaleString("pt-BR")}</td>
                <td>
                  <select
                    value={o.status}
                    onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}
                    className={`${inputClass} h-8 w-[130px] text-[12.5px]`}
                    aria-label={`Status do pedido ${o.id}`}
                  >
                    {Object.entries(ORDER_STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="py-10 text-center text-[13px] text-fg-2">Nenhum pedido registrado ainda.</p>
        )}
      </AdminCard>
    </>
  );
}
