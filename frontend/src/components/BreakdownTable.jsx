function ReadyBadge({ value }) {
  const num = Number(value);
  if (value === "ERR" || isNaN(num)) {
    return <span className="text-accent-red font-display text-sm">ERR</span>;
  }
  const color = num >= 5 ? "text-accent-green" : num >= 1 ? "text-accent-amber" : "text-gray-500";
  return <span className={`font-display text-sm font-medium ${color}`}>{num}</span>;
}

export default function BreakdownTable({ entries = [], loading }) {
  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-border">
          <div className="h-5 w-40 bg-surface-border rounded animate-pulse" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-surface-border flex gap-4">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-4 flex-1 bg-surface-border rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500 text-sm">No breakdown data. Click Refresh to load.</p>
      </div>
    );
  }

  const showReasonCause = entries.some((e) => e.reason || e.cause);

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-surface-border flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">Latest Breakdown</h3>
        <span className="text-xs text-gray-500 font-display">{entries.length} entries</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">#</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">State</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Phone</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Ready</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Active</th>
              {showReasonCause && (
                <>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Reason</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Cause</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((row, i) => (
              <tr
                key={`${row.state}-${i}`}
                className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors"
              >
                <td className="px-4 py-3 text-gray-600 font-display text-xs">{i + 1}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-white">{row.state}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 font-display text-xs">{row.phone}</td>
                <td className="px-4 py-3 text-right">
                  <ReadyBadge value={row.ready} />
                </td>
                <td className="px-4 py-3 text-right">
                  <ReadyBadge value={row.active} />
                </td>
                {showReasonCause && (
                  <>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">{row.reason || "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[120px] truncate">{row.cause || "—"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
