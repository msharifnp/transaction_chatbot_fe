import axios from "axios";
import { getAuthHeaders } from "./auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export interface ModelConfigRecord {
  Id: number;
  TenantId: string;
  Purpose: string;
  Provider: string;
  ModelName: string;
  CredentialsRef: string;
  Config: Record<string, any>;
  CreatedAt?: string | null;
  UpdatedAt?: string | null;
}

export interface ModelConfigPayload {
  Purpose: string;
  Provider: string;
  ModelName: string;
  CredentialsRef: string;
  SecretValue?: string;
  Config: Record<string, any>;
}

interface ApiResponse<T> {
  success: boolean;
  code: number;
  message: string;
  errors: string[];
  data: T;
}

export interface ModelConfigOptions {
  purposes: string[];
  providers: string[];
  models_by_provider: Record<string, string[]>;
}

function authHeaders() {
  return {
    headers: getAuthHeaders(),
  };
}

export async function getModelConfigs() {
  const response = await axios.get<ApiResponse<ModelConfigRecord[]>>(
    `${API_BASE}/api/model-config/tenantmodels`,
    authHeaders()
  );
  return response.data;
}

export async function getModelConfigOptions() {
  const response = await axios.get<ApiResponse<ModelConfigOptions>>(
    `${API_BASE}/api/model-config/dropdown`,
    authHeaders()
  );
  return response.data;
}

export async function getModelConfigById(configId: number) {
  const response = await axios.get<ApiResponse<ModelConfigRecord>>(
    `${API_BASE}/api/model-config/get/${configId}`,
    authHeaders()
  );
  return response.data;
}

export async function createModelConfig(payload: ModelConfigPayload) {
  const response = await axios.post<ApiResponse<ModelConfigRecord>>(
    `${API_BASE}/api/model-config/create`,
    payload,
    authHeaders()
  );
  return response.data;
}

export async function updateModelConfig(
  configId: number,
  payload: ModelConfigPayload
) {
  const response = await axios.put<ApiResponse<ModelConfigRecord>>(
    `${API_BASE}/api/model-config/update/${configId}`,
    payload,
    authHeaders()
  );
  return response.data;
}

export async function deleteModelConfig(configId: number) {
  const response = await axios.delete<ApiResponse<{ Id: number }>>(
    `${API_BASE}/api/model-config/delete/${configId}`,
    authHeaders()
  );
  return response.data;
}
