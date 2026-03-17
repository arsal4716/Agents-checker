function formatTime(check) {
  if (check.checkedAtEST) return check.checkedAtEST;
  if (!check.checkedAt) return "—";
  return (
    new Date(check.checkedAt).toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) + " EST"
  );
}

function TrendBadge({ value }) {
  if (!value && value !== 0) return <span className="text-gray-500">—</span>;
  const color =
    value >= 5
      ? "text-accent-green"
      : value >= 1
        ? "text-accent-amber"
        : "text-gray-500";
  return <span className={`font-display font-medium ${color}`}>{value}</span>;
}

export default function RecentChecksTable({
  checks = [],
  loading,
  stateFilter,
}) {
  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-border">
          <div className="h-5 w-40 bg-surface-border rounded animate-pulse" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="px-4 py-3 border-b border-surface-border flex gap-4"
          >
            {[...Array(4)].map((_, j) => (
              <div
                key={j}
                className="h-4 flex-1 bg-surface-border rounded animate-pulse"
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (!checks.length) {
    return (
      <div className="card p-8 text-center">
        <p className="text-gray-500 text-sm">
          No check history yet. The cron job runs every 10 minutes.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-surface-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white text-sm">
            Recent Check History
          </h3>
          {stateFilter && (
            <span className="text-xs bg-accent-green/15 text-accent-green border border-accent-green/30 px-2 py-0.5 rounded font-display">
              {stateFilter}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 font-display">
          {checks.length} records
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">
                Time
              </th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">
                Ready
              </th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">
                Active
              </th>
              {!stateFilter && (
                <>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">
                    Success
                  </th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">
                    Errors
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => (
              <tr
                key={check._id}
                className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors"
              >
                <td className="px-4 py-3 text-gray-300 font-display text-xs">
                  {formatTime(check)}
                </td>
                <td className="px-4 py-3 text-right">
                  <TrendBadge value={check.totalReady} />
                </td>
                <td className="px-4 py-3 text-right">
                  <TrendBadge value={check.totalActive} />
                </td>
                {!stateFilter && (
                  <>
                    <td className="px-4 py-3 text-right text-gray-400 font-display text-xs">
                      {check.meta?.successCount ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {check.meta?.errorCount > 0 ? (
                        <span className="text-accent-red font-display text-xs">
                          {check.meta.errorCount}
                        </span>
                      ) : (
                        <span className="text-gray-600 font-display text-xs">
                          0
                        </span>
                      )}
                    </td>
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
