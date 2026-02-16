function AuthLayout({ title, subtitle, children, dark, onToggleTheme }) {
  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center py-5 sm:py-8 md:px-6">
        <section className="auth-card w-full max-w-xl">
          <div className="mb-6 flex items-start justify-between gap-3 sm:mb-7 sm:gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] muted-text">Ledger Client</p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed muted-text">{subtitle}</p>
            </div>
            <button type="button" onClick={onToggleTheme} className="ghost-btn whitespace-nowrap">
              {dark ? "Light" : "Dark"}
            </button>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
