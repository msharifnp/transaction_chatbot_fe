import axios from "axios";
import { ApiResponse } from "../types/chat";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

// ================= SESSION =================

export function startSession(tenantId: string) {
  console.log("[startSession] 🚀 Starting session for tenant:", tenantId);
  
  return axios.post(
    `${API_BASE}/api/session/start`,
    {},
    {
      headers: { TenantId: tenantId },
      timeout: 10000,
    }
  ).then((res) => {
    console.log("[startSession] ✅ Response received:", res.data);
    return res;
  }).catch((err) => {
    console.error("[startSession] ❌ Error:", err);
    throw err;
  });
}

export const endSession = (tenantId: string, sessionId: string) => {
  return axios.post(
    `${API_BASE}/api/session/end`,
    {},
    {
      headers: {
        TenantId: tenantId,
        SessionId: sessionId,
      },
    }
  );
};


// ================= SEARCH =================

export function searchApi(payload: {
  query: string;
  TenantId: string;
  SessionId: string | null;
}) {
  console.log("[searchApi] 🚀 Sending with headers:", {
    TenantId: payload.TenantId,
    SessionId: payload.SessionId,
  });
  
  return axios.post<ApiResponse>(
    `${API_BASE}/api/search`,
    { query: payload.query },
    {
      headers: {
        TenantId: payload.TenantId,
        SessionId: payload.SessionId ?? "",
      },
      timeout: 300000,
    }
  );
}

// ================= EXPORTS =================
function cleanParams(params: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([_, v]) => v !== undefined && v !== null
    )
  );
}

async function exportGet(
  url: string,
  headers: { TenantId: string; SessionId: string },
  params: Record<string, any>
) {
  try {
    const res = await axios.get(url, {
      headers: {
        ...headers,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      params: cleanParams({
        ...params,
        _t: Date.now(),   // 🔥 cache buster
      }),
      responseType: "blob",
      timeout: 30000,
    });

    return res;

  } catch (err: any) {
    if (err.response?.data instanceof Blob) {
      const text = await err.response.data.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.detail || "Data expired. Please run the query again.");
      } catch {
        throw new Error("Data expired. Please run the query again.");
      }
    }

    throw new Error("Data expired. Please run the query again.");
  }
}



export function exportPDF(payload: {
  TenantId: string;
  SessionId: string;
  index: number;
  title?: string;
}) {
  return exportGet(
    `${API_BASE}/api/export/pdf`,
    {
      TenantId: payload.TenantId,
      SessionId: payload.SessionId,
    },
    {
      index: payload.index,
      title: payload.title,
    }
  );
}

export function exportWord(payload: {
  TenantId: string;
  SessionId: string;
  index: number;
  title?: string;
}) {
  return exportGet(
    `${API_BASE}/api/export/word`,
    {
      TenantId: payload.TenantId,
      SessionId: payload.SessionId,
    },
    {
      index: payload.index,
      title: payload.title,
    }
  );
}


export function exportExcel(payload: {
  TenantId: string;
  SessionId: string;
  index: number;
  sheet_name?: string;
}) {
  return exportGet(
    `${API_BASE}/api/export/excel`,
    {
      TenantId: payload.TenantId,
      SessionId: payload.SessionId,
    },
    {
      index: payload.index,
      sheet_name: payload.sheet_name,
    }
  );
}


export function exportPNG(payload: {
  TenantId: string;
  SessionId: string;
  index: number;
  width?: number;
  height?: number;
}) {
  return exportGet(
    `${API_BASE}/api/export/png`,
    {
      TenantId: payload.TenantId,
      SessionId: payload.SessionId,
    },
    {
      index: payload.index,
      width: payload.width,
      height: payload.height,
    }
  );
}
