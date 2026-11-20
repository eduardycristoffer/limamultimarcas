import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import logo from "@/assets/logo-lima.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { adminExists, bootstrapAdmin } from "@/lib/store.functions";
import { Button } from "@/components/ui/button";
import { adminInput } from "@/components/admin/AdminShell";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar no painel — Lima Multimarcas" },
      { name: "description", content: "Acesso restrito ao painel da Lima Multimarcas." },
      { property: "og:title", content: "Painel — Lima Multimarcas" },
      { property: "og:description", content: "Acesso restrito." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const exists = useQuery({ queryKey: ["admin-exists"], queryFn: () => adminExists() });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const creating = exists.data?.exists === false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (creating) {
        if (password.length < 8) { toast.error("A senha precisa ter pelo menos 8 caracteres."); return; }
        const r = await bootstrapAdmin({ data: { email, password } });
        if (!r.ok) { toast.error(r.error); exists.refetch(); return; }
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error("E-mail ou senha incorretos."); return; }
      navigate({ to: "/admin" });
    } catch { toast.error("Não foi possível entrar agora."); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-gradient px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg bg-card p-6 shadow-card-hover">
        <img src={logo.url} alt="Logo Lima Multimarcas" width={56} height={56} className="mx-auto h-14 w-14 object-contain" />
        <h1 className="mt-3 text-center text-xl font-bold">{creating ? "Criar administrador" : "Entrar no painel"}</h1>
        {creating && <p className="mt-1 text-center text-sm text-muted-foreground">Primeiro acesso: crie a conta do dono da loja. Depois disso, o cadastro fica fechado.</p>}
        {exists.isPending ? <div className="mt-6 h-32 animate-pulse rounded bg-muted" /> : exists.isError ? <p className="mt-6 text-center text-sm text-destructive">Não foi possível verificar o acesso. Atualize a página.</p> : (
          <div className="mt-5 space-y-3">
            <div><label htmlFor="email" className="mb-1 block text-sm font-medium">E-mail</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={adminInput} /></div>
            <div><label htmlFor="pw" className="mb-1 block text-sm font-medium">Senha</label><input id="pw" type="password" autoComplete={creating ? "new-password" : "current-password"} required minLength={creating ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)} className={adminInput} /></div>
            <Button type="submit" variant="buy" size="xl" disabled={busy}>{busy ? "Aguarde..." : creating ? "Criar e entrar" : "Entrar"}</Button>
          </div>
        )}
      </form>
    </div>
  );
}
