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

export function useChat(
  tenantId: string,
  sessionIdRef: React.MutableRefObject<string | null>,
  setSessionId: (id: string) => void
) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
    setErr(null);
  }, []);

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      setLoading(true);
      setErr(null);

      const userMsg: ChatMessage = {
        role: "user",
        content: query,
        timestamp: new Date().toLocaleString(),
      };

      setChatHistory((p) => [...p, userMsg]);

      try {
        console.log("[useChat] 📤 Sending message with SessionId:", sessionIdRef.current);
        console.log("[useChat] Query:", query);
        
        const res = await searchApi({
          query,
          TenantId: tenantId,
          SessionId: sessionIdRef.current, // ✅ always latest
        });

        const apiResponse = res.data as ApiResponse;
        
        console.log("[useChat] 📥 Response received, SessionId still:", sessionIdRef.current);

        // =========================================================
        // 🔥 CRITICAL: HANDLE SESSION ROTATION FROM BACKEND
        // =========================================================
        if (apiResponse.metadata?.new_session_id) {
          console.log("[useChat] ⚠️ Backend returned new SessionId (old one expired)");
          console.log("[useChat] Old SessionId:", sessionIdRef.current);
          console.log("[useChat] New SessionId:", apiResponse.metadata.new_session_id);
          
          sessionIdRef.current = apiResponse.metadata.new_session_id;
          setSessionId(apiResponse.metadata.new_session_id);

          console.log("[useChat] ✅ Updated sessionIdRef to:", sessionIdRef.current);
        } else {
          console.log("[useChat] ✅ No session rotation needed, keeping:", sessionIdRef.current);
        }

        const data = apiResponse.data as
          | DatabaseData
          | MessageData
          | ChatData
          | HybridData;

        console.log("[useChat] Response type:", data.response_type);

        // ==================== MESSAGE MODE ====================
        if (data.response_type === "message") {
          setChatHistory((p) => [
            ...p,
            {
              role: "assistant",
              content: data.response_message,
              timestamp: new Date().toLocaleString(),
              mode: "message",
            },
          ]);
        }

        // ==================== AI MODE ====================
        if (data.response_type === "ai") {
          const messages: ChatMessage[] = [];

          if (data.analysis_text) {
            messages.push({
              role: "assistant",
              content: data.analysis_text.text,
              timestamp: new Date().toLocaleString(),
              mode: "model",
              messageIndex: data.analysis_text.index,
            });
          }

          if (data.chart) {
            messages.push({
              role: "assistant",
              content: data.chart.svg,
              timestamp: new Date().toLocaleString(),
              mode: "model",
              messageIndex: data.chart.index,
            });
          }

          if (messages.length === 0) {
            messages.push({
              role: "assistant",
              content: "I couldn't generate a response.",
              timestamp: new Date().toLocaleString(),
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
              timestamp: new Date().toLocaleString(),
              mode: "database",
              messageIndex: data.index,
              data: {
                columns: data.columns,
                rows: data.rows,
                count: data.count,
              },
            },
          ]);
        }

        // ==================== HYBRID MODE ====================
        if (data.response_type === "hybrid") {
          setChatHistory((p) => [
            ...p,
            {
              role: "assistant",
              timestamp: new Date().toLocaleString(),
              mode: "hybrid",
              messageIndex:
                data.ai.analysis_text?.index ?? data.ai.chart?.index,
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
        }
      } catch (e: any) {
        setErr(e?.message || "Request failed");
        console.error("[useChat] Error:", e);
      } finally {
        setLoading(false);
      }
    },
    [tenantId, sessionIdRef, setSessionId]
  );

  return { chatHistory, loading, err, sendMessage, clearChatHistory  };
}
