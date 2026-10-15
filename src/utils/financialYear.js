export const APP_INCEPTION_FY_START_YEAR = 2025; // FY 2025-26 (App launch)
export const APP_INCEPTION_CALENDAR_YEAR = 2025;
export const DEFAULT_FUTURE_YEARS_COUNT = 5;

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

export function buildFinancialYearOptions(range = 20, futureRange = DEFAULT_FUTURE_YEARS_COUNT) {
  const current = getCurrentFinancialYearStart();
  const options = [];

  for (let offset = futureRange; offset >= 1; offset -= 1) {
    const startYear = current + offset;
    options.push({
      value: startYear,
      label: getFinancialYearLabel(startYear),
    });
  }

  for (let index = 0; index < range; index += 1) {
    const startYear = current - index;
    if (startYear < APP_INCEPTION_FY_START_YEAR) {
      break;
    }
    options.push({
      value: startYear,
      label: getFinancialYearLabel(startYear),
    });
  }

  return options;
}
