import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar.jsx";
import SummaryCards from "../components/SummaryCards.jsx";
import BreakdownTable from "../components/BreakdownTable.jsx";
import RecentChecksTable from "../components/RecentChecksTable.jsx";
import HourlyAveragesTable from "../components/HourlyAveragesTable.jsx";
import { getLatest, triggerRefresh, getRecent, getHourlyAverages, getDownloadUrl } from "../api/client.js";

const SYSTEMS = [
  { value: "hc", label: "Health Connect" },
  { value: "lm", label: "Lead Market 360" },
  { value: "pros", label: "Pros-LM360" },
  { value: "publisher", label: "Publisher Combined" },
];

// States that appear across all systems — TX first as client prefers
const STATE_OPTIONS = [
  "TX", "TN", "FL", "MS", "LA", "SC", "OK", "OH",
  "MO", "AZ", "AL", "IN", "NE", "MI", "NC", "IA",
  "AR", "CA", "CO", "CT", "DE", "DC", "GA", "ID",
  "IL", "KS", "KY", "MD", "NV", "NH", "NJ", "NM",
  "NY", "ND", "OR", "PA", "RI", "SD", "UT", "WV",
  "WI", "WY",
];

const AUTO_REFRESH_INTERVAL = 60;

export default function DashboardPage() {
  const [systemType, setSystemType] = useState("hc");
  const [stateFilter, setStateFilter] = useState("TX"); // default TX per client
  const [snapshot, setSnapshot] = useState(null);
  const [recentChecks, setRecentChecks] = useState([]);
  const [hourlyAverages, setHourlyAverages] = useState([]);
  const [hourlyDays, setHourlyDays] = useState(1);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [loadingHourly, setLoadingHourly] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [autoRefreshSecs, setAutoRefreshSecs] = useState(AUTO_REFRESH_INTERVAL);
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = useCallback(async (type, state, silent = false) => {
    if (!silent) { setLoadingSnapshot(true); setLoadingRecent(true); }
    setError("");
    try {
      const [latestRes, recentRes] = await Promise.all([
        getLatest(type),
        getRecent(type, 20, state),
      ]);
      setSnapshot(latestRes.data);
      setRecentChecks(recentRes.data || []);
    } catch {
      setError("Failed to load data. Backend may be unreachable.");
    } finally {
      setLoadingSnapshot(false);
      setLoadingRecent(false);
    }
  }, []);

  const loadHourly = useCallback(async (type, days, state) => {
    setLoadingHourly(true);
    try {
      const res = await getHourlyAverages(type, days, state);
      setHourlyAverages(res.data || []);
    } catch {
      setHourlyAverages([]);
    } finally {
      setLoadingHourly(false);
    }
  }, []);

  useEffect(() => {
    setSnapshot(null); setRecentChecks([]); setHourlyAverages([]);
    loadAll(systemType, stateFilter);
    loadHourly(systemType, hourlyDays, stateFilter);
  }, [systemType, stateFilter]);

  useEffect(() => {
    loadHourly(systemType, hourlyDays, stateFilter);
  }, [hourlyDays]);

  // Auto-refresh countdown
  useEffect(() => {
    setAutoRefreshSecs(AUTO_REFRESH_INTERVAL);
    clearInterval(timerRef.current);
    clearInterval(countdownRef.current);
    timerRef.current = setInterval(() => {
      loadAll(systemType, stateFilter, true);
      loadHourly(systemType, hourlyDays, stateFilter);
      setAutoRefreshSecs(AUTO_REFRESH_INTERVAL);
    }, AUTO_REFRESH_INTERVAL * 1000);
    countdownRef.current = setInterval(() => {
      setAutoRefreshSecs((s) => (s <= 1 ? AUTO_REFRESH_INTERVAL : s - 1));
    }, 1000);
    return () => { clearInterval(timerRef.current); clearInterval(countdownRef.current); };
  }, [systemType, stateFilter, hourlyDays]);

  const handleManualRefresh = async () => {
    setRefreshing(true); setError("");
    try {
      const res = await triggerRefresh(systemType);
      setSnapshot(res.data);
      const [recentRes, hourlyRes] = await Promise.all([
        getRecent(systemType, 20, stateFilter),
        getHourlyAverages(systemType, hourlyDays, stateFilter),
      ]);
      setRecentChecks(recentRes.data || []);
      setHourlyAverages(hourlyRes.data || []);
      setAutoRefreshSecs(AUTO_REFRESH_INTERVAL);
      showToast("Data refreshed from CRM.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to refresh CRM data.");
      showToast("Refresh failed.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar lastChecked={snapshot?.checkedAt} autoRefreshSecs={autoRefreshSecs} />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6 animate-fade-in">

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Agent Availability</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Auto-checked every 10 min · Dashboard refreshes every {AUTO_REFRESH_INTERVAL}s
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleManualRefresh} disabled={refreshing} className="btn-primary flex items-center gap-2">
              {refreshing ? (
                <><div className="w-3.5 h-3.5 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />Refreshing...</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>Refresh Now</>
              )}
            </button>
            <a href={getDownloadUrl(systemType)} target="_blank" rel="noopener noreferrer" className="btn-excel flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Export Excel
            </a>
          </div>
        </div>

        {/* System selector */}
        <div className="flex gap-2 flex-wrap">
          {SYSTEMS.map((sys) => (
            <button key={sys.value} onClick={() => setSystemType(sys.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                systemType === sys.value
                  ? "bg-accent-green text-surface font-semibold shadow-lg shadow-accent-green/20"
                  : "card text-gray-400 hover:text-white hover:border-gray-600"
              }`}>
              {sys.label}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}
        <SummaryCards snapshot={snapshot} loading={loadingSnapshot} systemType={systemType} />

        <BreakdownTable entries={snapshot?.entries || []} loading={loadingSnapshot} />
                {/* State filter row */}
        <div className="card p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
              <span className="text-xs text-gray-400 uppercase tracking-wider font-display">History & Averages filter:</span>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setStateFilter("")}
                className={`px-3 py-1 rounded text-xs font-display transition-colors ${
                  stateFilter === ""
                    ? "bg-surface-border text-white font-semibold"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                All States
              </button>
              {STATE_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStateFilter(s)}
                  className={`px-3 py-1 rounded text-xs font-display transition-colors ${
                    stateFilter === s
                      ? "bg-accent-green text-surface font-semibold"
                      : "text-gray-500 hover:text-gray-300 hover:bg-surface-border"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RecentChecksTable checks={recentChecks} loading={loadingRecent} stateFilter={stateFilter} />
          <HourlyAveragesTable
            averages={hourlyAverages}
            loading={loadingHourly}
            days={hourlyDays}
            onDaysChange={setHourlyDays}
            stateFilter={stateFilter}
          />
        </div>
      </main>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-xl animate-slide-up ${
          toast.type === "error"
            ? "bg-red-500/20 border border-red-500/30 text-red-300"
            : "bg-accent-green/20 border border-accent-green/30 text-accent-green"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
