function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center py-5 sm:py-8 md:px-6">
        <section className="auth-card w-full max-w-xl">
          <div className="mb-6 sm:mb-7">
            <div className="mb-3">
              <img
                src="/logo.png"
                alt="Sauda Book"
                className="h-10 w-auto object-contain dark:hidden"
              />
              <img
                src="/logo-dark.png"
                alt="Sauda Book"
                className="h-10 w-auto object-contain hidden dark:block"
              />
            </div>
            <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed muted-text">
              {subtitle}
            </p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
