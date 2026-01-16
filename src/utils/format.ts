export function formatCell(v: any, columnName?: string) {
  if (v === null || v === undefined) return "";
  if (columnName === "account_number") return String(v);
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
