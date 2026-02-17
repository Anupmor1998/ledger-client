import { toast } from "react-toastify";

function CopyableText({
  value,
  className = "",
  title,
  truncate = false,
  nowrap = false,
  preserveLineBreaks = false,
}) {
  const text = value == null || value === "" ? "-" : String(value);

  async function handleCopy() {
    if (text === "-") {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch (_error) {
      toast.error("Unable to copy");
    }
  }

  return (
    <button
      type="button"
      className={`text-left hover:underline ${className}`}
      onClick={handleCopy}
      title={title || text}
      aria-label={`Copy ${text}`}
    >
      <span
        className={`block ${truncate ? "truncate" : ""} ${nowrap ? "whitespace-nowrap" : ""} ${
          preserveLineBreaks ? "whitespace-pre-wrap break-words" : ""
        }`}
      >
        {text}
      </span>
    </button>
  );
}

export default CopyableText;
