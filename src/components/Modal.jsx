function Modal({
  title,
  children,
  onClose,
  footer,
  closeOnBackdrop = true,
  closeOnEsc = false,
  hideCloseButton = false,
}) {
  function handleBackdropMouseDown() {
    if (closeOnBackdrop) {
      onClose();
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && closeOnEsc) {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:items-center sm:p-4"
      onMouseDown={handleBackdropMouseDown}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="my-2 flex w-full max-w-lg flex-col rounded-xl border border-border bg-surface p-4 shadow-xl sm:my-0 sm:max-h-[88vh] sm:p-4 max-h-[92dvh]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          {hideCloseButton ? null : (
            <button
              type="button"
              className="rounded-md border border-border p-2 text-sm"
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-3 sm:pr-4">{children}</div>
        {footer ? <div className="mt-4 shrink-0 border-t border-border pt-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export default Modal;
