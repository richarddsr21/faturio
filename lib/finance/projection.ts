export function calculateAverageTicket(totalRevenue: number, salesCount: number): number {
  return salesCount > 0 ? totalRevenue / salesCount : 0;
}

export function calculateMonthProjection(
  currentRevenue: number,
  dayOfMonth: number,
  daysInMonth: number
): number {
  if (dayOfMonth <= 0) return 0;
  return (currentRevenue / dayOfMonth) * daysInMonth;
}
