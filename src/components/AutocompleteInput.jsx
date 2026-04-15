import { useMemo, useState } from "react";

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

function AutocompleteInput({
  label,
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  error,
  helperText,
  multiline = false,
  inputClassName = "",
}) {
  const [open, setOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const query = normalize(value);
    if (!query) {
      return options.slice(0, 10);
    }

    return options
      .filter((item) => normalize(item.label).includes(query))
      .slice(0, 10);
  }, [options, value]);

  return (
    <label className="block">
      <span className="mb-1 block text-sm muted-text">{label}</span>
      <div className="relative">
        {multiline ? (
          <textarea
            className={`form-input ${inputClassName}`.trim()}
            value={value}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              onChange(event.target.value);
              setOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => setOpen(false), 120);
            }}
          />
        ) : (
          <input
            className={`form-input ${inputClassName}`.trim()}
            value={value}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              onChange(event.target.value);
              setOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => setOpen(false), 120);
            }}
            autoComplete="off"
          />
        )}

        {open && filteredOptions.length > 0 ? (
          <div className="absolute left-0 right-0 top-[calc(100%-1px)] z-40 mt-0 max-h-52 overflow-auto rounded-b-lg border border-border bg-surface shadow-lg">
            {filteredOptions.map((option) => (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-bg"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(option);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {!error && helperText ? <p className="mt-1 text-xs muted-text">{helperText}</p> : null}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </label>
  );
}

export default AutocompleteInput;
