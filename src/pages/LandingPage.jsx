import { useState } from "react";
import { Link } from "react-router-dom";

function LandingPage({ dark, onToggleTheme }) {
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "What is Sauda Book and who is it designed for?",
      a: "Sauda Book is a modern digital ledger and trade management platform built specifically for commercial brokers, commission agents, and traders. It automates order bookings, lot-to-meter conversions, commission reconciliations, and party ledgers in one secure cloud workspace.",
    },
    {
      q: "How does commission calculation work in Sauda Book?",
      a: "Sauda Book automatically calculates broker commissions based on your defined base rates, percentages, or quantity units (such as Takka, Lot, or Meter). When deliveries are recorded, commissions are instantly calculated and logged into the party's ledger balance.",
    },
    {
      q: "Can I use Sauda Book on my mobile phone?",
      a: "Yes! Sauda Book is an installable Progressive Web App (PWA). You can install it directly onto your Android, iPhone, or iPad home screen for a fast, app-like experience with instant cloud synchronization.",
    },
    {
      q: "How does the Market Directory work?",
      a: "The Market Directory allows you to discover and manage verified buyer and seller contact leads with standardized 10-digit Indian phone number validation, helping you expand your trade network with genuine partners.",
    },
    {
      q: "Is my trade and party data secure and private?",
      a: "Absolutely. All data transmissions are encrypted using 256-bit SSL encryption. Your orders, commission terms, and party lists remain strictly private and accessible only to your authenticated account.",
    },
  ];

  return (
    <div className="app-shell min-h-screen flex flex-col selection:bg-[var(--color-accent)] selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center shrink-0"
          >
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

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium muted-text">
            <a href="#features" className="hover:text-[var(--color-text)] transition-colors">
              Features
            </a>
            <a href="#workflow" className="hover:text-[var(--color-text)] transition-colors">
              How It Works
            </a>
            <a href="#directory" className="hover:text-[var(--color-text)] transition-colors">
              Market Directory
            </a>
            <a href="#faq" className="hover:text-[var(--color-text)] transition-colors">
              FAQs
            </a>
            <Link to="/privacy" className="hover:text-[var(--color-text)] transition-colors">
              Privacy Policy
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="ghost-btn p-2 text-xs flex items-center gap-1"
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

            <Link
              to="/login"
              className="hidden sm:inline-flex text-xs sm:text-sm font-semibold muted-text hover:text-[var(--color-text)] px-3 py-2 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="hidden sm:inline-flex primary-btn !w-auto text-xs sm:text-sm py-2 px-4 shadow-sm"
            >
              Get Started
            </Link>

            <Link
              to="/login"
              className="sm:hidden text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--color-border)]"
            >
              Sign In
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="md:hidden ghost-btn p-2 text-xs flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 space-y-3 shadow-lg">
            <nav className="flex flex-col space-y-1 text-sm font-medium">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors"
              >
                Features
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors"
              >
                How It Works
              </a>
              <a
                href="#directory"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors"
              >
                Market Directory
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors"
              >
                FAQs
              </a>
              <Link
                to="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                to="/terms"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors"
              >
                Terms of Service
              </Link>
              <a
                href="mailto:saudabook2026@gmail.com"
                className="px-3 py-2 rounded-lg hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-2 text-xs"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>Support: saudabook2026@gmail.com</span>
              </a>
            </nav>
            <div className="pt-2 border-t border-[var(--color-border)]">
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="primary-btn text-xs py-2.5 text-center flex items-center justify-center gap-1.5"
              >
                <span>Get Started Free</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-semibold mb-6">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Cloud-Based Trade & Brokerage Platform
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto">
            Manage Saudas, Commissions & Accounts with{" "}
            <span className="text-[var(--color-accent)]">Sauda Book</span>
          </h1>

          <p className="mt-5 text-sm sm:text-lg muted-text max-w-3xl mx-auto leading-relaxed">
            The all-in-one ledger platform designed to simplify order tracking, meter conversions, commission reconciliation, and verified market contacts with zero discrepancies.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              to="/signup"
              className="primary-btn !w-full sm:!w-auto text-sm sm:text-base py-3 px-7 flex items-center justify-center gap-2 shadow-md"
            >
              <span>Get Started Free</span>
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/login"
              className="ghost-btn !w-full sm:!w-auto text-sm sm:text-base py-3 px-6 flex items-center justify-center gap-2 font-medium"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Sign In to Your Workspace</span>
            </Link>
          </div>

          {/* Trust Highlights Row */}
          <div className="mt-10 pt-8 border-t border-[var(--color-border)] flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm muted-text">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] fill-none stroke-current stroke-2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>100% Secure Cloud Ledger</span>
            </div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] fill-none stroke-current stroke-2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Automated Meter Conversions</span>
            </div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] fill-none stroke-current stroke-2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Multi-Financial Year Support</span>
            </div>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] fill-none stroke-current stroke-2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Installable PWA App</span>
            </div>
          </div>

          {/* Interactive Visual Dashboard Preview Card */}
          <div className="mt-12 text-left">
            <div className="auth-card !p-5 sm:!p-7 shadow-xl rounded-2xl border border-[var(--color-border)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[var(--color-border)]">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                    Dashboard Overview
                  </span>
                  <h2 className="text-lg font-bold">Sauda Book Operations Hub</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                    <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-pulse"></span>
                    Live Sync Active
                  </span>
                </div>
              </div>

              {/* Sample Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 border-b border-[var(--color-border)]">
                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span className="text-xs muted-text block">Active Saudas</span>
                  <span className="text-2xl font-bold mt-1 block">142</span>
                  <span className="text-xs text-[var(--color-accent)] mt-0.5 block">
                    Lots in progress
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span className="text-xs muted-text block">Brokerage Due</span>
                  <span className="text-2xl font-bold mt-1 block">₹2,48,500</span>
                  <span className="text-xs text-[var(--color-accent)] mt-0.5 block">
                    Reconciled receivables
                  </span>
                </div>
                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                  <span className="text-xs muted-text block">Market Directory</span>
                  <span className="text-2xl font-bold mt-1 block">580+</span>
                  <span className="text-xs text-[var(--color-accent)] mt-0.5 block">
                    Verified trade parties
                  </span>
                </div>
              </div>

              {/* Sample Order Row Snippet */}
              <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs muted-text gap-2">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] fill-none stroke-current stroke-2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  <span>Sample Record: Order #SB-2048 &bull; Cotton 60s &bull; 100 Lots (10,000 Mtr)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-semibold">
                  Status: Completed
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                Core Capabilities
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold mt-1">
                Engineered for High-Volume Brokerage Accuracy
              </h2>
              <p className="mt-3 text-sm sm:text-base muted-text">
                Every calculation, unit conversion, and transaction trail is handled cleanly so you never lose track of a single paisa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="auth-card !p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold">Sauda & Order Tracking</h3>
                <p className="text-xs sm:text-sm muted-text leading-relaxed">
                  Record buyer, manufacturer, quality, lot numbers, meter length, and agreed rates with complete auditability.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="auth-card !p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3 className="text-base font-bold">Commission & Brokerage Ledger</h3>
                <p className="text-xs sm:text-sm muted-text leading-relaxed">
                  Auto-calculate brokerage per party, view net receivables, track payments received, and export clean party statements.
                </p>
              </div>

              {/* Feature 3 */}
              <div id="directory" className="auth-card !p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="text-base font-bold">Verified Market Directory</h3>
                <p className="text-xs sm:text-sm muted-text leading-relaxed">
                  Maintain your private business network of verified buyers and suppliers with standardized 10-digit Indian phone validation.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="auth-card !p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="text-base font-bold">Progress & Lot Rollover</h3>
                <p className="text-xs sm:text-sm muted-text leading-relaxed">
                  Track partial dispatches across multiple lots. Reopen, edit, or carry forward leftover quantities into the next financial cycle.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="auth-card !p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h3 className="text-base font-bold">Financial Year Switching</h3>
                <p className="text-xs sm:text-sm muted-text leading-relaxed">
                  Seamlessly organize your business records by Indian Financial Years (e.g. FY 2025-26, 2026-27) with continuous balance tracking.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="auth-card !p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                <h3 className="text-base font-bold">Mobile PWA & Cloud Backup</h3>
                <p className="text-xs sm:text-sm muted-text leading-relaxed">
                  Install Sauda Book as a standalone application on mobile or desktop. Your records are always backed up in secure cloud storage.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="workflow" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold mt-1">
              How Sauda Book Simplifies Your Day
            </h2>
            <p className="mt-3 text-sm sm:text-base muted-text">
              Three simple steps from initial contract booking to payment settlement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center space-y-3 p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="h-12 w-12 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-extrabold text-lg flex items-center justify-center mx-auto">
                1
              </div>
              <h3 className="text-base font-bold">Book the Sauda</h3>
              <p className="text-xs sm:text-sm muted-text leading-relaxed">
                Select buyer, manufacturer, fabric quality, and agreed rate. Enter quantity in lots, takka, or meters.
              </p>
            </div>

            <div className="text-center space-y-3 p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="h-12 w-12 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-extrabold text-lg flex items-center justify-center mx-auto">
                2
              </div>
              <h3 className="text-base font-bold">Track Dispatch Progress</h3>
              <p className="text-xs sm:text-sm muted-text leading-relaxed">
                Log dispatches as goods move. The system automatically computes remaining lots, converted meters, and live status.
              </p>
            </div>

            <div className="text-center space-y-3 p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
              <div className="h-12 w-12 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-extrabold text-lg flex items-center justify-center mx-auto">
                3
              </div>
              <h3 className="text-base font-bold">Reconcile & Settle</h3>
              <p className="text-xs sm:text-sm muted-text leading-relaxed">
                View automatic brokerage deductions, outstanding payments, and export ledger summaries for WhatsApp or print.
              </p>
            </div>
          </div>
        </section>

        {/* FAQs Section */}
        <section id="faq" className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 py-16 sm:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                Got Questions?
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold mt-1">
                Frequently Asked Questions
              </h2>
              <p className="mt-2 text-sm muted-text">
                Find answers to common questions about Sauda Book.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="auth-card !p-5 cursor-pointer transition-all"
                  onClick={() => toggleFaq(index)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-sm sm:text-base font-semibold">
                      {faq.q}
                    </h3>
                    <span className="text-[var(--color-accent)] shrink-0">
                      {openFaq === index ? (
                        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      )}
                    </span>
                  </div>
                  {openFaq === index && (
                    <p className="mt-3 text-xs sm:text-sm muted-text leading-relaxed border-t border-[var(--color-border)] pt-3">
                      {faq.a}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Direct Support Contact Card */}
            <div className="mt-8 p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold">Have more questions or need support?</h3>
                  <p className="text-xs muted-text mt-0.5">Reach out to our team anytime for onboarding help or feature queries.</p>
                </div>
              </div>
              <a
                href="mailto:saudabook2026@gmail.com"
                className="ghost-btn !w-full sm:!w-auto text-xs py-2 px-3.5 flex items-center justify-center gap-1.5 font-medium hover:border-[var(--color-accent)]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] fill-none stroke-current stroke-2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>saudabook2026@gmail.com</span>
              </a>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="auth-card !p-8 sm:!p-12 rounded-3xl bg-gradient-to-r from-[var(--color-accent-soft)] to-[var(--color-surface)] border border-[var(--color-border)]">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Ready to Modernize Your Ledger with Sauda Book?
            </h2>
            <p className="mt-3 text-sm sm:text-base muted-text max-w-2xl mx-auto">
              Join modern brokers and traders who track orders, lots, and commission balances with total peace of mind.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="primary-btn !w-full sm:!w-auto text-sm sm:text-base py-3 px-8 shadow-md"
              >
                Create Free Account
              </Link>
              <Link
                to="/login"
                className="ghost-btn !w-full sm:!w-auto text-sm sm:text-base py-3 px-7 font-medium"
              >
                Sign In to Workspace
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Public Footer Mandatory for Google AdSense Review */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)] py-8 text-xs muted-text">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-center sm:text-left">
            <span className="font-bold text-[var(--color-text)]">Sauda Book</span>
            <span>&copy; {new Date().getFullYear()}. All rights reserved.</span>
            <span className="hidden sm:inline">&bull;</span>
            <a
              href="mailto:saudabook2026@gmail.com"
              className="text-link inline-flex items-center justify-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>Support: saudabook2026@gmail.com</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6">
            <Link to="/privacy" className="text-link">Privacy Policy</Link>
            <Link to="/terms" className="text-link">Terms of Service</Link>
            <Link to="/login" className="text-link">Sign In</Link>
            <Link to="/signup" className="text-link">Create Account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
