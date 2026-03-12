const XLSX = require("xlsx");

const TYPE_LABELS = {
  hc: "HealthConnect",
  lm: "LeadMarket360",
  pros: "Pros-LM360",
  publisher: "PublisherCombined",
};

function buildExcel(snapshot) {
  const checkedAt = new Date(snapshot.checkedAt).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const label = TYPE_LABELS[snapshot.systemType] || snapshot.systemType;
  const filename = `${label}_${checkedAt}.xlsx`;

  // Summary sheet
  const summaryData = [
    { Field: "System", Value: label },
    { Field: "Checked At", Value: new Date(snapshot.checkedAt).toLocaleString() },
    { Field: "Total Ready", Value: snapshot.totalReady },
    { Field: "Total Active", Value: snapshot.totalActive },
    { Field: "Success Count", Value: snapshot.meta.successCount },
    { Field: "Error Count", Value: snapshot.meta.errorCount },
  ];

  // Entries sheet
  const entriesData = snapshot.entries.map((e) => ({
    State: e.state,
    Phone: e.phone,
    Ready: e.ready,
    Active: e.active,
    Reason: e.reason || "",
    Cause: e.cause || "",
    "Has Error": e.hasError ? "Yes" : "No",
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(entriesData), "Breakdown");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return { buffer, filename };
}

module.exports = { buildExcel };
