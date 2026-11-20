import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/ml/TopBar";
import { BottomNav, SiteFooter } from "@/components/ml/Chrome";
import { setConsent } from "@/lib/meta-pixel";
import { store } from "@/config/store";
import { catalogQuery, settingsQuery } from "@/lib/api";

export const Route = createFileRoute("/privacidade")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(catalogQuery), context.queryClient.ensureQueryData(settingsQuery)]),
  head: () => ({
    meta: [
      { title: "Privacidade — Lima Multimarcas" },
      { name: "description", content: "Como a Lima Multimarcas usa seus dados e cookies." },
      { property: "og:title", content: "Privacidade — Lima Multimarcas" },
      { property: "og:description", content: "Como usamos seus dados e cookies." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <TopBar variant="page" />
      <main className="mx-auto max-w-2xl p-3 md:py-6">
        <article className="space-y-4 rounded-md bg-card p-5 text-[15px] leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.12)]">
          <h1 className="text-[22px] font-normal">Privacidade</h1>
          <section><h2 className="font-semibold">Dados do pedido</h2><p>Nome, CPF, e-mail, celular e endereço são usados só para registrar o pedido, gerar o pagamento e combinar a entrega com você.</p></section>
          <section><h2 className="font-semibold">Pagamentos</h2><p>O Pix e o cartão são processados pela Vega Checkout. Não guardamos dados de cartão.</p></section>
          <section><h2 className="font-semibold">Localização</h2><p>Para sugerir a cidade de entrega, usamos a localização aproximada que o próprio provedor de hospedagem informa a partir do seu acesso. Não guardamos seu IP para isso. O CEP que você digita fica salvo só neste aparelho.</p></section>
          <section><h2 className="font-semibold">Cookies de anúncios</h2><p>Se você aceitar, usamos o Pixel da Meta (Facebook/Instagram) para medir nossos anúncios. Sem o seu aceite, ele não é carregado.</p>
            <button type="button" onClick={() => setConsent("denied")} className="mt-2 text-link">Recusar cookies de anúncios</button></section>
          <section><h2 className="font-semibold">Contato</h2><p>{store.name} · {store.address}.</p></section>
        </article>
      </main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}
