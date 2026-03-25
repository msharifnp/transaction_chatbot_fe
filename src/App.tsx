import { useEffect, useRef, useState } from "react";
import { useChat } from "./hooks/useChat";
import Home from "./pages/Home";
import ModelConfigPage from "./pages/ModelConfigPage";
import ChatWindow from "./components/ChatWindow";
import { startSession as apiStartSession } from "./api/searchApi";
import { endSession as apiEndSession } from "./api/searchApi";
import {
  exportToPDF,
  exportToWord,
  exportToExcel,
  exportChartPNG,
} from "./utils/export";

type AppView = "transactions" | "model-config";

function getViewFromHash(): AppView {
  return window.location.hash === "#/model-config"
    ? "model-config"
    : "transactions";
}

export default function App() {
  const tenantId = "a5fbcb69-eda8-20bd-4c29-3a1a8969d9e4";
  const [activeView, setActiveView] = useState<AppView>(getViewFromHash);

  const sessionIdRef = useRef<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const { chatHistory, loading, sendMessage, clearChat } = useChat(
    tenantId,
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
    window.location.hash = view === "model-config" ? "/model-config" : "/";
  };

  const startSession = async () => {
    try {
      const res = await apiStartSession(tenantId);
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
        await apiEndSession(tenantId, sessionIdRef.current);
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
            onOpen={startSession}
            isSessionActive={Boolean(sessionId)}
            onClose={endSession}
            onExportPDF={(index) =>
              exportToPDF(tenantId, sessionIdRef.current, index)
            }
            onExportWord={(index) =>
              exportToWord(tenantId, sessionIdRef.current, index)
            }
            onExportExcel={(index) =>
              exportToExcel(tenantId, sessionIdRef.current, index)
            }
            onExportChartPNG={(index) =>
              exportChartPNG(tenantId, sessionIdRef.current, index)
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
          </div>

          {activeView === "model-config" ? (
            <ModelConfigPage tenantId={tenantId} />
          ) : (
            <Home tenantId={tenantId} />
          )}
        </div>
      </div>
    </div>
  );
}
