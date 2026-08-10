export function MiniLineChart() {
  const points = "0,32 14,26 28,29 42,18 56,22 70,10 84,14 100,4";

  return (
    <svg viewBox="0 0 100 40" className="h-12 w-full text-primary" preserveAspectRatio="none">
      <defs>
        <linearGradient id="mini-line-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`${points} 100,40 0,40`} fill="url(#mini-line-chart-fill)" stroke="none" />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
