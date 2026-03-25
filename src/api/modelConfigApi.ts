import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export interface ModelConfigRecord {
  Id: number;
  TenantId: string;
  Purpose: string;
  Provider: string;
  ModelName: string;
  ApiKey: string;
  Temperature: number;
  TopP: number;
  TopK: number;
  MaxOutputTokens: number;
  CreatedAt?: string | null;
  UpdatedAt?: string | null;
}

export interface ModelConfigPayload {
  Purpose: string;
  Provider: string;
  ModelName: string;
  ApiKey: string;
  Temperature: number;
  TopP: number;
  TopK: number;
  MaxOutputTokens: number;
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

function tenantHeaders(tenantId: string) {
  return {
    headers: {
      TenantId: tenantId,
    },
  };
}

export async function getModelConfigs(tenantId: string) {
  const response = await axios.get<ApiResponse<ModelConfigRecord[]>>(
    `${API_BASE}/api/model-config/tenantmodels`,
    tenantHeaders(tenantId)
  );
  return response.data;
}

export async function getModelConfigOptions(tenantId: string) {
  const response = await axios.get<ApiResponse<ModelConfigOptions>>(
    `${API_BASE}/api/model-config/dropdown`,
    tenantHeaders(tenantId)
  );
  return response.data;
}

export async function getModelConfigById(tenantId: string, configId: number) {
  const response = await axios.get<ApiResponse<ModelConfigRecord>>(
    `${API_BASE}/api/model-config/get/${configId}`,
    tenantHeaders(tenantId)
  );
  return response.data;
}

export async function createModelConfig(
  tenantId: string,
  payload: ModelConfigPayload
) {
  const response = await axios.post<ApiResponse<ModelConfigRecord>>(
    `${API_BASE}/api/model-config/create`,
    payload,
    tenantHeaders(tenantId)
  );
  return response.data;
}

export async function updateModelConfig(
  tenantId: string,
  configId: number,
  payload: ModelConfigPayload
) {
  const response = await axios.put<ApiResponse<ModelConfigRecord>>(
    `${API_BASE}/api/model-config/update/${configId}`,
    payload,
    tenantHeaders(tenantId)
  );
  return response.data;
}

export async function deleteModelConfig(tenantId: string, configId: number) {
  const response = await axios.delete<ApiResponse<{ Id: number }>>(
    `${API_BASE}/api/model-config/delete/${configId}`,
    tenantHeaders(tenantId)
  );
  return response.data;
}
