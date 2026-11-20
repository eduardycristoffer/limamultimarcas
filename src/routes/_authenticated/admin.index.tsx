import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import { OrderList } from "@/components/admin/OrderList";
import { adminDashboard } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Resumo — Painel Lima" }, { name: "description", content: "Resumo da loja." }, { property: "og:title", content: "Painel Lima" }, { property: "og:description", content: "Painel" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const fn = useServerFn(adminDashboard);
  const q = useQuery({ queryKey: ["admin", "dashboard"], queryFn: () => fn(), refetchInterval: 30_000 });
  return (
    <AdminShell title="Resumo">
      {q.isPending ? <div className="h-40 animate-pulse rounded-lg bg-card" /> : q.isError ? <p className="text-destructive">Não foi possível carregar.</p> : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[["Pedidos hoje", q.data.today], ["Aguardando pagamento", q.data.awaitingPay], ["A entregar", q.data.toDeliver], ["Pagos", q.data.paid]].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-card p-4 shadow-card"><p className="text-sm text-muted-foreground">{l}</p><p className="text-3xl font-bold">{v}</p></div>
            ))}
          </div>
          {q.data.unmatched > 0 && <p className="mt-4 rounded-md bg-accent p-3 text-sm text-accent-foreground">{q.data.unmatched} aviso(s) de pagamento da Vega sem pedido correspondente. Confira em Configurações → Vega.</p>}
          <h2 className="mb-2 mt-6 text-lg font-semibold">Últimos pedidos</h2>
          <OrderList rows={q.data.latest} />
        </>
      )}
    </AdminShell>
  );
}

