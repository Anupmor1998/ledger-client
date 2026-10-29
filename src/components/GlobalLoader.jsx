function GlobalLoader({ active }) {
  if (!active) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-1 overflow-hidden bg-accent/15"
    >
      <div className="h-full w-full bg-accent animate-pulse" />
    </div>
  );
}

export default GlobalLoader;
