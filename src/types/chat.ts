// ==================== MESSAGE TYPES ====================

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content?: string;
  timestamp: string;
  mode?: "message" | "database" | "model" | "hybrid";
  messageIndex?: number;
  data?: {
    columns: string[];
    rows: any[];
    count: number;
  };
  hybridData?: {
    database: {
      columns: string[];
      rows: any[];
      count: number;
      index: number;
    };
    ai: {
      analysisText?: string;
      analysisIndex?: number;
      chart?: string;
      chartIndex?: number;
    };
  };
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse {
  success: boolean;
  code: number;
  message: string;
  errors: string[];
  data: DatabaseData | MessageData | ChatData | HybridData;
}

// ==================== RESPONSE DATA TYPES ====================

export interface DatabaseData {
  response_type: "database";
  columns: string[];
  rows: any[];
  count: number;
  index: number;
}

export interface MessageData {
  response_type: "message";
  response_message: string;
}

export interface AISummary {
  text: string;
  index: number;
}

export interface AIChart {
  svg: string;
  index: number;
}

export interface ChatData {
  response_type: "ai";
  analysis_text?: AISummary | null;
  chart?: AIChart | null;
}

export interface HybridDatabasePart {
  columns: string[];
  rows: any[];
  count: number;
  index: number;
}

export interface HybridAiPart {
  ok?: boolean;
  error?: string | null;
  analysis_text?: AISummary | null;
  chart?: AIChart | null;
}

export interface HybridData {
  response_type: "hybrid";
  database: HybridDatabasePart;
  ai: HybridAiPart;
}

export interface ExportBaseRequest {
  TenantId: string;
  SessionId: string;
  index: number;
}

export interface ExportPdfRequest extends ExportBaseRequest {
  title?: string;
}

export interface ExportWordRequest extends ExportBaseRequest {
  title?: string;
}

export interface ExportExcelRequest extends ExportBaseRequest {
  sheet_name?: string;
}

export interface ExportPngRequest extends ExportBaseRequest {
  width?: number;
  height?: number;
}