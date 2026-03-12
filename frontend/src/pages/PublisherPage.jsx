import { useState, useEffect, useCallback, useRef } from "react";
import { getPublisherLatest, getPublisherRecent, getPublisherHourly, getPublisherDownloadUrl, refreshPublisher } from "../api/client.js";
import SummaryCards from "../components/SummaryCards.jsx";
import RecentChecksTable from "../components/RecentChecksTable.jsx";
import HourlyAveragesTable from "../components/HourlyAveragesTable.jsx";

const AUTO_REFRESH = 60;

function PublisherBreakdownTable({ entries = [], loading }) {
  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-border">
          <div className="h-5 w-40 bg-surface-border rounded animate-pulse" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-surface-border flex gap-4">
            {[...Array(3)].map((_, j) => (
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
        <p className="text-gray-500 text-sm">No data yet. Check back shortly.</p>
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-surface-border flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">Agent Availability by State</h3>
        <span className="text-xs text-gray-500 font-display">{entries.length} states</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">#</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">State</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Ready</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-display">Active</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((row, i) => {
              const num = Number(row.active || 0);
              const color = num >= 5 ? "text-accent-green" : num >= 1 ? "text-accent-amber" : "text-gray-500";
              return (
                <tr key={row.state} className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-gray-600 font-display text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-white">{row.state}</td>
                  <td className={`px-4 py-3 text-right font-display font-medium ${color}`}>{row.ready}</td>
                  <td className={`px-4 py-3 text-right font-display font-medium ${color}`}>{row.active}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PublisherPage() {
  const [snapshot, setSnapshot] = useState(null);
  const [recentChecks, setRecentChecks] = useState([]);
  const [hourlyAverages, setHourlyAverages] = useState([]);
  const [hourlyDays, setHourlyDays] = useState(1);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingHourly, setLoadingHourly] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState(null);
  const [autoRefreshSecs, setAutoRefreshSecs] = useState(AUTO_REFRESH);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) { setLoadingSnapshot(true); setLoadingRecent(true); }
    try {
      const [latestRes, recentRes] = await Promise.all([
        getPublisherLatest(),
        getPublisherRecent(20),
      ]);
      setSnapshot(latestRes.data);
      setRecentChecks(recentRes.data || []);
    } catch {
      // silently fail on public page
    } finally {
      setLoadingSnapshot(false);
      setLoadingRecent(false);
    }
  }, []);

  const loadHourly = useCallback(async (days) => {
    setLoadingHourly(true);
    try {
      const res = await getPublisherHourly(days);
      setHourlyAverages(res.data || []);
    } catch {
      setHourlyAverages([]);
    } finally {
      setLoadingHourly(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadHourly(hourlyDays); }, [hourlyDays]);

  // Auto-refresh every 60s
  useEffect(() => {
    setAutoRefreshSecs(AUTO_REFRESH);
    clearInterval(timerRef.current);
    clearInterval(countdownRef.current);
    timerRef.current = setInterval(() => {
      loadAll(true);
      loadHourly(hourlyDays);
      setAutoRefreshSecs(AUTO_REFRESH);
    }, AUTO_REFRESH * 1000);
    countdownRef.current = setInterval(() => {
      setAutoRefreshSecs((s) => (s <= 1 ? AUTO_REFRESH : s - 1));
    }, 1000);
    return () => { clearInterval(timerRef.current); clearInterval(countdownRef.current); };
  }, [hourlyDays]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await refreshPublisher();
      setSnapshot(res.data);
      const [recentRes, hourlyRes] = await Promise.all([
        getPublisherRecent(20),
        getPublisherHourly(hourlyDays),
      ]);
      setRecentChecks(recentRes.data || []);
      setHourlyAverages(hourlyRes.data || []);
      setAutoRefreshSecs(AUTO_REFRESH);
      showToast("Data refreshed from CRM.");
    } catch {
      showToast("Refresh failed. Try again.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const checkedAt = snapshot?.checkedAt
    ? new Date(snapshot.checkedAt).toLocaleString()
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent-green flex items-center justify-center shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d0f14" strokeWidth="2.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <div>
              <span className="font-display text-sm text-white tracking-widest uppercase">Publisher Dashboard</span>
              <span className="hidden sm:inline text-gray-600 text-xs ml-3">Combined Agent Availability</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse2 inline-block" />
              <span className="font-display">Refreshes in {autoRefreshSecs}s</span>
            </div>
            {/* Refresh Now button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
            >
              {refreshing ? (
                <>
                  <div className="w-3 h-3 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Refresh Now
                </>
              )}
            </button>
            <a
              href={getPublisherDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-excel py-1.5 px-3 text-xs flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Excel
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-xl font-bold text-white">Publisher Combined View</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            HC · LM360 · Pros — aggregated by state · auto-updated every 10 min
            {checkedAt && <span className="ml-2 text-gray-600">· Last check: {checkedAt}</span>}
          </p>
        </div>

        <SummaryCards snapshot={snapshot} loading={loadingSnapshot} systemType="publisher" />
        <PublisherBreakdownTable entries={snapshot?.entries || []} loading={loadingSnapshot} />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RecentChecksTable checks={recentChecks} loading={loadingRecent} />
          <HourlyAveragesTable
            averages={hourlyAverages}
            loading={loadingHourly}
            days={hourlyDays}
            onDaysChange={setHourlyDays}
          />
        </div>
      </main>

      <footer className="border-t border-surface-border py-4 text-center text-xs text-gray-600 font-display">
        HLG Solutions · CRM Agent Monitor · Publisher View
      </footer>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-xl animate-slide-up
          ${toast.type === "error"
            ? "bg-red-500/20 border border-red-500/30 text-red-300"
            : "bg-accent-green/20 border border-accent-green/30 text-accent-green"
          }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
