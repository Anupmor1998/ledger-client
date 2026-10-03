import { Link } from "react-router-dom";

function PrivacyPolicyPage({ dark, onToggleTheme }) {
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
              Legal & Compliance
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">Privacy Policy</h1>
            <p className="text-xs sm:text-sm muted-text mt-1">
              Effective Date: January 1, 2026 &bull; Last Updated: October 2026
            </p>
          </div>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">1. Introduction</h2>
            <p className="muted-text">
              Welcome to <strong>Sauda Book</strong> ("we", "our", or "us"). We are committed to protecting your privacy and ensuring transparency regarding how information is handled when you use our web platform and digital brokerage ledger services. This Privacy Policy explains how information is collected, used, and safeguarded.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">2. Information We Collect</h2>
            <p className="muted-text">
              When you create an account and operate your brokerage ledger on our platform, we may collect:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 muted-text">
              <li><strong>Account Credentials:</strong> Name, business name, email address, contact phone number, and encrypted password.</li>
              <li><strong>Ledger & Commercial Records:</strong> Customer details, manufacturer information, sauda/order records, quality names, lot/meter numbers, brokerage rates, and payment tracking entries created within your private ledger.</li>
              <li><strong>Log & Technical Data:</strong> Browser type, operating system, IP address, device information, and access timestamps to ensure system reliability and security.</li>
            </ul>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">3. How We Use Your Information</h2>
            <p className="muted-text">
              The information we collect is used strictly to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 muted-text">
              <li>Provide, maintain, and securely host your digital ledger and brokerage calculations.</li>
              <li>Enable multi-device synchronization and PWA offline capability.</li>
              <li>Generate accurate brokerage commission calculations, outstanding payment reports, and invoice summaries.</li>
              <li>Prevent unauthorized access and detect fraudulent activity.</li>
            </ul>
          </section>

          <section className="space-y-3 text-sm leading-relaxed border-l-4 border-[var(--color-accent)] pl-4 py-1 bg-[var(--color-surface)] rounded-r-lg">
            <h2 className="text-base sm:text-lg font-bold">4. Third-Party Advertising & Cookies (Google AdSense)</h2>
            <p className="muted-text">
              We may display third-party advertisements on our platform via <strong>Google AdSense</strong>. Please review the following mandatory disclosures regarding third-party ad serving:
            </p>
            <ul className="list-disc pl-5 space-y-2 muted-text mt-2">
              <li>
                <strong>Third-Party Vendors:</strong> Google, as a third-party vendor, uses cookies to serve ads on our site.
              </li>
              <li>
                <strong>DoubleClick DART Cookie:</strong> Google's use of advertising cookies enables it and its partners to serve ads to our users based on their visit to our site and/or other sites on the Internet.
              </li>
              <li>
                <strong>Opt-Out Options:</strong> Users may opt out of personalized advertising by visiting{" "}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noreferrer"
                  className="text-link font-medium underline"
                >
                  Google Ads Settings
                </a>
                . Alternatively, you may opt out of third-party vendor use of cookies for personalized advertising by visiting{" "}
                <a
                  href="https://www.aboutads.info/choices/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-link font-medium underline"
                >
                  www.aboutads.info
                </a>
                .
              </li>
            </ul>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">5. Data Privacy & Confidentiality</h2>
            <p className="muted-text">
              Your trade orders, commission terms, party ledgers, and financial records are strictly private. We do not sell, rent, or trade your private business ledger data to third-party data brokers or marketing agencies.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">6. Data Security</h2>
            <p className="muted-text">
              We implement industry-standard 256-bit SSL encryption, tokenized authentication, secure database isolation, and role-based access controls to safeguard your account from unauthorized access, disclosure, or destruction.
            </p>
          </section>

          <section className="space-y-3 text-sm leading-relaxed">
            <h2 className="text-base sm:text-lg font-bold">7. Contact Us</h2>
            <p className="muted-text">
              If you have any questions, feedback, or concerns regarding this Privacy Policy or data protection, please contact us at:
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
            <Link to="/terms" className="text-link">Terms of Service</Link>
            <Link to="/" className="text-link">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PrivacyPolicyPage;
