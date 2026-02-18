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
  data: Invoice[] | { rows: Invoice[] } | null;
  code: number;
}

export function fetchInvoices(
  tenantId: string,
  fromDate: string,
  toDate: string
) {
  console.log("[fetchInvoices] 🚀 Fetching inventory:", { fromDate, toDate });

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
    const payload = res.data.data;
    if (Array.isArray(payload)) {
      // If data is already an array of invoices
      invoices = payload;
    } else if (payload && Array.isArray(payload.rows)) {
      // If data has rows property (objects with column keys)
      invoices = payload.rows;
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
