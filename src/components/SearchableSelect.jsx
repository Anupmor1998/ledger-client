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
  isMulti = false,
}) {
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const sortedOptions = useMemo(() => sortOptionsByLabel(options || []), [options]);
  const shouldAutocomplete = isMulti || sortedOptions.length > autocompleteThreshold;

  // Selected values array if isMulti
  const selectedValues = useMemo(() => {
    if (!isMulti) return [];
    if (Array.isArray(value)) return value.map(String);
    if (!value) return [];
    return String(value)
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }, [isMulti, value]);

  const selectedOptions = useMemo(() => {
    if (!isMulti) return [];
    return sortedOptions.filter((opt) => opt.value && selectedValues.includes(String(opt.value)));
  }, [isMulti, sortedOptions, selectedValues]);

  const selectedOption = useMemo(() => {
    if (isMulti) return null;
    return (
      sortedOptions.find(
        (option) => String(option.value ?? "") === String(value ?? "")
      ) || null
    );
  }, [isMulti, sortedOptions, value]);

  useEffect(() => {
    if (!open) {
      if (isMulti) {
        setQuery("");
      } else {
        setQuery(selectedOption?.label || "");
      }
    }
  }, [open, isMulti, selectedOption?.label]);

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

  const handleToggleMulti = (optionValue) => {
    if (!optionValue) {
      // "All" clicked -> clear all selections
      onChange([]);
      setQuery("");
      return;
    }
    const strVal = String(optionValue);
    let next;
    if (selectedValues.includes(strVal)) {
      next = selectedValues.filter((v) => v !== strVal);
    } else {
      next = [...selectedValues, strVal];
    }
    onChange(next);
    setQuery("");
  };

  const handleRemoveMulti = (e, valToRemove) => {
    e.stopPropagation();
    e.preventDefault();
    const next = selectedValues.filter((v) => v !== String(valToRemove));
    onChange(next);
  };

  return (
    <div className={`block ${className}`.trim()} ref={rootRef}>
      {label ? <span className="mb-1 block text-sm muted-text">{label}</span> : null}

      <div
        className={`form-input min-h-[44px] cursor-text flex flex-wrap items-center gap-1.5 p-2 bg-surface ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
        onClick={() => {
          if (disabled) return;
          if (!open) {
            setOpen(true);
          }
          const inputEl = rootRef.current?.querySelector("input");
          inputEl?.focus();
        }}
      >
        {isMulti && selectedOptions.map((opt) => (
          <span
            key={opt.value}
            className="inline-flex items-center gap-1 rounded-md bg-primary/20 px-2 py-0.5 text-xs font-medium text-text border border-primary/40 shadow-sm"
          >
            <span className="max-w-[200px] truncate">{opt.label}</span>
            <button
              type="button"
              onClick={(e) => handleRemoveMulti(e, opt.value)}
              className="ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-text transition-colors hover:bg-black/10 hover:text-text dark:hover:bg-white/20 dark:hover:text-white"
              title="Remove"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3 shrink-0 fill-none stroke-current stroke-2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}

        <input
          className="flex-1 min-w-[120px] bg-transparent outline-none border-none p-0 text-sm text-text placeholder:text-muted-text focus:ring-0 focus:outline-none"
          value={open ? query : isMulti ? "" : selectedOption?.label || ""}
          placeholder={
            isMulti
              ? selectedOptions.length === 0
                ? "All (type to search firm...)"
                : "Type to add another firm..."
              : selectedOption?.label || placeholder
          }
          disabled={disabled}
          autoComplete="off"
          onFocus={() => {
            if (disabled) return;
            setQuery("");
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
        />

        {isMulti && selectedOptions.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
              setQuery("");
            }}
            className="text-xs text-muted-text hover:text-text px-1"
            title="Clear all"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="relative">

        {open && filteredOptions.length > 0 ? (
          <div
            ref={listRef}
            className="absolute left-0 right-0 top-[calc(100%-1px)] z-40 max-h-56 overflow-auto rounded-b-lg border border-border bg-surface shadow-lg"
          >
            {filteredOptions.map((option) => {
              const isSelected = isMulti
                ? !option.value
                  ? selectedValues.length === 0
                  : selectedValues.includes(String(option.value))
                : String(option.value ?? "") === String(value ?? "");

              return (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-bg ${
                    isSelected ? "bg-primary/10 text-primary font-medium" : ""
                  }`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (isMulti) {
                      handleToggleMulti(option.value);
                    } else {
                      onChange(option.value);
                      setQuery(option.label);
                      setOpen(false);
                    }
                  }}
                >
                  <div className="min-w-0 pr-2">
                    <span className="block truncate text-sm">{option.label}</span>
                    {option.helperText ? (
                      <span className="mt-0.5 block truncate text-xs muted-text">
                        {option.helperText}
                      </span>
                    ) : null}
                  </div>
                  {isMulti && isSelected && option.value ? (
                    <span className="text-primary text-sm font-semibold shrink-0">✓</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {!error && helperText ? <p className="mt-1 text-xs muted-text">{helperText}</p> : null}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </div>
  );
}

export default SearchableSelect;
