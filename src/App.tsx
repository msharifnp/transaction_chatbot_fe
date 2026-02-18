import { useRef, useState } from "react";
import { useChat } from "./hooks/useChat";
import ChatWindow from "./components/ChatWindow";
import { startSession as apiStartSession } from "./api/searchApi";
import { endSession as apiEndSession } from "./api/searchApi";
import {
  exportToPDF,
  exportToWord,
  exportToExcel,
  exportChartPNG,
} from "./utils/export";

export default function App() {
  const tenantId = "A10000";

  // Backend-controlled session
  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { chatHistory, loading, sendMessage } = useChat(
    tenantId,
    sessionIdRef,
    setSessionId
  );

  // ===================== START SESSION =====================
  const startSession = async () => {
    try {
      console.log("[App] 🎯 Starting session...");

      const res = await apiStartSession(tenantId);

      const data = res.data;

      console.log("[App] Response data:", data);
      console.log("[App] SessionId from response:", data?.SessionId);

      sessionIdRef.current = data.SessionId;
      setSessionId(data.SessionId);

      console.log("[App] ✅ Session started:", data.SessionId);
      console.log("[App] sessionIdRef.current is now:", sessionIdRef.current);
    } catch (err) {
      console.error("[App] ❌ Failed to start session", err);
    }
  };

  // ===================== END SESSION =====================
  const endSession = async () => {
    try {
      if (!sessionIdRef.current) return;

      await apiEndSession(tenantId, sessionIdRef.current);

      console.log("[App] 🛑 Session ended:", sessionIdRef.current);

      sessionIdRef.current = null;
      setSessionId(null);
    } catch (err) {
      console.error("[App] Failed to end session", err);
    }
  };

  return (
    <ChatWindow
      chatHistory={chatHistory}
      loading={loading}
      onSend={sendMessage}
      onOpen={() => {
        startSession();
      }}
      onClose={endSession}
      onExportPDF={(index) => exportToPDF(tenantId, sessionIdRef.current, index)}
      onExportWord={(index) => exportToWord(tenantId, sessionIdRef.current, index)}
      onExportExcel={(index) => exportToExcel(tenantId, sessionIdRef.current, index)}
      onExportChartPNG={(index) =>
        exportChartPNG(tenantId, sessionIdRef.current, index)
      }
    />
  );
}
