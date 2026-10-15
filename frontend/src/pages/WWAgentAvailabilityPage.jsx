import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";

const AUTO_REFRESH = 60;

export default function WWAgentAvailabilityPage() {
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState({ b1: 0, b2: 0, combined: 0 });
  const [loading, setLoading] = useState(true);
  const [autoRefreshSecs, setAutoRefreshSecs] = useState(AUTO_REFRESH);

  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await axios.get("/api/ww-agent-availability");
      setData(res.data.data || []);
      setTotals(res.data.totals || { b1: 0, b2: 0, combined: 0 });
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setAutoRefreshSecs(AUTO_REFRESH);
    clearInterval(timerRef.current);
    clearInterval(countdownRef.current);

    timerRef.current = setInterval(() => {
      fetchData(true);
      setAutoRefreshSecs(AUTO_REFRESH);
    }, AUTO_REFRESH * 1000);

    countdownRef.current = setInterval(() => {
      setAutoRefreshSecs((s) => (s <= 1 ? AUTO_REFRESH : s - 1));
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(countdownRef.current);
    };
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Agent Availability</h1>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-display">
              Refreshes in {autoRefreshSecs}s
            </span>
            <button onClick={() => fetchData()} className="btn-primary py-1.5 px-3 text-xs">
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-display">B1</p>
            <p className="text-3xl font-bold font-display text-white mt-1">{totals.b1}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-display">B2</p>
            <p className="text-3xl font-bold font-display text-white mt-1">{totals.b2}</p>
          </div>
          <div className="card p-5 border-accent-green/30">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-display">Combined</p>
            <p className="text-3xl font-bold font-display text-accent-green mt-1">{totals.combined}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-3 text-left">State</th>
                  <th className="p-3 text-right">B1</th>
                  <th className="p-3 text-right">B2</th>
                  <th className="p-3 text-right">Combined</th>
                </tr>
              </thead>

              <tbody>
                {data.map((row) => (
                  <tr key={row.state} className="border-b border-gray-800">
                    <td className="p-3 font-semibold">{row.state}</td>

                    <td className={`p-3 text-right font-display ${row.b1 ? "text-accent-green" : "text-gray-500"}`}>
                      {row.b1}
                    </td>

                    <td className={`p-3 text-right font-display ${row.b2 ? "text-accent-green" : "text-gray-500"}`}>
                      {row.b2}
                    </td>

                    <td className="p-3 text-right font-display font-semibold">
                      {row.combined}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
