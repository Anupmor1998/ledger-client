import { Link } from "react-router-dom";

function TermsOfServicePage({ dark, onToggleTheme }) {
  return (
    <div className="app-shell min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center shrink-0">
            <img
              src="/logo.png"
              alt="Sauda Book"
              className="h-8 sm:h-9 w-auto object-contain dark:hidden"
            />
            <img
              src="/logo-dark.png"
              alt="Sauda Book"
              className="h-8 sm:h-9 w-auto object-contain hidden dark:block"
            />
          </Link>

          <div className="flex items-center gap-3">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="ghost-btn p-2 text-xs flex items-center gap-1.5"
                title="Toggle Theme"
                aria-label="Toggle theme"
              >
                {dark ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>
            )}
            <Link to="/" className="primary-btn !w-auto text-xs py-2 px-3.5">
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12">
        <div className="auth-card space-y-6">
          <div className="border-b border-[var(--color-border)] pb-5">
            <span className="text-xs uppercase tracking-wider font-semibold text-[var(--color-accent)]">
              Terms of Agreement
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Terms of Service</h1>
            <p className="text-xs sm:text-sm muted-text mt-1">
              Effective Date: January 1, 2026 &bull; Last Updated: October 2026
            </p>
          </div>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">1. Acceptance of Terms</h2>
            <p className="muted-text">
              By accessing or using <strong>Sauda Book</strong> (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not access or use the application.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">2. Service Description</h2>
            <p className="muted-text">
              Sauda Book is a modern digital ledger and brokerage management platform. The platform provides software tools for recording commercial trade saudas, lot and meter conversions, commission reconciliations, payment due tracking, and business market directory discovery.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">3. User Accounts & Responsibilities</h2>
            <p className="muted-text">
              To use the Service, you must create an account with accurate and verifiable details. You are responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 muted-text">
              <li>Maintaining the confidentiality of your login credentials and passwords.</li>
              <li>Ensuring all trade entries, quantities, and phone records entered into the directory are legitimate and accurate.</li>
              <li>All activities occurring under your authenticated session.</li>
            </ul>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">4. Proprietary Rights & Ownership</h2>
            <p className="muted-text">
              You retain all ownership rights and control over your trade order entries, party names, rates, and ledger accounts entered into the platform. We retain all rights, titles, and interests in the underlying software, branding, database architectures, and interface designs.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">5. Advertising & Third-Party Services</h2>
            <p className="muted-text">
              The Service may feature advertisements provided by Google AdSense and third-party ad networks. We are not responsible for the availability, content, or accuracy of third-party advertisements or products advertised therein.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">6. Limitation of Liability</h2>
            <p className="muted-text">
              The Service is provided on an "as is" and "as available" basis. While we strive for maximum accuracy in all calculations, users are advised to verify order rates, commission balances, and delivery terms independently before finalizing high-value commercial trade settlements.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">7. Contact Information</h2>
            <p className="muted-text">
              For any questions regarding these Terms of Service, please reach out to our team at:
            </p>
            <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs sm:text-sm">
              <p><strong>Email:</strong> <a href="mailto:saudabook2026@gmail.com" className="text-link">saudabook2026@gmail.com</a></p>
              <p className="mt-1"><strong>Service:</strong> Sauda Book</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-6 text-xs text-center muted-text">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>&copy; {new Date().getFullYear()} Sauda Book. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="text-link">Pricing</Link>
            <Link to="/privacy" className="text-link">Privacy Policy</Link>
            <Link to="/" className="text-link">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default TermsOfServicePage;
