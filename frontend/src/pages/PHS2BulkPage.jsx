import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function PHS2BulkPage() {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);

    try {
      const res = await axios.get("/api/phs2-bulk-status");
      setData(res.data.data || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0f14] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="btn-primary"
          >
            Back
          </button>

          <button
            onClick={fetchData}
            className="btn-primary"
          >
            Refresh
          </button>
        </div>

        <h1 className="text-2xl font-bold">
          PHS-2-LM360 Live Status
        </h1>

        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">State</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Bid</th>
                  <th className="p-3 text-left">Message</th>
                </tr>
              </thead>

              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-800"
                  >
                    <td className="p-3">{row.id}</td>

                    <td className="p-3">{row.state}</td>

                    <td className="p-3">{row.phone}</td>

                    <td
                      className={`p-3 font-semibold ${
                        row.code === 1000
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {row.code}
                    </td>

                    <td className="p-3">
                      {row.bid ? `$${row.bid}` : "-"}
                    </td>

                    <td className="p-3 text-gray-300">
                      {row.message}
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