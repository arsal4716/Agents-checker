import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar.jsx";
import SummaryCards from "../components/SummaryCards.jsx";
import BreakdownTable from "../components/BreakdownTable.jsx";
import RecentChecksTable from "../components/RecentChecksTable.jsx";
import HourlyAveragesTable from "../components/HourlyAveragesTable.jsx";

import {
  getLatest,
  triggerRefresh,
  getRecent,
  getHourlyAverages,
  getDownloadUrl,
} from "../api/client.js";

const SYSTEMS = [
  { value: "hc", label: "Health Connect" },
  { value: "lm", label: "Lead Market 360" },
  { value: "pros", label: "Pros-LM360" },
  { value: "phs2new", label: "PHS-2" },
  { value: "phs2", label: "PHS-2 (Temporary)" },
  { value: "publisher", label: "Publisher Combined" },
];

const AUTO_REFRESH_INTERVAL = 60;

export default function DashboardPage() {
  const navigate = useNavigate();

  const [systemType, setSystemType] = useState("hc");
  const [stateFilter, setStateFilter] = useState("TX");

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
    if (!silent) {
      setLoadingSnapshot(true);
      setLoadingRecent(true);
    }

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
    setSnapshot(null);
    setRecentChecks([]);
    setHourlyAverages([]);

    loadAll(systemType, stateFilter);
    loadHourly(systemType, hourlyDays, stateFilter);
  }, [systemType, stateFilter]);

  useEffect(() => {
    loadHourly(systemType, hourlyDays, stateFilter);
  }, [hourlyDays]);

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

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [systemType, stateFilter, hourlyDays]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    setError("");

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
      <Navbar
        lastChecked={snapshot?.checkedAt}
        autoRefreshSecs={autoRefreshSecs}
      />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">Agent Availability</h1>

            <p className="text-sm text-gray-500 mt-0.5">
              Auto-checked every 10 min · Dashboard refreshes every{" "}
              {AUTO_REFRESH_INTERVAL}s
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="btn-primary"
            >
              {refreshing ? "Refreshing..." : "Refresh Now"}
            </button>

            <a
              href={getDownloadUrl(systemType)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-excel"
            >
              Export Excel
            </a>
          </div>
        </div>

        {/* System selector */}
        <div className="flex gap-2 flex-wrap">
          {SYSTEMS.map((sys) => (
            <button
              key={sys.value}
              onClick={() => {
                if (sys.value === "phs2") {
                  navigate("/dashboard/temporary");
                  return;
                }

                setSystemType(sys.value);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                systemType === sys.value
                  ? "bg-accent-green text-surface font-semibold"
                  : "card text-gray-400 hover:text-white"
              }`}
            >
              {sys.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <SummaryCards
          snapshot={snapshot}
          loading={loadingSnapshot}
          systemType={systemType}
        />

        <BreakdownTable
          entries={snapshot?.entries || []}
          loading={loadingSnapshot}
        />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RecentChecksTable
            checks={recentChecks}
            loading={loadingRecent}
            stateFilter={stateFilter}
          />

          <HourlyAveragesTable
            averages={hourlyAverages}
            loading={loadingHourly}
            days={hourlyDays}
            onDaysChange={setHourlyDays}
            stateFilter={stateFilter}
          />
        </div>
      </main>
    </div>
  );
}
