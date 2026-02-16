import { useEffect, useState } from "react";

function App() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <main className="min-h-screen bg-bg text-text transition-colors">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
        <header className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm uppercase tracking-wide text-muted">Ledger Client</p>
          <h1 className="mt-2 text-3xl font-semibold">React + Vite + Tailwind Setup</h1>
          <p className="mt-3 text-muted">
            Theme is driven by CSS variables. Toggle below to test light/dark behavior.
          </p>
          <button
            type="button"
            onClick={() => setDark((prev) => !prev)}
            className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Switch to {dark ? "Light" : "Dark"} Theme
          </button>
        </header>
      </div>
    </main>
  );
}

export default App;
