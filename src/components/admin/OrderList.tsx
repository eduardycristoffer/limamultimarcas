import { Link } from "@tanstack/react-router";
import { METHOD_LABEL, StatusBadge } from "./AdminShell";
import { money } from "@/lib/format";

export function OrderList({ rows }: { rows: { order_number: string; customer_name: string; product_name: string; total_cents: number; status: string; payment_method: string; created_at: string }[] }) {
  if (!rows.length) return <p className="rounded-lg bg-card p-6 text-center text-muted-foreground shadow-card">Nenhum pedido ainda.</p>;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg bg-card shadow-card">
      {rows.map((o) => (
        <li key={o.order_number}>
          <Link to="/admin/pedido/$numero" params={{ numero: o.order_number }} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-4 hover:bg-muted">
            <div className="min-w-0">
              <p className="truncate font-semibold">{o.customer_name}</p>
              <p className="truncate text-sm text-muted-foreground">{o.order_number} · {o.product_name} · {METHOD_LABEL[o.payment_method]}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-BR")}</p>
            </div>
            <div className="text-right"><p className="font-bold">{money(o.total_cents)}</p><StatusBadge status={o.status} /></div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
