import { connection } from "next/server";
import { App } from "@/components/App";
import { Logo } from "@/components/ui/Logo";

export default async function Home() {
  // Rendered per request so the CSP nonce set in proxy.ts is applied to Next's scripts.
  await connection();

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Logo />
          <div>
            <p className="font-display text-xl font-bold leading-tight">SaafSaans</p>
            <p className="text-sm text-muted">Breathe easier through smog season</p>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl px-4 py-6 focus:outline-none">
        <App />
      </main>
      <footer className="mt-12 border-t border-line bg-surface">
        <div className="mx-auto max-w-5xl space-y-2 px-4 py-6 text-sm text-muted">
          <p>
            <strong className="text-ink">Not medical advice.</strong> For severe breathlessness,
            chest pain, blue lips or confusion, call{" "}
            <a className="font-bold text-ink underline" href="tel:112">
              112
            </a>{" "}
            immediately.
          </p>
          <p>
            Air data: Open-Meteo / Copernicus CAMS forecast (CC BY 4.0). AQI follows the CPCB
            National AQI method applied to hourly values. Impact figures are transparent estimates
            from published emission factors.
          </p>
          <p>Your household profile is stored only in this browser.</p>
        </div>
      </footer>
    </>
  );
}
