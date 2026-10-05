import { useState } from "react";
import { Link } from "react-router-dom";

function PricingPage({ dark, onToggleTheme }) {
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isYearly = billingCycle === "yearly";

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const pricingFaqs = [
    {
      q: "How does the 14-day free trial work?",
      a: "When you sign up, you get complete access to all features for 14 days without entering any payment or credit card details. You can explore the ledger, record trade orders, and test reports completely risk-free.",
    },
    {
      q: "How is the 17% yearly discount calculated?",
      a: "With our annual billing option, you only pay for 10 months and receive 12 full months of access — that is 2 full months free (16.7% ~ 17% savings).",
    },
    {
      q: "Can I upgrade or switch plans later?",
      a: "Yes! You can upgrade from Starter to Budget or Premium at any time. Your existing orders, parties, quality master data, and ledger records remain completely intact and transition seamlessly.",
    },
    {
      q: "What payment methods do you accept?",
      a: "We support all major Indian payment methods including UPI (Google Pay, PhonePe, Paytm), Net Banking, Credit/Debit cards, and business accounts.",
    },
    {
      q: "What happens after my 14-day free trial ends?",
      a: "You will be prompted to pick a subscription plan to continue recording new orders and accessing premium tools. Your recorded data will never be deleted.",
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

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium muted-text">
            <Link to="/" className="hover:text-[var(--color-text)] transition-colors">
              Home
            </Link>
            <a href="#plans" className="text-[var(--color-accent)] font-semibold">
              Plans & Pricing
            </a>
            <a href="#comparison" className="hover:text-[var(--color-text)] transition-colors">
              Feature Matrix
            </a>
            <a href="#faq" className="hover:text-[var(--color-text)] transition-colors">
              Pricing FAQs
            </a>
            <Link to="/privacy" className="hover:text-[var(--color-text)] transition-colors">
              Privacy Policy
            </Link>
          </nav>

          {/* Actions */}
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
              Start Free Trial
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

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 space-y-3 shadow-lg">
            <nav className="flex flex-col space-y-1 text-sm font-medium">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors"
              >
                Home
              </Link>
              <a
                href="#plans"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-semibold"
              >
                Plans & Pricing
              </a>
              <a
                href="#comparison"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors"
              >
                Feature Matrix
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)] transition-colors"
              >
                Pricing FAQs
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
            </nav>
            <div className="pt-2 border-t border-[var(--color-border)]">
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="primary-btn text-xs py-2.5 text-center flex items-center justify-center gap-1.5"
              >
                <span>Start 14-Day Free Trial</span>
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
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20 text-[var(--color-accent)] text-xs font-semibold mb-5">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            14-Day Risk-Free Trial on All Plans &bull; No Credit Card Required
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight max-w-4xl mx-auto">
            Transparent Pricing Built for{" "}
            <span className="text-[var(--color-accent)]">Growing Brokers</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base muted-text max-w-2xl mx-auto leading-relaxed">
            Choose the plan that fits your brokerage volume. Upgrade, downgrade, or cancel anytime with zero hidden fees.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center p-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                !isYearly
                  ? "bg-[var(--color-accent)] text-white shadow-sm"
                  : "muted-text hover:text-[var(--color-text)]"
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                isYearly
                  ? "bg-[var(--color-accent)] text-white shadow-sm"
                  : "muted-text hover:text-[var(--color-text)]"
              }`}
            >
              <span>Yearly Billing</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase transition-all ${
                  isYearly
                    ? "bg-amber-300 text-amber-950 shadow-sm"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                }`}
              >
                Save 17% (2 Mo Free)
              </span>
            </button>
          </div>
        </section>

        {/* 3 Pricing Cards */}
        <section id="plans" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Plan 1: Starter */}
            <div className="auth-card !p-6 sm:!p-8 flex flex-col justify-between hover:border-[var(--color-accent)]/50 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Starter</h3>
                  <span className="text-[11px] font-semibold muted-text bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-0.5 rounded-full">
                    Entry Pack
                  </span>
                </div>
                <p className="text-xs muted-text mt-2">
                  Essential digital ledger for individual brokers starting out.
                </p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold">
                      {isYearly ? "₹990" : "₹99"}
                    </span>
                    <span className="text-xs muted-text">
                      {isYearly ? "/ year" : "/ month"}
                    </span>
                  </div>
                  <p className="text-[11px] muted-text mt-1">
                    {isYearly ? "₹82.5/mo • Save ₹198 (17% off)" : "Billed monthly"}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--color-border)] space-y-3 text-xs">
                  <div className="font-semibold uppercase tracking-wider text-[10px] text-[var(--color-accent)]">
                    What's Included:
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Full Sauda & Order Creation (Takka, Lot, Meter)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Order Progress & Dispatch Tracking</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Commission & Payment Due Records</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Direct WhatsApp Share for Sauda Slips</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Multi-Device Sync (Mobile + Desktop PWA)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Excel (.xlsx) Report Downloads (Up to 30/mo)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Multi-Financial Year Support</span>
                  </div>
                  <div className="flex items-start gap-2.5 muted-text opacity-50">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 stroke-2 fill-none stroke-current">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Branded PDF Statement Exports</span>
                  </div>
                  <div className="flex items-start gap-2.5 muted-text opacity-50">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 stroke-2 fill-none stroke-current">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>100% Ad-Free Experience</span>
                  </div>
                  <div className="flex items-start gap-2.5 muted-text opacity-50">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 stroke-2 fill-none stroke-current">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Market Directory Search & Leads</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                <Link
                  to="/signup"
                  className="ghost-btn !w-full text-center text-xs py-2.5 font-semibold block hover:border-[var(--color-accent)]"
                >
                  Start 14-Day Free Trial
                </Link>
              </div>
            </div>

            {/* Plan 2: Budget Pack / Growth (Most Popular) */}
            <div className="auth-card !p-6 sm:!p-8 flex flex-col justify-between relative border-2 !border-[var(--color-accent)] shadow-xl bg-gradient-to-b from-[var(--color-accent-soft)]/20 to-[var(--color-surface)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-extrabold uppercase tracking-wide shadow-md">
                Most Popular &bull; Mid Range
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Growth / Budget</h3>
                  <span className="text-[11px] font-semibold text-[var(--color-accent)] bg-[var(--color-accent-soft)] border border-[var(--color-accent)]/20 px-2.5 py-0.5 rounded-full">
                    Active Traders
                  </span>
                </div>
                <p className="text-xs muted-text mt-2">
                  High-speed, 100% ad-free experience with professional PDF statements.
                </p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-[var(--color-accent)]">
                      {isYearly ? "₹2,990" : "₹299"}
                    </span>
                    <span className="text-xs muted-text">
                      {isYearly ? "/ year" : "/ month"}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--color-accent)] mt-1">
                    {isYearly ? "₹249/mo • Save ₹598 (17% off)" : "Billed monthly"}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--color-border)] space-y-3 text-xs">
                  <div className="font-semibold text-[var(--color-accent)] uppercase tracking-wider text-[10px]">
                    Everything in Starter, plus:
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-semibold">100% Ad-Free (Zero Distractions)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-semibold">Zero Load Time (Priority Fast Server)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-semibold">Branded PDF Reports & Statements (Print-Ready Downloads)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Direct WhatsApp Share for Sauda Slips</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Expanded Report Limit (150 Exports/mo)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Priority High-Speed Server & Email Support</span>
                  </div>
                  <div className="flex items-start gap-2.5 muted-text opacity-50">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 stroke-2 fill-none stroke-current">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Visual Analytics Dashboard</span>
                  </div>
                  <div className="flex items-start gap-2.5 muted-text opacity-50">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 stroke-2 fill-none stroke-current">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    <span>Market Directory Search & Leads</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                <Link
                  to="/signup"
                  className="primary-btn !w-full text-center text-xs py-2.5 font-bold block shadow-md"
                >
                  Start 14-Day Free Trial
                </Link>
              </div>
            </div>

            {/* Plan 3: Premium (Best Value) */}
            <div className="auth-card !p-6 sm:!p-8 flex flex-col justify-between hover:border-[var(--color-accent)]/50 transition-all">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Premium</h3>
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                    Power Trader
                  </span>
                </div>
                <p className="text-xs muted-text mt-2">
                  Full power with Market Directory discovery & deep analytics.
                </p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold">
                      {isYearly ? "₹3,990" : "₹399"}
                    </span>
                    <span className="text-xs muted-text">
                      {isYearly ? "/ year" : "/ month"}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1">
                    {isYearly ? "₹332/mo • Save ₹798 (17% off)" : "Billed monthly"}
                  </p>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--color-border)] space-y-3 text-xs">
                  <div className="font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider text-[10px]">
                    Everything in Growth, plus:
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-semibold">Full Analytics & Visual Turnover Trends</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-semibold">Market Directory (Buyer & Seller Leads)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-semibold">Filter Parties by Quality & Contact No.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Direct WhatsApp Lead Connect Button</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="font-semibold">Unlimited PDF & Excel Exports</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--color-accent)] shrink-0 stroke-2 fill-none stroke-current">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Priority WhatsApp & Phone Support</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                <Link
                  to="/signup"
                  className="ghost-btn !w-full text-center text-xs py-2.5 font-semibold block hover:border-[var(--color-accent)]"
                >
                  Start 14-Day Free Trial
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Comparison Matrix */}
        <section id="comparison" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              Detailed Breakdown
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1">
              Plan Comparison Matrix
            </h2>
            <p className="text-xs sm:text-sm muted-text mt-2">
              Side-by-side feature comparison across all 3 tiers
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] muted-text font-semibold">
                  <th className="p-4 sm:px-6">Feature</th>
                  <th className="p-4 text-center">Starter (₹99)</th>
                  <th className="p-4 text-center bg-[var(--color-accent-soft)]/20 text-[var(--color-accent)] font-bold">
                    Growth (₹299)
                  </th>
                  <th className="p-4 text-center">Premium (₹399)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Sauda Booking & Orders</td>
                  <td className="p-4 text-center">Unlimited</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10 font-medium">Unlimited</td>
                  <td className="p-4 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Order Progress & Lot Carry-Forward</td>
                  <td className="p-4 text-center">Included</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10 font-medium">Included</td>
                  <td className="p-4 text-center">Included</td>
                </tr>
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Payment & Commission Ledger</td>
                  <td className="p-4 text-center">Included</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10 font-medium">Included</td>
                  <td className="p-4 text-center">Included</td>
                </tr>
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Ad-Free Experience</td>
                  <td className="p-4 text-center muted-text opacity-70">Standard Ads</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10 font-semibold text-[var(--color-accent)]">
                    100% Ad-Free
                  </td>
                  <td className="p-4 text-center font-semibold text-[var(--color-accent)]">100% Ad-Free</td>
                </tr>
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Server Speed & Load Times</td>
                  <td className="p-4 text-center">Standard</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10 font-semibold text-[var(--color-accent)]">
                    Zero Load Time
                  </td>
                  <td className="p-4 text-center font-semibold text-[var(--color-accent)]">Zero Load Time</td>
                </tr>
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Report Format Support</td>
                  <td className="p-4 text-center">Excel Only</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10 font-medium">Excel + PDF</td>
                  <td className="p-4 text-center font-medium">Excel + PDF</td>
                </tr>
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Monthly Export Limit</td>
                  <td className="p-4 text-center">30 / month</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10">150 / month</td>
                  <td className="p-4 text-center font-semibold text-[var(--color-accent)]">Unlimited</td>
                </tr>
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Analytics & Revenue Charts</td>
                  <td className="p-4 text-center muted-text opacity-50">&mdash;</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10 muted-text opacity-50">&mdash;</td>
                  <td className="p-4 text-center font-semibold text-[var(--color-accent)]">Full Access</td>
                </tr>
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Market Directory (Buyer & Seller Leads)</td>
                  <td className="p-4 text-center muted-text opacity-50">&mdash;</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10 muted-text opacity-50">&mdash;</td>
                  <td className="p-4 text-center font-semibold text-[var(--color-accent)]">Full Access (WhatsApp connect)</td>
                </tr>
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Direct WhatsApp Share for Sauda Slips</td>
                  <td className="p-4 text-center">Included</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10 font-medium">Included</td>
                  <td className="p-4 text-center">Included</td>
                </tr>
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Multi-Device PWA Cloud Sync</td>
                  <td className="p-4 text-center">Included</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10 font-medium">Included</td>
                  <td className="p-4 text-center">Included</td>
                </tr>
                <tr>
                  <td className="p-4 sm:px-6 font-medium">Support SLA</td>
                  <td className="p-4 text-center">Standard Email</td>
                  <td className="p-4 text-center bg-[var(--color-accent-soft)]/10">Priority Email</td>
                  <td className="p-4 text-center font-semibold">Priority WhatsApp & Phone</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Pricing FAQs Section */}
        <section id="faq" className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                Common Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold mt-1">
                Pricing Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {pricingFaqs.map((faq, index) => (
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
                  <h3 className="text-sm sm:text-base font-semibold">Need a custom plan or firm deployment?</h3>
                  <p className="text-xs muted-text mt-0.5">We offer custom packages for multi-broker partnerships and textile firms.</p>
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
              Start Your 14-Day Free Trial Today
            </h2>
            <p className="mt-3 text-sm sm:text-base muted-text max-w-2xl mx-auto">
              No credit card required. Experience faster, zero-discrepancy ledger accounting for your brokerage business.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="primary-btn !w-full sm:!w-auto text-sm sm:text-base py-3 px-8 shadow-md"
              >
                Get Started Free
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

      {/* Footer */}
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
            <Link to="/" className="text-link">Home</Link>
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

export default PricingPage;

