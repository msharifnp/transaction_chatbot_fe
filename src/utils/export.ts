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

// ================= EXPORT FUNCTIONS =================

export async function exportToPDF(
  tenantId: string,
  sessionId: string,
  index: number,
  title?: string
) {
  try {
    const res = await exportPDF({
      TenantId: tenantId,
      SessionId: sessionId,
      index,
      title,
    });
    
    downloadBlob(res.data, `report_${index}.pdf`);
  } catch (err: any) {
    console.error("PDF export failed", err);
    const errorMsg = err.response?.data?.message || "Failed to export PDF";
    alert(errorMsg);
  }
}

export async function exportToWord(
  tenantId: string,
  sessionId: string,
  index: number,
  title?: string
) {
  try {
    const res = await exportWord({
      TenantId: tenantId,
      SessionId: sessionId,
      index,
      title,
    });
    
    downloadBlob(res.data, `report_${index}.docx`);
  } catch (err: any) {
    console.error("Word export failed", err);
    const errorMsg = err.response?.data?.message || "Failed to export Word";
    alert(errorMsg);
  }
}

export async function exportToExcel(
  tenantId: string,
  sessionId: string,
  index: number,
  sheetName?: string
) {
  try {
    const res = await exportExcel({
      TenantId: tenantId,
      SessionId: sessionId,
      index,
      sheet_name: sheetName,
    });
    
    downloadBlob(res.data, `data_${index}.xlsx`);
  } catch (err: any) {
    console.error("Excel export failed", err);
    const errorMsg = err.response?.data?.message || "Failed to export Excel";
    alert(errorMsg);
  }
}

export async function exportChartPNG(
  tenantId: string,
  sessionId: string,
  index: number,
  width?: number,
  height?: number
) {
  try {
    const res = await exportPNG({
      TenantId: tenantId,
      SessionId: sessionId,
      index,
      width,
      height,
    });
    
    downloadBlob(res.data, `chart_${index}.png`);
  } catch (err: any) {
    console.error("PNG export failed", err);
    const errorMsg = err.response?.data?.message || "Failed to export PNG";
    alert(errorMsg);
  }
}