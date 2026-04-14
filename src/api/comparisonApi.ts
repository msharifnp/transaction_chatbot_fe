// import axios from "axios";

// const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

// export interface ComparisonRequest {
//   AccountNumber: string;
//   CurrentDate: string;
// }

// export interface ComparisonResultData {
//   response_type: "comparison";
//   TenantId: string;
//   AccountNumber: string;
//   File_Path: string;
// }

// export interface ComparisonResponse {
//   success: boolean;
//   code: number;
//   message: string;
//   errors: string[];
//   metadata: null | Record<string, any>;
//   data: ComparisonResultData;
// }

// export function compareInvoice(req: ComparisonRequest, tenantId: string) {
//   return axios.post<ComparisonResponse>(`${API_BASE}/api/comparison/comparison`, req, {
//     headers: {
//       TenantId: tenantId,
//     },
//     timeout: 30000,
//   }).then((res) => res.data);
// }



import axios, { AxiosError } from "axios";
import { getAuthHeaders } from "./auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export interface ComparisonRequest {
  AccountNumber: string;
  CurrentDate: string;
}

export interface ComparisonResultData {
  file_id: number;
  file_name: string;
  file_size: number;
  created_at: string;
}


export interface ComparisonResponse {
  success: boolean;
  code: number;
  message: string;
  errors?: string[];
  metadata?: null | Record<string, any>;
  data?: ComparisonResultData;
}

export async function compareInvoice(
  req: ComparisonRequest
): Promise<ComparisonResponse> {
  try {
    const response = await axios.post<ComparisonResponse>(
      `${API_BASE}/api/comparison/comparison`,
      req,
      {
        headers: getAuthHeaders(),
        timeout: 60000,
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ComparisonResponse>;

      if (axiosError.response?.data) {
        return axiosError.response.data;
      }

      return {
        success: false,
        code: axiosError.response?.status || 500,
        message: axiosError.message || "Network error occurred",
        errors: ["NETWORK_ERROR"],
      };
    }

    return {
      success: false,
      code: 500,
      message: error instanceof Error ? error.message : "Unknown error occurred",
      errors: ["UNKNOWN_ERROR"],
    };
  }
}
