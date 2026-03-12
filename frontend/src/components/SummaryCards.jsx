const SYSTEM_LABELS = {
  hc: "Health Connect",
  lm: "Lead Market 360",
  pros: "Pros-LM360",
  publisher: "Publisher Combined",
};

function StatCard({ label, value, sub, accent = false, loading = false }) {
  return (
    <div className={`card p-5 flex flex-col gap-1 ${accent ? "border-accent-green/30" : ""}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wider font-display">{label}</p>
      {loading ? (
        <div className="h-8 w-24 bg-surface-border rounded animate-pulse mt-1" />
      ) : (
        <p className={`text-3xl font-bold font-display ${accent ? "text-accent-green" : "text-white"}`}>
          {value ?? "—"}
        </p>
      )}
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SummaryCards({ snapshot, loading, systemType }) {
  const checkedAt = snapshot?.checkedAt
    ? new Date(snapshot.checkedAt).toLocaleString()
    : null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Ready"
        value={snapshot?.totalReady}
        sub="agents ready"
        accent
        loading={loading}
      />
      <StatCard
        label="Total Active"
        value={snapshot?.totalActive}
        sub="calls in progress"
        loading={loading}
      />
      <StatCard
        label="Last Check"
        value={loading ? null : (checkedAt ? checkedAt.split(",")[1]?.trim() : "Never")}
        sub={loading ? null : (checkedAt ? checkedAt.split(",")[0] : "No data yet")}
        loading={loading}
      />
      <StatCard
        label="System"
        value={SYSTEM_LABELS[systemType] || systemType}
        sub={`${snapshot?.meta?.successCount ?? 0} ok · ${snapshot?.meta?.errorCount ?? 0} err`}
        loading={loading}
      />
    </div>
  );
}
