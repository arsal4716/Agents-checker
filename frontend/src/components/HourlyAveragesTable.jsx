export default function HourlyAveragesTable({ averages = [], loading, days, onDaysChange, stateFilter }) {
  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-border">
          <div className="h-5 w-48 bg-surface-border rounded animate-pulse" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-surface-border flex gap-4">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-4 flex-1 bg-surface-border rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!averages.length) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500 text-sm">No hourly data yet. Check back after a few cron cycles.</p>
      </div>
    );
  }

  const maxReady = Math.max(...averages.map((h) => h.avgReady), 1);

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-surface-border flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white text-sm">Hourly Averages</h3>
          {stateFilter && (
            <span className="text-xs bg-accent-green/15 text-accent-green border border-accent-green/30 px-2 py-0.5 rounded font-display">
              {stateFilter}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Show last:</span>
          {[1, 3, 7].map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={`text-xs px-2.5 py-1 rounded font-display transition-colors ${
                days === d
                  ? "bg-accent-green text-surface font-semibold"
                  : "text-gray-400 hover:text-white border border-surface-border"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Hour</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Avg Ready</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Avg Active</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Min</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Max</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Checks</th>
              <th className="px-4 py-3 w-32 text-xs text-gray-500 uppercase tracking-wider font-display">Trend</th>
            </tr>
          </thead>
          <tbody>
            {averages.map((row) => (
              <tr
                key={row.hour}
                className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors"
              >
                <td className="px-4 py-3 text-gray-300 font-display text-xs whitespace-nowrap">{row.hour}</td>
                <td className="px-4 py-3 text-right text-accent-green font-display font-medium">{row.avgReady}</td>
                <td className="px-4 py-3 text-right text-white font-display font-medium">{row.avgActive}</td>
                <td className="px-4 py-3 text-right text-gray-500 font-display text-xs">{row.minReady}</td>
                <td className="px-4 py-3 text-right text-gray-500 font-display text-xs">{row.maxReady}</td>
                <td className="px-4 py-3 text-right text-gray-500 font-display text-xs">{row.checkCount}</td>
                <td className="px-4 py-3">
                  <div className="w-full bg-surface-border rounded-full h-1.5">
                    <div
                      className="bg-accent-green h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min((row.avgReady / maxReady) * 100, 100)}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
