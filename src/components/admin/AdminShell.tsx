import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, LogOut, Package, Settings, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import logo from "@/assets/logo-lima.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { amIAdmin } from "@/lib/admin.functions";

const NAV = [
  { to: "/admin", label: "Resumo", icon: LayoutDashboard },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const check = useServerFn(amIAdmin);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const admin = useQuery({ queryKey: ["am-i-admin"], queryFn: () => check(), retry: false, staleTime: 300_000 });
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  }
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img src={logo.url} alt="Logo Lima Multimarcas" width={36} height={36} className="h-9 w-9 object-contain" />
          <span className="font-bold">Painel Lima</span>
          <nav className="ml-6 hidden gap-1 md:flex" aria-label="Painel">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/admin" }} className="rounded-md px-3 py-2 text-sm text-ink-muted hover:text-ink-foreground" activeProps={{ className: "bg-ink-foreground/10 text-ink-foreground" }}>{n.label}</Link>
            ))}
          </nav>
          <button onClick={signOut} className="ml-auto flex h-11 items-center gap-1 rounded-md px-3 text-sm text-ink-muted hover:text-ink-foreground"><LogOut className="h-4 w-4" />Sair</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5">
        <h1 className="mb-4 text-2xl font-bold">{title}</h1>
        {admin.isPending ? <div className="h-40 animate-pulse rounded-lg bg-card" />
          : admin.isError ? <div className="rounded-lg bg-card p-6 shadow-card"><p className="font-semibold">Acesso negado.</p><p className="text-sm text-muted-foreground">Esta conta não é administradora.</p></div>
          : children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card md:hidden" aria-label="Painel">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/admin" }} className="flex h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground" activeProps={{ className: "text-primary font-semibold" }}>
            <n.icon className="h-5 w-5" />{n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export const STATUS_LABEL: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento", pago: "Pago", recusado: "Recusado", expirado: "Expirado", estornado: "Estornado",
  aguardando_entrega: "A entregar", aguardando_retirada: "A retirar", entregue: "Entregue", cancelado: "Cancelado",
};
export const METHOD_LABEL: Record<string, string> = { pix: "Pix", cartao_vega: "Cartão (Vega)", pagar_na_entrega: "Pagar na entrega", pagar_na_loja: "Pagar na loja" };
export function StatusBadge({ status }: { status: string }) {
  const tone = status === "pago" || status === "entregue" ? "bg-success text-success-foreground"
    : ["cancelado", "recusado", "expirado", "estornado"].includes(status) ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground";
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>{STATUS_LABEL[status] ?? status}</span>;
}
export const adminInput = "h-11 w-full rounded-md border border-input bg-card px-3";
