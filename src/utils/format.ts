export function formatCell(v: any, columnName?: string) {
  if (v === null || v === undefined) return "";
  if (columnName === "account_number") return String(v);
  
  // Format date columns to YYYY-MM-DD
  if (columnName === "InvoiceDate" || columnName === "BillReceiveDate") {
    if (typeof v === "string") {
      // Extract YYYY-MM-DD from ISO string like "2025-12-01T00:00:00"
      return v.split("T")[0];
    }
  }
  
  if (typeof v === "number") return v.toLocaleString();
  if (typeof v === "string" && v.length > 120)
    return v.slice(0, 117) + "...";
  return String(v);
}

export function fmtNum(n: any) {
  if (n === null || n === undefined) return "—";
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
