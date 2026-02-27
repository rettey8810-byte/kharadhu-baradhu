export function getYearMonth(date = new Date()) {
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function getDaysRemainingInMonth(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const today = date.getDate()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return Math.max(0, lastDay - today)
}
