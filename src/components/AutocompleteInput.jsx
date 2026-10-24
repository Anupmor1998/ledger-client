import { useEffect, useMemo, useRef, useState } from "react";
import { sortOptionsByLabel } from "../utils/sort";

const VIRTUAL_ROW_HEIGHT = 52;
const VIRTUAL_OVERSCAN = 4;

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

function AutocompleteInput({
  label,
  value,
  onChange,
  onSelect,
  onAddNew,
  addNewLabel,
  options,
  placeholder,
  error,
  helperText,
  multiline = false,
  inputClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef(null);
  const sortedOptions = useMemo(() => sortOptionsByLabel(options), [options]);

  const trimmedValue = (value || "").trim();

  const filteredOptions = useMemo(() => {
    const query = normalize(value);
    if (!query) {
      return sortedOptions;
    }

    return sortedOptions.filter(
      (item) =>
        normalize(item.label).includes(query) || normalize(item.helperText).includes(query)
    );
  }, [sortedOptions, value]);

  const hasExactMatch = useMemo(() => {
    if (!trimmedValue) return false;
    const query = normalize(trimmedValue);
    return sortedOptions.some((item) => normalize(item.label) === query);
  }, [sortedOptions, trimmedValue]);

  const showAddNew = Boolean(onAddNew && trimmedValue && !hasExactMatch);

  useEffect(() => {
    if (!open) {
      setScrollTop(0);
      return;
    }

    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
    setScrollTop(0);
  }, [open, value]);

  const totalHeight = filteredOptions.length * VIRTUAL_ROW_HEIGHT;
  const viewportHeight = Math.min(208, totalHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT) - VIRTUAL_OVERSCAN);
  const visibleCount = Math.ceil(viewportHeight / VIRTUAL_ROW_HEIGHT) + VIRTUAL_OVERSCAN * 2;
  const endIndex = Math.min(filteredOptions.length, startIndex + visibleCount);
  const visibleOptions = filteredOptions.slice(startIndex, endIndex);

  const shouldRenderDropdown = open && (filteredOptions.length > 0 || showAddNew);

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
              setTimeout(() => setOpen(false), 150);
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
              setTimeout(() => setOpen(false), 150);
            }}
            autoComplete="off"
          />
        )}

        {shouldRenderDropdown ? (
          <div
            ref={listRef}
            className="absolute left-0 right-0 top-[calc(100%-1px)] z-40 mt-0 max-h-60 overflow-auto rounded-b-lg border border-border bg-surface shadow-xl"
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          >
            {showAddNew && (
              <button
                type="button"
                className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-border bg-primary/10 px-3 py-2.5 text-left text-xs font-semibold text-primary transition hover:bg-primary/20"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onAddNew(trimmedValue);
                  setOpen(false);
                }}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  +
                </span>
                <span className="truncate">
                  {addNewLabel ? addNewLabel(trimmedValue) : `Add "${trimmedValue}"`}
                </span>
              </button>
            )}

            {filteredOptions.length > 0 ? (
              <div className="relative" style={{ height: totalHeight || 0 }}>
                {visibleOptions.map((option, index) => {
                  const optionIndex = startIndex + index;
                  return (
                    <button
                      key={`${option.value}-${option.label}`}
                      type="button"
                      className="absolute left-0 right-0 block w-full px-3 py-2 text-left hover:bg-bg"
                      style={{
                        top: optionIndex * VIRTUAL_ROW_HEIGHT,
                        height: VIRTUAL_ROW_HEIGHT,
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        onSelect(option);
                        setOpen(false);
                      }}
                    >
                      <span className="block truncate text-sm">{option.label}</span>
                      {option.helperText ? (
                        <span className="mt-0.5 block truncate text-xs muted-text">{option.helperText}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : !showAddNew ? (
              <div className="px-3 py-3 text-center text-xs muted-text">No matches found</div>
            ) : null}
          </div>
        ) : null}
      </div>
      {!error && helperText ? <p className="mt-1 text-xs muted-text">{helperText}</p> : null}
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
    </label>
  );
}

export default AutocompleteInput;
