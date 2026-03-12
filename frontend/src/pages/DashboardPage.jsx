import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "../components/Navbar.jsx";
import SummaryCards from "../components/SummaryCards.jsx";
import BreakdownTable from "../components/BreakdownTable.jsx";
import RecentChecksTable from "../components/RecentChecksTable.jsx";
import HourlyAveragesTable from "../components/HourlyAveragesTable.jsx";
import { getLatest, triggerRefresh, getRecent, getHourlyAverages, getDownloadUrl } from "../api/client.js";

const SYSTEMS = [
  { value: "hc", label: "Health Connect", color: "blue" },
  { value: "lm", label: "Lead Market 360", color: "green" },
  { value: "pros", label: "Pros-LM360", color: "amber" },
  { value: "publisher", label: "Publisher Combined", color: "purple" },
];

const AUTO_REFRESH_INTERVAL = 60; 

export default function DashboardPage() {
  const [systemType, setSystemType] = useState("hc");
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

  // Load all data for the current system
  const loadAll = useCallback(async (type, silent = false) => {
    if (!silent) {
      setLoadingSnapshot(true);
      setLoadingRecent(true);
    }
    setError("");

    try {
      const [latestRes, recentRes] = await Promise.all([
        getLatest(type),
        getRecent(type, 20),
      ]);
      setSnapshot(latestRes.data);
      setRecentChecks(recentRes.data || []);
    } catch (err) {
      setError("Failed to load data. Backend may be unreachable.");
    } finally {
      setLoadingSnapshot(false);
      setLoadingRecent(false);
    }
  }, []);

  const loadHourly = useCallback(async (type, days) => {
    setLoadingHourly(true);
    try {
      const res = await getHourlyAverages(type, days);
      setHourlyAverages(res.data || []);
    } catch {
      setHourlyAverages([]);
    } finally {
      setLoadingHourly(false);
    }
  }, []);

  // Switch system
  useEffect(() => {
    setSnapshot(null);
    setRecentChecks([]);
    setHourlyAverages([]);
    loadAll(systemType);
    loadHourly(systemType, hourlyDays);
  }, [systemType]);

  // Hourly days change
  useEffect(() => {
    loadHourly(systemType, hourlyDays);
  }, [hourlyDays]);

  // Auto-refresh countdown
  useEffect(() => {
    setAutoRefreshSecs(AUTO_REFRESH_INTERVAL);
    clearInterval(timerRef.current);
    clearInterval(countdownRef.current);

    timerRef.current = setInterval(() => {
      loadAll(systemType, true);
      loadHourly(systemType, hourlyDays);
      setAutoRefreshSecs(AUTO_REFRESH_INTERVAL);
    }, AUTO_REFRESH_INTERVAL * 1000);

    countdownRef.current = setInterval(() => {
      setAutoRefreshSecs((s) => (s <= 1 ? AUTO_REFRESH_INTERVAL : s - 1));
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [systemType, hourlyDays]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    setError("");
    try {
      const res = await triggerRefresh(systemType);
      setSnapshot(res.data);
      showToast("Data refreshed from CRM.");
      // Reload history
      const [recentRes, hourlyRes] = await Promise.all([
        getRecent(systemType, 20),
        getHourlyAverages(systemType, hourlyDays),
      ]);
      setRecentChecks(recentRes.data || []);
      setHourlyAverages(hourlyRes.data || []);
      // Reset countdown
      setAutoRefreshSecs(AUTO_REFRESH_INTERVAL);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to refresh CRM data.");
      showToast("Refresh failed.", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDownload = () => {
    window.open(getDownloadUrl(systemType), "_blank");
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
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="btn-primary flex items-center gap-2"
            >
              {refreshing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-surface/40 border-t-surface rounded-full animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Refresh Now
                </>
              )}
            </button>
            <button onClick={handleDownload} className="btn-excel flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Excel
            </button>
          </div>
        </div>

        {/* System selector */}
        <div className="flex gap-2 flex-wrap">
          {SYSTEMS.map((sys) => (
            <button
              key={sys.value}
              onClick={() => setSystemType(sys.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                systemType === sys.value
                  ? "bg-accent-green text-surface font-semibold shadow-lg shadow-accent-green/20"
                  : "card text-gray-400 hover:text-white hover:border-gray-600"
              }`}
            >
              {sys.label}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        {/* Summary cards */}
        <SummaryCards snapshot={snapshot} loading={loadingSnapshot} systemType={systemType} />

        {/* Breakdown */}
        <BreakdownTable entries={snapshot?.entries || []} loading={loadingSnapshot} />

        {/* History + Hourly */}
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

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-xl animate-slide-up
            ${toast.type === "error"
              ? "bg-red-500/20 border border-red-500/30 text-red-300"
              : "bg-accent-green/20 border border-accent-green/30 text-accent-green"
            }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
