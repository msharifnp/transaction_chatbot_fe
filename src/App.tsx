import { useRef } from "react";
import { useChat } from "./hooks/useChat";
import ChatWindow from "./components/ChatWindow";
import {
  exportToPDF,
  exportToWord,
  exportToExcel,
  exportChartPNG
} from "./utils/export";

export default function App() {
  const tenantId = "a5fbcb69-eda8-20bd-4c29-3a1a8969d9e4";

  // ✅ stable session id
  const sessionIdRef = useRef(`ivp-${Date.now()}`);
  const sessionId = sessionIdRef.current;

  const { chatHistory, loading, sendMessage } =
    useChat(tenantId, sessionId);

  return (
    <ChatWindow
      chatHistory={chatHistory}
      loading={loading}
      onSend={sendMessage}

      onExportPDF={(index) =>
        exportToPDF(tenantId, sessionId, index)
      }

      onExportWord={(index) =>
        exportToWord(tenantId, sessionId, index)
      }

      onExportExcel={(index) =>
        exportToExcel(tenantId, sessionId, index)
      }

      onExportChartPNG={(index) =>
        exportChartPNG(tenantId, sessionId, index)
      }
    />
  );
}



