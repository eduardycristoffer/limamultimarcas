import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/api";
import { loadPixel, setConsent, useConsent } from "@/lib/meta-pixel";

/**
 * Aviso de cookies (LGPD). Só aparece quando há um Pixel da Meta configurado no painel.
 * O Pixel só é carregado depois do "Aceitar".
 */
export function ConsentBanner() {
  const { data: s } = useQuery(settingsQuery);
  const consent = useConsent();
  const pixelId = s?.meta_pixel_id ?? "";
  useEffect(() => { if (pixelId && consent === "granted") loadPixel(pixelId); }, [pixelId, consent]);
  if (!pixelId || consent !== null) return null;
  return (
    <div role="region" aria-label="Aviso de cookies" className="fixed inset-x-2 bottom-[72px] z-40 mx-auto max-w-lg rounded-md bg-card p-4 text-[13px] shadow-[0_8px_30px_rgba(0,0,0,0.25)] md:bottom-4">
      <p>Usamos cookies para medir nossos anúncios e melhorar sua experiência. Veja a <Link to="/privacidade" className="text-link">política de privacidade</Link>.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setConsent("granted")} className="h-10 flex-1 rounded-md bg-primary font-semibold text-primary-foreground">Aceitar</button>
        <button type="button" onClick={() => setConsent("denied")} className="h-10 flex-1 rounded-md bg-primary-soft font-semibold text-primary">Recusar</button>
      </div>
    </div>
  );
}
