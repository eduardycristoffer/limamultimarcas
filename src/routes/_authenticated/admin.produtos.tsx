import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell, adminInput } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { adminListProducts, adminUpdateProduct } from "@/lib/admin.functions";
import { getProduct } from "@/data/products";

export const Route = createFileRoute("/_authenticated/admin/produtos")({
  head: () => ({ meta: [{ title: "Produtos — Painel Lima" }, { name: "description", content: "Produtos da loja." }, { property: "og:title", content: "Produtos" }, { property: "og:description", content: "Painel" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: Products,
});

type P = { slug: string; name: string; price_cents: number; stock: number; active: boolean; vega_checkout_url: string | null };

function Products() {
  const fn = useServerFn(adminListProducts);
  const q = useQuery({ queryKey: ["admin", "products"], queryFn: () => fn() });
  return (
    <AdminShell title="Produtos">
      {q.isPending ? <div className="h-40 animate-pulse rounded-lg bg-card" /> : q.isError ? <p className="text-destructive">Não foi possível carregar.</p>
        : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{q.data.map((p) => <ProductForm key={p.slug} p={p} />)}</div>}
    </AdminShell>
  );
}

function ProductForm({ p }: { p: P }) {
  const save = useServerFn(adminUpdateProduct);
  const qc = useQueryClient();
  const [price, setPrice] = useState(String(p.price_cents / 100).replace(".", ","));
  const [stock, setStock] = useState(String(p.stock));
  const [active, setActive] = useState(p.active);
  const [url, setUrl] = useState(p.vega_checkout_url ?? "");
  const [busy, setBusy] = useState(false);
  const img = getProduct(p.slug)?.images.studio;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceReais = Number(price.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(priceReais) || priceReais <= 0) return void toast.error("Preço inválido.");
    if (url && !/^https:\/\//i.test(url)) return void toast.error("O link precisa começar com https://");
    setBusy(true);
    try {
      const r = await save({ data: { slug: p.slug, priceReais, stock: Math.max(0, parseInt(stock, 10) || 0), active, vegaCheckoutUrl: url.trim() } });
      if (r.ok) { toast.success(`${p.name} salvo.`); qc.invalidateQueries({ queryKey: ["admin", "products"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); } else toast.error(r.error ?? "Erro.");
    } catch { toast.error("Confira os campos (o link precisa ser https)."); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="rounded-lg bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        {img && <img src={img} alt={p.name} width={56} height={56} loading="lazy" className="h-14 w-14 rounded bg-muted object-cover" />}
        <p className="font-semibold">{p.name}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div><label className="mb-1 block text-sm font-medium" htmlFor={`pr-${p.slug}`}>Preço (R$)</label><input id={`pr-${p.slug}`} inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={adminInput} /></div>
        <div><label className="mb-1 block text-sm font-medium" htmlFor={`st-${p.slug}`}>Estoque</label><input id={`st-${p.slug}`} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} className={adminInput} /></div>
      </div>
      <label className="mt-3 flex items-center justify-between gap-2 text-sm font-medium">Ativo na loja<Switch checked={active} onCheckedChange={setActive} /></label>
      <div className="mt-3"><label className="mb-1 block text-sm font-medium" htmlFor={`url-${p.slug}`}>Link do checkout Vega (cartão)</label>
        <input id={`url-${p.slug}`} type="url" placeholder="Cole aqui o link do checkout desta moto na Vega" value={url} onChange={(e) => setUrl(e.target.value)} className={adminInput} />
        <p className="mt-1 text-xs text-muted-foreground">Sem link, a opção Cartão não aparece para esta moto.</p></div>
      <Button type="submit" variant="buy" className="mt-4 h-11 w-full" disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
    </form>
  );
}
