import { useState, useCallback } from "react";
import { searchApi } from "../api/searchApi";
import {
  ChatMessage,
  ApiResponse,
  DatabaseData,
  MessageData,
  ChatData,
  HybridData,
} from "../types/chat";

export function useChat(tenantId: string, sessionId: string) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sendMessage = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setErr(null);

    const userMsg: ChatMessage = {
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };
    setChatHistory((p) => [...p, userMsg]);

    try {
      const res = await searchApi({
        query,
        TenantId: tenantId,
        SessionId: sessionId,
      });

      const apiResponse = res.data as ApiResponse;
      const data = apiResponse.data as
        | DatabaseData
        | MessageData
        | ChatData
        | HybridData;

      console.log('[useChat] Response type:', data.response_type);

      // ==================== MESSAGE MODE ====================
      if (data.response_type === "message") {
        setChatHistory((p) => [
          ...p,
          {
            role: "assistant",
            content: data.response_message,
            timestamp: new Date().toISOString(),
            mode: "message",
          },
        ]);
      }

      // ==================== AI MODE ====================
      if (data.response_type === "ai") {
        const messages: ChatMessage[] = [];
        
        // Add analysis text if exists
        if (data.analysis_text) {
          messages.push({
            role: "assistant",
            content: data.analysis_text.text,
            timestamp: new Date().toISOString(),
            mode: "model",
            messageIndex: data.analysis_text.index,
          });
          console.log('[useChat] Added analysis text with index:', data.analysis_text.index);
        }
        
        // Add chart if exists
        if (data.chart) {
          messages.push({
            role: "assistant",
            content: data.chart.svg,
            timestamp: new Date().toISOString(),
            mode: "model",
            messageIndex: data.chart.index,
          });
          console.log('[useChat] Added chart with index:', data.chart.index);
        }
        
        // Fallback if no content
        if (messages.length === 0) {
          messages.push({
            role: "assistant",
            content: "I couldn't generate a response.",
            timestamp: new Date().toISOString(),
            mode: "model",
          });
        }
        
        setChatHistory((p) => [...p, ...messages]);
      }

      // ==================== DATABASE MODE ====================
      if (data.response_type === "database") {
        setChatHistory((p) => [
          ...p,
          {
            role: "assistant",
            timestamp: new Date().toISOString(),
            mode: "database",
            messageIndex: data.index,
            data: {
              columns: data.columns,
              rows: data.rows,
              count: data.count,
            },
          },
        ]);
        console.log('[useChat] Added database table with index:', data.index);
      }

      // ==================== HYBRID MODE ====================
      if (data.response_type === "hybrid") {
        console.log('[useChat] Processing hybrid response');

        setChatHistory((p) => [
          ...p,
          {
            role: "assistant",
            timestamp: new Date().toISOString(),
            mode: "hybrid",
            messageIndex: data.ai.analysis_text?.index ?? data.ai.chart?.index,
            hybridData: {
              database: {
                columns: data.database.columns,
                rows: data.database.rows,
                count: data.database.count,
                index: data.database.index,
              },
              ai: {
                analysisText: data.ai.analysis_text?.text,
                analysisIndex: data.ai.analysis_text?.index,
                chart: data.ai.chart?.svg,
                chartIndex: data.ai.chart?.index,
              },
            },
          },
        ]);
        console.log('[useChat] Added hybrid response');
      }
    } catch (e: any) {
      setErr(e?.message || "Request failed");
      console.error('[useChat] Error:', e);
    } finally {
      setLoading(false);
    }
  }, [tenantId, sessionId]);

  return { chatHistory, loading, err, sendMessage };
}