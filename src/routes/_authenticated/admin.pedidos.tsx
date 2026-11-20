import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminShell, adminInput, METHOD_LABEL, STATUS_LABEL } from "@/components/admin/AdminShell";
import { adminListOrders } from "@/lib/admin.functions";
import { OrderList } from "@/components/admin/OrderList";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — Painel Lima" }, { name: "description", content: "Pedidos da loja." }, { property: "og:title", content: "Pedidos" }, { property: "og:description", content: "Painel" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Orders,
});

function Orders() {
  const fn = useServerFn(adminListOrders);
  const [status, setStatus] = useState(""); const [method, setMethod] = useState(""); const [q, setQ] = useState("");
  const query = useQuery({ queryKey: ["admin", "orders", status, method, q], queryFn: () => fn({ data: { status: status || undefined, method: method || undefined, q: q.trim() || undefined } }) });
  return (
    <AdminShell title="Pedidos">
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <label className="sr-only" htmlFor="f-q">Buscar</label>
        <input id="f-q" placeholder="Buscar nome, nº, e-mail, telefone" value={q} onChange={(e) => setQ(e.target.value)} className={adminInput} />
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={adminInput}>
          <option value="">Todos os status</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select aria-label="Pagamento" value={method} onChange={(e) => setMethod(e.target.value)} className={adminInput}>
          <option value="">Todos os pagamentos</option>{Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {query.isPending ? <div className="h-40 animate-pulse rounded-lg bg-card" /> : query.isError ? <p className="text-destructive">Não foi possível carregar.</p> : <OrderList rows={query.data} />}
    </AdminShell>
  );
}
