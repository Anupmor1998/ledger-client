function toSortableText(value) {
  return String(value || "").trim();
}

export function compareAlphabetically(a, b) {
  return toSortableText(a).localeCompare(toSortableText(b), undefined, {
    sensitivity: "base",
    numeric: true,
  });
}

export function sortByText(list, getText) {
  return [...(Array.isArray(list) ? list : [])].sort((first, second) =>
    compareAlphabetically(getText(first), getText(second))
  );
}

export function sortOptionsByLabel(options) {
  return sortByText(options, (option) => option?.label);
}
