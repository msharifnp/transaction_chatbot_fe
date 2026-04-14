import axios from "axios";
import { getAuthHeaders } from "./auth";

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

interface InvoiceTableData {
  rows?: Invoice[];
}

export interface InvoiceResponse {
  success: boolean;
  message: string;
  data: Invoice[] | InvoiceTableData;
  code: number;
}

export function fetchInvoices(fromDate: string, toDate: string) {
  return axios
    .get<InvoiceResponse>(`${API_BASE}/api/invoices/fetch`, {
      params: {
        FromDate: fromDate,
        ToDate: toDate,
      },
      headers: getAuthHeaders(),
      timeout: 30000,
    })
    .then((res) => {
      let invoices: Invoice[] = [];
      if (res.data.data) {
        if (Array.isArray(res.data.data)) {
          invoices = res.data.data;
        } else if (res.data.data.rows && Array.isArray(res.data.data.rows)) {
          invoices = res.data.data.rows;
        }
      }

      return {
        ...res.data,
        data: invoices,
      };
    });
}
