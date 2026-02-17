function ThemeToggle({ dark, onToggleTheme, className = "" }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={onToggleTheme}
      className={`relative inline-flex h-10 w-20 items-center rounded-full border border-border bg-surface px-1 transition-colors ${className}`}
    >
      <span className="ml-2 text-muted">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
          <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
        </svg>
      </span>
      <span className="ml-auto mr-2 text-muted">
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
        </svg>
      </span>

      <span
        className={`absolute left-1 flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-sm transition-transform ${
          dark ? "translate-x-10" : "translate-x-0"
        }`}
      >
        {dark ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
            <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
          </svg>
        )}
      </span>
    </button>
  );
}

export default ThemeToggle;
