import { exportPDF, exportWord, exportExcel, exportPNG } from "../api/searchApi";

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function ensureSession(sessionId: string | null) {
  if (!sessionId) {
    throw new Error("Session expired. Please reopen chat and try again.");
  }
}

export async function exportToPDF(
  sessionId: string | null,
  index: number,
  title?: string
) {
  try {
    ensureSession(sessionId);

    const res = await exportPDF({
      SessionId: sessionId,
      index,
      title,
    });

    downloadBlob(res.data, `report_${index}.pdf`);
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Session expired. Please reopen chat.";
    alert(errorMsg);
  }
}

export async function exportToWord(
  sessionId: string | null,
  index: number,
  title?: string
) {
  try {
    ensureSession(sessionId);

    const res = await exportWord({
      SessionId: sessionId,
      index,
      title,
    });

    downloadBlob(res.data, `report_${index}.docx`);
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Session expired. Please reopen chat.";
    alert(errorMsg);
  }
}

export async function exportToExcel(
  sessionId: string | null,
  index: number,
  sheetName?: string
) {
  try {
    ensureSession(sessionId);

    const res = await exportExcel({
      SessionId: sessionId,
      index,
      sheet_name: sheetName,
    });

    downloadBlob(res.data, `data_${index}.xlsx`);
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Session expired. Please reopen chat.";
    alert(errorMsg);
  }
}

export async function exportChartPNG(
  sessionId: string | null,
  index: number,
  width?: number,
  height?: number
) {
  try {
    ensureSession(sessionId);

    const res = await exportPNG({
      SessionId: sessionId,
      index,
      width,
      height,
    });

    downloadBlob(res.data, `chart_${index}.png`);
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.message ||
      err.message ||
      "Session expired. Please reopen chat.";
    alert(errorMsg);
  }
}
