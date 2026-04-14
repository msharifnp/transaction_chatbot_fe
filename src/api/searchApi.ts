import axios from "axios";
import { ApiResponse, VoiceTranscriptionResponse } from "../types/chat";
import { getAuthHeaders } from "./auth";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export function startSession() {
  return axios.post(
    `${API_BASE}/api/session/start`,
    {},
    {
      headers: getAuthHeaders(),
      timeout: 10000,
    }
  );
}

export const endSession = (sessionId: string) => {
  return axios.post(
    `${API_BASE}/api/session/end`,
    {},
    {
      headers: getAuthHeaders({
        SessionId: sessionId,
      }),
    }
  );
};

export function searchApi(payload: {
  query: string;
  SessionId: string | null;
}) {
  return axios.post<ApiResponse>(
    `${API_BASE}/api/search`,
    { query: payload.query },
    {
      headers: getAuthHeaders({
        SessionId: payload.SessionId ?? "",
      }),
      timeout: 300000,
    }
  );
}

export function transcribeVoiceApi(payload: {
  audio: Blob;
  SessionId: string | null;
}) {
  const formData = new FormData();
  formData.append("audio_file", payload.audio, "voice-input.wav");

  return axios.post<VoiceTranscriptionResponse>(
    `${API_BASE}/api/voice/transcribe`,
    formData,
    {
      headers: getAuthHeaders({
        SessionId: payload.SessionId ?? "",
      }),
      timeout: 300000,
    }
  );
}

function cleanParams(params: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([_, value]) => value !== undefined && value !== null
    )
  );
}

async function exportGet(
  url: string,
  headers: { SessionId: string },
  params: Record<string, any>
) {
  try {
    return await axios.get(url, {
      headers: getAuthHeaders({
        ...headers,
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      }),
      params: cleanParams({
        ...params,
        _t: Date.now(),
      }),
      responseType: "blob",
      timeout: 30000,
    });
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
  SessionId: string;
  index: number;
  title?: string;
}) {
  return exportGet(
    `${API_BASE}/api/export/pdf`,
    {
      SessionId: payload.SessionId,
    },
    {
      index: payload.index,
      title: payload.title,
    }
  );
}

export function exportWord(payload: {
  SessionId: string;
  index: number;
  title?: string;
}) {
  return exportGet(
    `${API_BASE}/api/export/word`,
    {
      SessionId: payload.SessionId,
    },
    {
      index: payload.index,
      title: payload.title,
    }
  );
}

export function exportExcel(payload: {
  SessionId: string;
  index: number;
  sheet_name?: string;
}) {
  return exportGet(
    `${API_BASE}/api/export/excel`,
    {
      SessionId: payload.SessionId,
    },
    {
      index: payload.index,
      sheet_name: payload.sheet_name,
    }
  );
}

export function exportPNG(payload: {
  SessionId: string;
  index: number;
  width?: number;
  height?: number;
}) {
  return exportGet(
    `${API_BASE}/api/export/png`,
    {
      SessionId: payload.SessionId,
    },
    {
      index: payload.index,
      width: payload.width,
      height: payload.height,
    }
  );
}
