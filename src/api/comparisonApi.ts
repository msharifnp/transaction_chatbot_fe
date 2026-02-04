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
  req: ComparisonRequest,
  tenantId: string
): Promise<ComparisonResponse> {
  try {
    console.log("[API] Calling comparison API...");
    console.log("[API] Request:", req);
    console.log("[API] TenantId:", tenantId);
    console.log("[API] URL:", `${API_BASE}/api/comparison/comparison`);
    
    const response = await axios.post<ComparisonResponse>(
      `${API_BASE}/api/comparison/comparison`,
      req,
      {
        headers: {
          TenantId: tenantId,
        },
        timeout: 60000, // Increased to 60 seconds for AI processing
      }
    );

    console.log("[API] Response received:", response.data);
    console.log("[API] Response status:", response.status);
    
    return response.data;
  } catch (error) {
    console.error("[API] Error occurred:", error);
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ComparisonResponse>;
      
      console.error("[API] Axios error details:");
      console.error("[API] - Status:", axiosError.response?.status);
      console.error("[API] - Data:", axiosError.response?.data);
      console.error("[API] - Message:", axiosError.message);
      
      // If backend returned a structured error response
      if (axiosError.response?.data) {
        return axiosError.response.data;
      }
      
      // If it's a network error or timeout
      return {
        success: false,
        code: axiosError.response?.status || 500,
        message: axiosError.message || "Network error occurred",
        errors: ["NETWORK_ERROR"],
      };
    }
    
    // Unknown error
    console.error("[API] Unknown error:", error);
    return {
      success: false,
      code: 500,
      message: error instanceof Error ? error.message : "Unknown error occurred",
      errors: ["UNKNOWN_ERROR"],
    };
  }
}