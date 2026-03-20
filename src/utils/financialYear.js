export function getCurrentFinancialYearStart(date = new Date()) {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return month >= 4 ? year : year - 1;
}

export function getFinancialYearLabel(startYear) {
  const year = Number(startYear);
  if (!Number.isInteger(year)) {
    return "";
  }
  const nextShortYear = String((year + 1) % 100).padStart(2, "0");
  return `${year}-${nextShortYear}`;
}

export function buildFinancialYearOptions(range = 6) {
  const current = getCurrentFinancialYearStart();
  return Array.from({ length: range }, (_, index) => {
    const startYear = current - index;
    return {
      value: startYear,
      label: getFinancialYearLabel(startYear),
    };
  });
}
