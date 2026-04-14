import { useEffect, useRef, useState } from "react";
import { useChat } from "./hooks/useChat";
import Home from "./pages/Home";
import ModelConfigPage from "./pages/ModelConfigPage";
import TokenConsumptionPage from "./pages/TokenConsumptionPage";
import ChatWindow from "./components/ChatWindow";
import { startSession as apiStartSession } from "./api/searchApi";
import { endSession as apiEndSession } from "./api/searchApi";
import {
  exportToPDF,
  exportToWord,
  exportToExcel,
  exportChartPNG,
} from "./utils/export";

type AppView = "transactions" | "model-config" | "token-usage";

function getViewFromHash(): AppView {
  switch (window.location.hash) {
    case "#/model-config":
      return "model-config";
    case "#/token-usage":
      return "token-usage";
    default:
      return "transactions";
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>(getViewFromHash);

  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { chatHistory, loading, sendMessage, sendVoiceMessage, clearChat } = useChat(
    sessionIdRef,
    setSessionId
  );

  useEffect(() => {
    const handleHashChange = () => {
      setActiveView(getViewFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateTo = (view: AppView) => {
    switch (view) {
      case "model-config":
        window.location.hash = "/model-config";
        break;
      case "token-usage":
        window.location.hash = "/token-usage";
        break;
      default:
        window.location.hash = "/";
    }
  };

  const startSession = async () => {
    try {
      const res = await apiStartSession();
      const data = res.data;

      sessionIdRef.current = data.SessionId;
      setSessionId(data.SessionId);
    } catch (err) {
      console.error("[App] Failed to start session", err);
    }
  };

  const endSession = async () => {
    try {
      if (sessionIdRef.current) {
        await apiEndSession(sessionIdRef.current);
      }
    } catch (err) {
      console.error("[App] Failed to end session", err);
    } finally {
      sessionIdRef.current = null;
      setSessionId(null);
      clearChat();
    }
  };

  return (
    <div className="app-container">
      <div className="main-layout">
        <div className="chat-section">
          <ChatWindow
            chatHistory={chatHistory}
            loading={loading}
            onSend={sendMessage}
            onSendVoice={sendVoiceMessage}
            onOpen={startSession}
            isSessionActive={Boolean(sessionId)}
            onClose={endSession}
            onExportPDF={(index) => exportToPDF(sessionIdRef.current, index)}
            onExportWord={(index) => exportToWord(sessionIdRef.current, index)}
            onExportExcel={(index) => exportToExcel(sessionIdRef.current, index)}
            onExportChartPNG={(index) =>
              exportChartPNG(sessionIdRef.current, index)
            }
          />
        </div>

        <div className="transaction-section">
          <div className="workspace-nav">
            <button
              className={
                activeView === "transactions"
                  ? "workspace-tab active"
                  : "workspace-tab"
              }
              onClick={() => navigateTo("transactions")}
              type="button"
            >
              Transactions
            </button>
            <button
              className={
                activeView === "model-config"
                  ? "workspace-tab active"
                  : "workspace-tab"
              }
              onClick={() => navigateTo("model-config")}
              type="button"
            >
              Model Config
            </button>
            <button
              className={
                activeView === "token-usage"
                  ? "workspace-tab active"
                  : "workspace-tab"
              }
              onClick={() => navigateTo("token-usage")}
              type="button"
            >
              Token Usage
            </button>
          </div>

          {activeView === "model-config" ? (
            <ModelConfigPage />
          ) : activeView === "token-usage" ? (
            <TokenConsumptionPage />
          ) : (
            <Home />
          )}
        </div>
      </div>
    </div>
  );
}
