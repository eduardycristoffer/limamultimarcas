import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Copy } from "lucide-react";
import { AdminShell, adminInput } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminGetSettings, adminSaveSettings, adminWebhookEvents, getMetaStatus, getVegaStatus, saveMetaToken, saveVegaCredentials } from "@/lib/admin.functions";
import { DEFAULT_RATES, installmentPlan, sanitizeRates } from "@/lib/order-rules";
import { money } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Painel Lima" }, { name: "description", content: "Configurações da loja." }, { property: "og:title", content: "Configurações" }, { property: "og:description", content: "Painel" }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const get = useServerFn(adminGetSettings);
  const q = useQuery({ queryKey: ["admin", "settings"], queryFn: () => get() });
  return (
    <AdminShell title="Configurações">
      {q.isPending ? <div className="h-40 animate-pulse rounded-lg bg-card" /> : q.isError ? <p className="text-destructive">Não foi possível carregar.</p> : (
        <Tabs defaultValue="vega">
          <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="vega" className="h-11 flex-1">Vega Checkout</TabsTrigger>
            <TabsTrigger value="pag" className="h-11 flex-1">Pagamentos</TabsTrigger>
            <TabsTrigger value="parc" className="h-11 flex-1">Sinal e parcelas</TabsTrigger>
            <TabsTrigger value="frete" className="h-11 flex-1">Frete e loja</TabsTrigger>
            <TabsTrigger value="meta" className="h-11 flex-1">Meta</TabsTrigger>
          </TabsList>
          <TabsContent value="vega"><VegaTab siteUrl={q.data.site_url} /></TabsContent>
          <TabsContent value="pag"><PaymentsTab s={q.data} /></TabsContent>
          <TabsContent value="parc"><InstallmentsTab s={q.data} /></TabsContent>
          <TabsContent value="frete"><ShippingTab s={q.data} /></TabsContent>
          <TabsContent value="meta"><MetaTab s={q.data} /></TabsContent>
        </Tabs>
      )}
    </AdminShell>
  );
}

type S = Awaited<ReturnType<typeof adminGetSettings>>;
const Box = ({ title, children }: { title: string; children: React.ReactNode }) => <section className="mb-4 rounded-lg bg-card p-4 shadow-card"><h2 className="mb-3 font-semibold">{title}</h2>{children}</section>;
const F = ({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) => (
  <div><label htmlFor={id} className="mb-1 block text-sm font-medium">{label}</label>{children}{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div>
);

function useSaveSettings() {
  const save = useServerFn(adminSaveSettings);
  const qc = useQueryClient();
  return async (data: Partial<Omit<S, "id" | "updated_at" | "vega_base_url" | "vega_domain">>) => {
    try {
      const r = await save({ data: data as never });
      if (r.ok) { toast.success("Configurações salvas."); qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["settings"] }); }
      else toast.error(r.error ?? "Erro ao salvar.");
    } catch { toast.error("Confira os campos e tente de novo."); }
  };
}

function VegaTab({ siteUrl: initialSite }: { siteUrl: string }) {
  const status = useServerFn(getVegaStatus); const saveCreds = useServerFn(saveVegaCredentials); const events = useServerFn(adminWebhookEvents);
  const qc = useQueryClient(); const saveSettings = useSaveSettings();
  const v = useQuery({ queryKey: ["admin", "vega"], queryFn: () => status() });
  const ev = useQuery({ queryKey: ["admin", "webhook-events"], queryFn: () => events() });
  const [base, setBase] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [site, setSite] = useState(initialSite);
  if (v.isPending) return <div className="h-40 animate-pulse rounded-lg bg-card" />;
  if (v.isError) return <p className="text-destructive">Não foi possível carregar.</p>;
  const d = v.data;
  const connected = d.hasKey && !!d.baseUrl && !!d.domain && !!d.siteUrl;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await saveCreds({ data: { baseUrl: (base ?? d.baseUrl).trim(), domain: (domain ?? d.domain).trim(), ...(key.trim() ? { apiKey: key.trim() } : {}) } });
      if (r.ok) { toast.success("Dados da Vega salvos."); setKey(""); setReplacing(false); qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["settings"] }); } else toast.error("Erro ao salvar.");
    } catch { toast.error("Confira: endereço com https:// e domínio sem https://."); }
  }

  return (
    <>
      {!d.siteUrl && <div className="mb-4 flex gap-2 rounded-lg border-2 border-primary bg-accent p-4 text-sm text-accent-foreground"><AlertTriangle className="h-5 w-5 shrink-0" /><p><strong>Defina o endereço público do site depois de publicar.</strong> Sem ele, a Vega não consegue avisar os pagamentos e o Pix fica desligado.</p></div>}
      <Box title="Endereço público do site">
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="site" className="sr-only">Endereço do site</label>
          <input id="site" type="url" placeholder="https://seusite.com.br" value={site} onChange={(e) => setSite(e.target.value)} className={adminInput} />
          <Button variant="ink" className="h-11" onClick={async () => { await saveSettings({ site_url: site.trim() }); v.refetch(); }}>Salvar</Button>
        </div>
      </Box>
      <Box title="Vega Checkout">
        <p className="mb-3">{connected ? <span className="inline-flex items-center gap-1 rounded-full bg-success px-3 py-1 text-sm font-semibold text-success-foreground"><CheckCircle2 className="h-4 w-4" />Conectado</span>
          : <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground"><AlertTriangle className="h-4 w-4" />Faltam dados</span>}</p>
        <form onSubmit={submit} className="space-y-3">
          <F id="vb" label="Endereço do checkout (seu subdomínio)" hint="Ex.: https://checkout.seudominio.com.br"><input id="vb" type="url" value={base ?? d.baseUrl} onChange={(e) => setBase(e.target.value)} className={adminInput} /></F>
          <F id="vd" label="Domínio aprovado (x-domain)" hint="Só o domínio, sem https://"><input id="vd" value={domain ?? d.domain} onChange={(e) => setDomain(e.target.value)} className={adminInput} /></F>
          <F id="vk" label="API Key">
            {d.hasKey && !replacing ? (
              <div className="flex items-center gap-2"><span className="flex h-11 flex-1 items-center rounded-md border border-input bg-muted px-3 font-mono">•••• {d.last4}</span><Button type="button" variant="outline" className="h-11" onClick={() => setReplacing(true)}>Substituir</Button></div>
            ) : <input id="vk" type="password" autoComplete="off" placeholder="Cole o token gerado na Vega" value={key} onChange={(e) => setKey(e.target.value)} className={adminInput} />}
          </F>
          <Button type="submit" variant="buy" className="h-11">Salvar dados da Vega</Button>
        </form>
      </Box>
      <Box title="URL do webhook">
        {d.webhookUrl ? (
          <div className="flex gap-2"><input readOnly value={d.webhookUrl} aria-label="URL do webhook" className={`${adminInput} font-mono text-xs`} />
            <Button type="button" variant="outline" className="h-11" onClick={() => navigator.clipboard.writeText(d.webhookUrl).then(() => toast.success("Copiado!"))}><Copy />Copiar</Button></div>
        ) : <p className="text-sm text-muted-foreground">Aparece aqui depois que você salvar o endereço público do site.</p>}
        <p className="mt-2 text-xs text-muted-foreground">Não compartilhe esta URL: ela contém um código secreto.</p>
      </Box>
      <Box title="Passo a passo">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>No painel da Vega: Desenvolvedores → API → criar token.</li>
          <li>Aprove o seu domínio (subdomínio do checkout) na Vega.</li>
          <li>Cole aqui o endereço do checkout, o domínio aprovado e a API Key.</li>
          <li>Copie a URL do webhook acima e cole na configuração de Webhooks da Vega.</li>
          <li>Na aba Produtos, cole o link de checkout de cada moto para liberar o cartão.</li>
        </ol>
      </Box>
      <Box title="Últimos avisos recebidos da Vega">
        {ev.isPending ? <div className="h-16 animate-pulse rounded bg-muted" /> : !ev.data?.length ? <p className="text-sm text-muted-foreground">Nenhum aviso recebido ainda.</p> : (
          <ul className="divide-y divide-border text-sm">{ev.data.map((e) => (
            <li key={e.id} className="py-2"><span className={e.result === "sem_correspondencia" ? "font-semibold text-primary" : "font-semibold"}>{e.result === "sem_correspondencia" ? "Sem correspondência" : e.result === "aplicado" ? "Aplicado" : "Ignorado"}</span>
              {" · "}{new Date(e.created_at).toLocaleString("pt-BR")}{e.order_number && ` · ${e.order_number}`}
              {e.result === "sem_correspondencia" && <details className="mt-1"><summary className="cursor-pointer text-link">Ver dados</summary><pre className="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(e.payload, null, 2)}</pre></details>}
            </li>))}</ul>
        )}
      </Box>
    </>
  );
}

function PaymentsTab({ s }: { s: S }) {
  const save = useSaveSettings();
  const [pix, setPix] = useState(s.pix_enabled); const [card, setCard] = useState(s.card_enabled); const [cod, setCod] = useState(s.cod_enabled);
  const [methods, setMethods] = useState(s.cod_methods.join(", "));
  return (
    <Box title="Formas de pagamento">
      <div className="space-y-4">
        <Toggle label="Pix" hint="Cobrança criada pela Vega; precisa da Vega conectada." checked={pix} onChange={setPix} />
        <Toggle label="Cartão de crédito" hint="Pago no checkout da Vega. Só aparece nas motos que têm o link do checkout cadastrado em Produtos." checked={card} onChange={setCard} />
        <Toggle label="Pagar na entrega / na loja" hint="Fica só no nosso sistema. Na entrega, vale até o limite de km da aba Frete." checked={cod} onChange={setCod} />
        <F id="cm" label="Formas aceitas na entrega" hint="Separe por vírgula."><input id="cm" value={methods} onChange={(e) => setMethods(e.target.value)} className={adminInput} /></F>
        <Button variant="buy" className="h-11" onClick={() => save({ pix_enabled: pix, card_enabled: card, cod_enabled: cod, cod_methods: methods.split(",").map((m) => m.trim()).filter(Boolean) })}>Salvar</Button>
      </div>
    </Box>
  );
}
const Toggle = ({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-start justify-between gap-4"><span><span className="block font-medium">{label}</span><span className="block text-sm text-muted-foreground">{hint}</span></span><Switch checked={checked} onCheckedChange={onChange} /></label>
);

function InstallmentsTab({ s }: { s: S }) {
  const save = useSaveSettings();
  const [deposit, setDeposit] = useState(String(s.deposit_cents / 100).replace(".", ","));
  const [max, setMax] = useState(s.installments_max);
  const [rates, setRates] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(sanitizeRates(s.installment_rates)).map(([k, v]) => [k, String(v).replace(".", ",")])));
  const [preview, setPreview] = useState(799000);
  const num = (v: string) => Number(v.replace(/\./g, "").replace(",", "."));
  const parsed = Object.fromEntries(Object.entries(rates).filter(([, v]) => v.trim() !== "").map(([k, v]) => [k, num(v)]));
  const plan = installmentPlan(preview, parsed, max);
  const ns = Array.from({ length: Math.max(18, max) }, (_, i) => String(i + 1));
  return (
    <>
      <Box title="Sinal do pague na entrega">
        <F id="dep" label="Valor do sinal (R$)" hint="Cobrado no Pix pela Vega para reservar a moto. O restante é pago na entrega ou na retirada. 0 = sem sinal.">
          <input id="dep" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={adminInput} />
        </F>
        <Button variant="buy" className="mt-3 h-11" onClick={() => {
          const v = num(deposit); if (!Number.isFinite(v) || v < 0) return void toast.error("Valor inválido.");
          save({ deposit_cents: Math.round(v * 100) });
        }}>Salvar sinal</Button>
      </Box>
      <Box title="Parcelamento no cartão">
        <p className="mb-3 text-sm text-muted-foreground">Acréscimo total sobre o preço à vista, por número de parcelas. Precisa ser igual ao configurado no checkout da Vega: o site só mostra, quem cobra é a Vega.</p>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <F id="mx" label="Máximo de parcelas"><select id="mx" value={max} onChange={(e) => setMax(Number(e.target.value))} className={adminInput}>{Array.from({ length: 24 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}x</option>)}</select></F>
          <F id="pv" label="Prévia com o preço"><select id="pv" value={preview} onChange={(e) => setPreview(Number(e.target.value))} className={adminInput}>{[399000, 799000, 999000].map((c) => <option key={c} value={c}>{money(c)}</option>)}</select></F>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1 font-normal">Parcelas</th><th className="py-1 font-normal">Acréscimo (%)</th><th className="py-1 font-normal">Parcela</th><th className="py-1 font-normal">Total</th></tr></thead>
            <tbody>
              {ns.filter((n) => Number(n) <= max).map((n) => {
                const it = plan.find((x) => x.n === Number(n));
                return (
                  <tr key={n} className="border-t border-border">
                    <td className="py-1.5">{n}x</td>
                    <td className="py-1.5"><label className="sr-only" htmlFor={`r${n}`}>Acréscimo em {n}x</label>
                      <input id={`r${n}`} inputMode="decimal" value={rates[n] ?? ""} placeholder="—" onChange={(e) => setRates({ ...rates, [n]: e.target.value })} className="h-9 w-20 rounded-md border border-input bg-card px-2" /></td>
                    <td className="py-1.5">{it ? money(it.perCents) : "—"}</td>
                    <td className="py-1.5 text-muted-foreground">{it ? money(it.totalCents) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="buy" className="h-11" onClick={() => {
            if (Object.values(parsed).some((v) => !Number.isFinite(v) || v < 0 || v > 100)) return void toast.error("Use percentuais entre 0 e 100.");
            save({ installments_max: max, installment_rates: parsed as never });
          }}>Salvar parcelamento</Button>
          <Button variant="outline" className="h-11" onClick={() => setRates(Object.fromEntries(Object.entries(DEFAULT_RATES).map(([k, v]) => [k, String(v).replace(".", ",")])))}>Restaurar padrão (23% em 21x, proporcional)</Button>
        </div>
      </Box>
    </>
  );
}

function MetaTab({ s }: { s: S }) {
  const save = useSaveSettings();
  const status = useServerFn(getMetaStatus); const saveToken = useServerFn(saveMetaToken);
  const qc = useQueryClient();
  const m = useQuery({ queryKey: ["admin", "meta"], queryFn: () => status() });
  const [pixel, setPixel] = useState(s.meta_pixel_id);
  const [test, setTest] = useState(s.meta_test_event_code);
  const [token, setToken] = useState("");
  const [replacing, setReplacing] = useState(false);
  return (
    <>
      <Box title="Pixel da Meta (Facebook/Instagram)">
        <div className="space-y-3">
          <F id="px" label="ID do Pixel / conjunto de dados" hint="Só números. Gerenciador de Eventos → Fontes de dados → seu Pixel."><input id="px" inputMode="numeric" value={pixel} onChange={(e) => setPixel(e.target.value.replace(/\D/g, ""))} className={adminInput} /></F>
          <F id="tc" label="Código de evento de teste (opcional)" hint="Use só enquanto testa em Eventos de teste. Depois apague."><input id="tc" value={test} onChange={(e) => setTest(e.target.value)} className={adminInput} /></F>
          <Button variant="buy" className="h-11" onClick={() => save({ meta_pixel_id: pixel.trim(), meta_test_event_code: test.trim() })}>Salvar</Button>
        </div>
      </Box>
      <Box title="API de Conversões (token)">
        {m.isPending ? <div className="h-11 animate-pulse rounded bg-muted" /> : m.data?.hasToken && !replacing ? (
          <div className="flex items-center gap-2"><span className="flex h-11 flex-1 items-center rounded-md border border-input bg-muted px-3 font-mono">•••• {m.data.last4}</span><Button type="button" variant="outline" className="h-11" onClick={() => setReplacing(true)}>Substituir</Button></div>
        ) : (
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={async (e) => {
            e.preventDefault();
            try { const r = await saveToken({ data: { token: token.trim() } }); if (r.ok) { toast.success("Token salvo."); setToken(""); setReplacing(false); qc.invalidateQueries({ queryKey: ["admin", "meta"] }); } }
            catch { toast.error("Token inválido."); }
          }}>
            <label htmlFor="tk" className="sr-only">Token da API de Conversões</label>
            <input id="tk" type="password" autoComplete="off" placeholder="Cole o token gerado no Gerenciador de Eventos" value={token} onChange={(e) => setToken(e.target.value)} className={adminInput} />
            <Button type="submit" variant="buy" className="h-11">Salvar token</Button>
          </form>
        )}
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>O site envia <strong>PageView</strong>, <strong>ViewContent</strong>, <strong>InitiateCheckout</strong> e <strong>AddPaymentInfo</strong> pelo Pixel.</li>
          <li>A <strong>compra (Purchase)</strong> vai pelo Pixel e pela API de Conversões, com o mesmo ID para não contar em dobro. Ela é enviada quando o Pix é aprovado ou quando o sinal do pague na entrega é pago.</li>
          <li>Tudo só acontece se o cliente aceitar o aviso de cookies.</li>
        </ul>
      </Box>
    </>
  );
}

function ShippingTab({ s }: { s: S }) {
  const save = useSaveSettings();
  const [radius, setRadius] = useState(String(s.free_shipping_radius_km));
  const [factor, setFactor] = useState(String(s.road_factor).replace(".", ","));
  const [extra, setExtra] = useState(s.extra_km_price_cents == null ? "" : String(s.extra_km_price_cents / 100).replace(".", ","));
  const [eta, setEta] = useState(s.delivery_estimate_text);
  const [codKm, setCodKm] = useState(String(s.pay_on_delivery_max_km));
  const [wa, setWa] = useState(s.whatsapp_number);
  const num = (v: string) => Number(v.replace(",", "."));
  return (
    <Box title="Frete e loja">
      <div className="grid gap-3 sm:grid-cols-2">
        <F id="r" label="Raio de frete grátis (km)"><input id="r" inputMode="decimal" value={radius} onChange={(e) => setRadius(e.target.value)} className={adminInput} /></F>
        <F id="rf" label="Fator de estrada" hint="Linha reta × este número ≈ distância por estrada."><input id="rf" inputMode="decimal" value={factor} onChange={(e) => setFactor(e.target.value)} className={adminInput} /></F>
        <F id="ex" label="Preço por km extra (R$)" hint="Vazio = frete a combinar fora do raio."><input id="ex" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} className={adminInput} /></F>
        <F id="eta" label="Prazo de entrega (texto)"><input id="eta" value={eta} onChange={(e) => setEta(e.target.value)} className={adminInput} /></F>
        <F id="ck" label="Limite de km do pagar na entrega"><input id="ck" inputMode="decimal" value={codKm} onChange={(e) => setCodKm(e.target.value)} className={adminInput} /></F>
        <F id="wa" label="WhatsApp da loja" hint="Com 55 + DDD, ex.: 5538999999999. Vazio esconde os botões."><input id="wa" inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)} className={adminInput} /></F>
      </div>
      <Button variant="buy" className="mt-4 h-11" onClick={() => {
        const vals = { free_shipping_radius_km: num(radius), road_factor: num(factor), pay_on_delivery_max_km: num(codKm) };
        if (Object.values(vals).some((x) => !Number.isFinite(x))) return void toast.error("Confira os números.");
        save({ ...vals, extra_km_price_cents: extra.trim() ? Math.round(num(extra) * 100) : null, delivery_estimate_text: eta, whatsapp_number: wa });
      }}>Salvar</Button>
    </Box>
  );
}
