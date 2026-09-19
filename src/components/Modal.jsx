import { useEffect } from "react";
import { createPortal } from "react-dom";

function Modal({
  title,
  children,
  onClose,
  footer,
  closeOnBackdrop = true,
  closeOnEsc = true,
  hideCloseButton = false,
  maxWidthClassName = "max-w-lg",
}) {
  // Prevent background scrolling while modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Prevent layout shift if scrollbar disappears
    const scrollBarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

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

  const modalContent = (
    <div
      className="fixed inset-0 z-[1000] m-0 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4"
      onMouseDown={handleBackdropMouseDown}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`my-auto flex w-full flex-col rounded-xl border border-border bg-surface p-3 shadow-2xl max-h-[92dvh] sm:max-h-[88vh] sm:p-4 ${maxWidthClassName}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          {hideCloseButton ? null : (
            <button
              type="button"
              className="rounded-md border border-border p-2 text-sm text-muted-text hover:bg-surface-muted hover:text-text"
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current stroke-2"
              >
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-3 sm:pr-4">
          {children}
        </div>
        {footer ? (
          <div className="mt-4 shrink-0 border-t border-border pt-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default Modal;
