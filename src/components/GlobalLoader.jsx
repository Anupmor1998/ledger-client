function GlobalLoader({ active }) {
  if (!active) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="rounded-xl border border-border bg-surface px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-accent" />
          <span className="text-sm text-text">Loading...</span>
        </div>
      </div>
    </div>
  );
}

export default GlobalLoader;
