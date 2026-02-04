import { exportPDF, exportWord, exportExcel, exportPNG } from "../api/searchApi";

// ================= COMMON DOWNLOAD HELPER =================
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ================= SESSION CHECK =================
function ensureSession(sessionId: string | null) {
  if (!sessionId) {
    throw new Error("Session expired. Please reopen chat and try again.");
  }
}

// ================= EXPORT FUNCTIONS =================

export async function exportToPDF(
  tenantId: string,
  sessionId: string | null,
  index: number,
  title?: string
) {
  try {
    ensureSession(sessionId);

    const res = await exportPDF({
      TenantId: tenantId,
      SessionId: sessionId!,
      index,
      title,
    });

    downloadBlob(res.data, `report_${index}.pdf`);
  } catch (err: any) {
    console.error("PDF export failed", err);
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Session expired. Please reopen chat.";
    alert(errorMsg);
  }
}

export async function exportToWord(
  tenantId: string,
  sessionId: string | null,
  index: number,
  title?: string
) {
  try {
    ensureSession(sessionId);

    const res = await exportWord({
      TenantId: tenantId,
      SessionId: sessionId!,
      index,
      title,
    });

    downloadBlob(res.data, `report_${index}.docx`);
  } catch (err: any) {
    console.error("Word export failed", err);
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Session expired. Please reopen chat.";
    alert(errorMsg);
  }
}

export async function exportToExcel(
  tenantId: string,
  sessionId: string | null,
  index: number,
  sheetName?: string
) {
  try {
    ensureSession(sessionId);

    const res = await exportExcel({
      TenantId: tenantId,
      SessionId: sessionId!,
      index,
      sheet_name: sheetName,
    });

    downloadBlob(res.data, `data_${index}.xlsx`);
  } catch (err: any) {
    console.error("Excel export failed", err);
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Session expired. Please reopen chat.";
    alert(errorMsg);
  }
}

export async function exportChartPNG(
  tenantId: string,
  sessionId: string | null,
  index: number,
  width?: number,
  height?: number
) {
  try {
    ensureSession(sessionId);

    const res = await exportPNG({
      TenantId: tenantId,
      SessionId: sessionId!,
      index,
      width,
      height,
    });

    downloadBlob(res.data, `chart_${index}.png`);
  } catch (err: any) {
    console.error("PNG export failed", err);
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Session expired. Please reopen chat.";
    alert(errorMsg);
  }
}
