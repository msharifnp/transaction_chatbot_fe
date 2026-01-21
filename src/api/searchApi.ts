import axios from "axios";
import { ApiResponse } from "../types/chat";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export function searchApi(payload: any) {
  return axios.post<ApiResponse>(
    `${API_BASE}/api/search`,
    payload,
    { timeout: 300000 }
  );
}

// ✅ NEW: POST-based export functions
export function exportPDF(payload: {
  TenantId: string;
  SessionId: string;
  index: number;
  title?: string;
}) {
  return axios.post(
    `${API_BASE}/api/export/pdf`,
    { title: "Financial Report", ...payload },
    { responseType: "blob", timeout: 30000 }
  );
}

export function exportWord(payload: {
  TenantId: string;
  SessionId: string;
  index: number;
  title?: string;
}) {
  return axios.post(
    `${API_BASE}/api/export/word`,
    { title: "Financial Report", ...payload },
    { responseType: "blob", timeout: 30000 }
  );
}

export function exportExcel(payload: {
  TenantId: string;
  SessionId: string;
  index: number;
  sheet_name?: string;
}) {
  return axios.post(
    `${API_BASE}/api/export/excel`,
    { sheet_name: "Financial Data", ...payload },
    { responseType: "blob", timeout: 30000 }
  );
}

export function exportPNG(payload: {
  TenantId: string;
  SessionId: string;
  index: number;
  width?: number;
  height?: number;
}) {
  return axios.post(
    `${API_BASE}/api/export/png`,
    { width: 1920, height: 1120, ...payload },
    { responseType: "blob", timeout: 30000 }
  );
}

