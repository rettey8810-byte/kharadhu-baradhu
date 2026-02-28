export function getYearMonth(date = new Date()) {
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

export function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDaysRemainingInMonth(date = new Date()) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const today = date.getDate()
  const lastDay = new Date(year, month + 1, 0).getDate()
  return Math.max(0, lastDay - today)
}
