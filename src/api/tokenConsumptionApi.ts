import axios from "axios";
import { getAuthHeaders } from "./auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  errors: string[];
  data: T;
}

export interface TokenConsumptionRecord {
  UserId: string;
  FromDate: string;
  ToDate: string;
  Provider: string;
  InputTokens: number;
  OutputTokens: number;
  TotalTokens: number;
  RecordCount: number;
}

export interface TokenConsumptionOptions {
  UserIds: string[];
  Providers: string[];
}

export interface TokenConsumptionFilters {
  UserId: string;
  FromDate: string;
  ToDate: string;
  Provider: string;
}

function authConfig(params?: Record<string, string>) {
  return {
    headers: getAuthHeaders(),
    params,
  };
}

export async function getTokenConsumptionOptions() {
  const response = await axios.get<ApiResponse<TokenConsumptionOptions>>(
    `${API_BASE}/api/token-consumption/options`,
    authConfig()
  );
  return response.data;
}

export async function getTokenConsumptionSummary(
  filters: Partial<TokenConsumptionFilters> = {}
) {
  const params: Record<string, string> = {};

  if (filters.UserId && filters.UserId !== "All") {
    params.UserId = filters.UserId;
  }

  if (filters.Provider && filters.Provider !== "All") {
    params.Provider = filters.Provider;
  }

  if (filters.FromDate) {
    params.FromDate = filters.FromDate;
  }

  if (filters.ToDate) {
    params.ToDate = filters.ToDate;
  }

  const response = await axios.get<ApiResponse<TokenConsumptionRecord[]>>(
    `${API_BASE}/api/token-consumption/summary`,
    authConfig(params)
  );
  return response.data;
}
