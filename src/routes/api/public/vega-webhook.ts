import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/vega-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const s = new URL(request.url).searchParams.get("s");
        let payload: unknown = null;
        try { payload = JSON.parse((await request.text()).slice(0, 100_000)); } catch { return new Response("bad request", { status: 400 }); }
        const deps = await import("@/lib/store.server");
        const { handleVegaWebhook } = await import("@/lib/webhook.server");
        try {
          const r = await handleVegaWebhook(s, payload, deps);
          return Response.json({ ok: r.status === 200 }, { status: r.status });
        } catch {
          console.error("vega webhook processing failed");
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
