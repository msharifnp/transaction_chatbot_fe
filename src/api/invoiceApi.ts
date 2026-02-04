import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

export interface Invoice {
  Id: string;
  InvoiceDate: string;
  BillReceiveDate: string;
  AccountNumber: string;
  InvoiceNumber: string;
  InvoiceStatusType: string;
  InvoiceApprovalStatus: string;
  NetTotal: number;
  TotalTax: number;
  [key: string]: any;
}

export interface InvoiceResponse {
  success: boolean;
  message: string;
  data: Invoice[];
  code: number;
}

export function fetchInvoices(
  tenantId: string,
  fromDate: string,
  toDate: string
) {
  console.log("[fetchInvoices] 🚀 Fetching invoices:", { fromDate, toDate });

  return axios.get<InvoiceResponse>(`${API_BASE}/api/invoices/fetch`, {
    params: {
      FromDate: fromDate,
      ToDate: toDate,
    },
    headers: {
      TenantId: tenantId,
    },
    timeout: 30000,
  }).then((res) => {
    console.log("[fetchInvoices] ✅ Response:", res.data);
    
    // Handle different response structures
    let invoices: Invoice[] = [];
    if (res.data.data) {
      if (Array.isArray(res.data.data)) {
        // If data is already an array of invoices
        invoices = res.data.data;
      } else if (res.data.data.rows && Array.isArray(res.data.data.rows)) {
        // If data has rows property (objects with column keys)
        invoices = res.data.data.rows;
      }
    }
    
    console.log("[fetchInvoices] Parsed invoices:", invoices);
    
    return {
      ...res.data,
      data: invoices
    };
  }).catch((err) => {
    console.error("[fetchInvoices] ❌ Error:", err);
    throw err;
  });
}