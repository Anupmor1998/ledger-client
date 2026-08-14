import { useEffect, useMemo, useRef, useState } from "react";
import { sortOptionsByLabel } from "../utils/sort";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Search or select...",
  error,
  helperText,
  className = "",
  disabled = false,
  autocompleteThreshold = 5,
}) {
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const sortedOptions = useMemo(() => sortOptionsByLabel(options || []), [options]);
  const shouldAutocomplete = sortedOptions.length > autocompleteThreshold;

  const selectedOption = useMemo(
    () => sortedOptions.find((option) => String(option.value) === String(value)) || null,
    [sortedOptions, value]
  );

  useEffect(() => {
    if (!open) {
      setQuery(selectedOption?.label || "");
    }
  }, [open, selectedOption?.label]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!rootRef.current) {
        return;
      }
      if (!rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!shouldAutocomplete) {
      return sortedOptions;
    }

    const normalizedQuery = normalize(query);
    if (!normalizedQuery) {
      return sortedOptions;
    }

    return sortedOptions.filter((option) => {
      const optionLabel = normalize(option.label);
      const helper = normalize(option.helperText);
      return optionLabel.includes(normalizedQuery) || helper.includes(normalizedQuery);
    });
  }, [query, sortedOptions]);

  if (!shouldAutocomplete) {
    return (
      <label className={`block ${className}`.trim()} ref={rootRef}>
        {label ? <span className="mb-1 block text-sm muted-text">{label}</span> : null}
        <select
          className="form-input"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {sortedOptions.map((option) => (
            <option key={`${option.value}-${option.label}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {!error && helperText ? <p className="mt-1 text-xs muted-text">{helperText}</p> : null}
        {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
      </label>
    );
  }

  return (
    <label className={`block ${className}`.trim()} ref={rootRef}>
      {label ? <span className="mb-1 block text-sm muted-text">{label}</span> : null}
      <div className="relative">
        <input
          className="form-input"
          value={open ? query : selectedOption?.label || query}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => {
            if (disabled) return;
            setQuery(selectedOption?.label || "");
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => {
              setOpen(false);
              setQuery(selectedOption?.label || "");
            }, 120);
          }}
        />

        {open && filteredOptions.length > 0 ? (
          <div
            ref={listRef}
            className="absolute left-0 right-0 top-[calc(100%-1px)] z-40 max-h-56 overflow-auto rounded-b-lg border border-border bg-surface shadow-lg"
          >
            {filteredOptions.map((option) => (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-bg"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(option.value);
                  setQuery(option.label);
                  setOpen(false);
                }}
              >
                <span className="block truncate text-sm">{option.label}</span>
                {option.helperText ? (
                  <span className="mt-0.5 block truncate text-xs muted-text">{option.helperText}</span>
                ) : null}
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

export default SearchableSelect;
