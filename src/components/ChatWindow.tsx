import React, { useEffect, useRef, useState } from "react";
import { ChatMessage } from "../types/chat";
import MarkdownRenderer from "./MarkdownRenderer";
import { formatCell } from "../utils/format";
import "../styles/c1copilot.css";

const COLUMN_WIDTHS: Record<string, number> = {
  Id: 220,
  InvoiceDate: 160,
  BillReceiveDate: 160,
  AccountNumber: 140,
  InvoiceNumber: 140,
  InvoiceStatusType: 170,
  InvoiceApprovalStatus: 190,
  NetTotal: 120,
  TotalTax: 120,
  default: 150,
};

const THEME = {
  bg: "#f3f4f6",
  panel: "#ffffff",
  border: "#9EC5CA",
  accent: "#2F5597",
  accentSoft: "#e8edf7",
  text: "#1f2937",
  subtext: "#5f6b7a",
  userBubble: "#D7EBEE",
  assistantBubble: "#e5e7eb",
};

const INPUT_MIN_HEIGHT = 20;
const INPUT_MAX_HEIGHT = 20;

type Props = {
  chatHistory: ChatMessage[];
  loading: boolean;
  onSend: (query: string) => void;
  onExportPDF: (messageIndex: number) => void;
  onExportWord: (messageIndex: number) => void;
  onExportExcel: (messageIndex: number) => void;
  onExportChartPNG: (messageIndex: number) => void;
  onOpen: () => void;
  onClose: () => void;
};

export default function ChatWindow({
  chatHistory,
  loading,
  onSend,
  onOpen,
  onClose,
  onExportPDF,
  onExportWord,
  onExportExcel,
  onExportChartPNG,
}: Props) {
  const [query, setQuery] = useState("");
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const messages = ["Preparing response.", "Preparing response..", "Preparing response..."];
  const [step, setStep] = useState(0);

  useEffect(() => {
    onOpen();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loading]);

  useEffect(() => {
    if (!loading) return;
    const i = setInterval(() => {
      setStep((s) => (s + 1) % messages.length);
    }, 1500);
    return () => clearInterval(i);
  }, [loading]);

  const send = () => {
    if (!query.trim()) return;
    onSend(query.trim());
    setQuery("");
    setInputHeight(INPUT_MIN_HEIGHT);
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    const next = Math.min(
      Math.max(inputRef.current.scrollHeight, INPUT_MIN_HEIGHT),
      INPUT_MAX_HEIGHT
    );
    inputRef.current.style.height = `${next}px`;
    setInputHeight(next);
  };

  return (
    <div className="copilot-shell">
      {/* HEADER */}
      <div className="copilot-header">
        <div className="copilot-title">
          {/* <img
            src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
            alt="logo"
            style={{ width: 28, height: 28 }}
          /> */}
          <div className="sparkle">✨</div>
          <div className="copilot-title-text">
            <span>Inventory Assistant</span>
            <span>AI-powered insights</span>
          </div>
        </div>
      </div>

      <div className="copilot-main">
        <div className="copilot-chat">
          {/* MESSAGES */}
          <div className="copilot-messages">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`copilot-message-row ${msg.role === "user" ? "user" : ""
                  }`}
              >
                <div
                  className={`copilot-avatar ${msg.role === "user" ? "user" : "assistant"
                    }`}
                >
                  {msg.role === "user" ? "SYS" : "C1"}
                </div>

                <div
                  className={`copilot-bubble ${msg.role === "user" ? "user" : "assistant"
                    }`}
                >
                  {/* ================= DATABASE MODE ================= */}
                  {msg.mode === "database" && msg.data && (
                    <div style={{ marginTop: 8 }}>

                      <div
                        style={{
                          fontWeight: 700,
                          marginBottom: 8,
                          display: "flex",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 8,
                          justifyContent: "space-between"
                        }}
                      >
                        <span> {msg.data.count > 5 ? "5" : msg.data.count}{`/${msg.data.count} record(s) are shown. Click Excel icon to export all rows.`}</span>

                        <button
                          onClick={() =>
                            onExportExcel(msg.messageIndex!)
                          }
                          style={{
                            padding: "4px 10px",
                            borderRadius: 8,
                            border: "1px solid #9EC5CA",
                            background: "#ffffff",
                            color: "#2F5597",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          📊 Excel
                        </button>
                      </div>

                      <div
                        style={{
                          maxHeight: 260,
                          overflow: "auto",
                          background: "#ffffff",
                          borderRadius: 8,
                          border: `1px solid ${THEME.border}`,
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            minWidth: 1200,
                            tableLayout: "fixed",
                            borderCollapse: "collapse",
                            fontSize: 11,
                          }}
                        >
                          <thead>
                            <tr>
                              {msg.data.columns.map((c) => (
                                <th
                                  key={c}
                                  style={{
                                    padding: "8px 10px",
                                    borderBottom: "1px solid #e5e7eb",
                                    background: "#f8fafc",
                                    fontWeight: 700,
                                    position: "sticky",
                                    top: 0,
                                    textAlign: "left",
                                    whiteSpace: "nowrap",
                                    width:
                                      COLUMN_WIDTHS[c] ||
                                      COLUMN_WIDTHS.default,
                                  }}
                                >
                                  {c}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {msg.data.rows.map((r, idx) => (
                              <tr key={idx}>
                                {msg.data.columns.map((c) => (
                                  <td
                                    key={c}
                                    title={String(r[c] ?? "")}
                                    style={{
                                      padding: "8px 10px",
                                      borderBottom: "1px solid #f1f5f9",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      width:
                                        COLUMN_WIDTHS[c] ||
                                        COLUMN_WIDTHS.default,
                                    }}
                                  >
                                    {formatCell(r[c], c)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>


                    </div>
                  )}

                  {/* ================= HYBRID MODE ================= */}
                  {msg.mode === "hybrid" && msg.hybridData && (
                    <>
                      {/* DATABASE TABLE */}
                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            fontWeight: 700,
                            marginBottom: 8,
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                            justifyContent: "space-between"
                          }}
                        >
                          <span>
                              {msg.hybridData.database.count > 5 ? "5" : msg.hybridData.database.count} {`/${msg.hybridData.database.count} record(s) are shown. Click Excel icon to export all rows.`}
                          </span>


                          <button
                            onClick={() =>
                              onExportExcel(msg.hybridData!.database.index)
                            }
                            style={{
                              padding: "4px 10px",
                              borderRadius: 8,
                              border: "1px solid #9EC5CA",
                              background: "#ffffff",
                              color: "#2F5597",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            📊 Excel
                          </button>
                        </div>

                        <div
                          style={{
                            maxHeight: 260,
                            overflow: "auto",
                            background: "#ffffff",
                            borderRadius: 8,
                            border: `1px solid ${THEME.border}`,
                          }}
                        >
                          <table
                            style={{
                              width: "100%",
                              minWidth: 1200,
                              tableLayout: "fixed",
                              borderCollapse: "collapse",
                              fontSize: 11,
                            }}
                          >
                            <thead>
                              <tr>
                                {msg.hybridData.database.columns.map((c) => (
                                  <th
                                    key={c}
                                    style={{
                                      padding: "8px 10px",
                                      borderBottom: "1px solid #e5e7eb",
                                      background: "#f8fafc",
                                      fontWeight: 700,
                                      position: "sticky",
                                      top: 0,
                                      textAlign: "left",
                                      whiteSpace: "nowrap",
                                      width:
                                        COLUMN_WIDTHS[c] ||
                                        COLUMN_WIDTHS.default,
                                    }}
                                  >
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.hybridData.database.rows.map((r, idx) => (
                                <tr key={idx}>
                                  {msg.hybridData.database.columns.map((c) => (
                                    <td
                                      key={c}
                                      title={String(r[c] ?? "")}
                                      style={{
                                        padding: "8px 10px",
                                        borderBottom: "1px solid #f1f5f9",
                                        whiteSpace: "nowrap",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        width:
                                          COLUMN_WIDTHS[c] ||
                                          COLUMN_WIDTHS.default,
                                      }}
                                    >
                                      {formatCell(r[c], c)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>


                      </div>




                      {/* AI ANALYSIS TEXT */}
                      {msg.hybridData.ai.analysisText && (
                        <div style={{ marginTop: 12 }}>
                          {msg.hybridData.ai.analysisIndex !== undefined && (
                            <div style={{ marginBottom: 8, display: "flex", gap: 8, justifyContent: "flex-end"}}>
                              <button
                                className="copilot-send-btn"
                                onClick={() =>
                                  onExportPDF(msg.hybridData!.ai.analysisIndex!)
                                }
                              >
                                📄 PDF
                              </button>

                              <button
                                className="copilot-send-btn"
                                onClick={() =>
                                  onExportWord(msg.hybridData!.ai.analysisIndex!)
                                }
                              >
                                📝 Word
                              </button>
                            </div>
                          )}

                          <MarkdownRenderer
                            content={msg.hybridData.ai.analysisText}
                          />
                        </div>
                      )}

                      {/* AI SVG CHART */}
                      {msg.hybridData.ai.chart &&
                        msg.hybridData.ai.chart.trim().startsWith("<svg") && (
                          <div style={{ marginTop: 12 }}>
                            {msg.hybridData.ai.chartIndex !== undefined && (
                              <div style={{ marginBottom: 8 }}>
                                <button
                                  className="copilot-send-btn"
                                  onClick={() =>
                                    onExportChartPNG(
                                      msg.hybridData!.ai.chartIndex!
                                    )
                                  }
                                >
                                  ⬇️ PNG
                                </button>
                              </div>
                            )}

                            <div
                              dangerouslySetInnerHTML={{
                                __html: msg.hybridData.ai.chart,
                              }}
                              style={{
                                background: "#fff",
                                borderRadius: 8,
                                padding: 8,
                                overflowX: "auto",
                              }}
                            />
                          </div>
                        )}
                    </>
                  )}

                  {/* ================= STANDALONE SVG MODE ================= */}
                  {msg.content &&
                    msg.mode !== "database" &&
                    msg.mode !== "hybrid" &&
                    msg.content.trim().startsWith("<svg") && (
                      <div style={{ marginTop: 8 }}>
                        {msg.messageIndex !== undefined && (
                          <div style={{ marginBottom: 8 }}>
                            <button
                              className="copilot-send-btn"
                              onClick={() => onExportChartPNG(msg.messageIndex!)}
                            >
                              ⬇️ PNG
                            </button>
                          </div>
                        )}

                        <div
                          dangerouslySetInnerHTML={{ __html: msg.content }}
                          style={{
                            background: "#fff",
                            borderRadius: 8,
                            padding: 8,
                            overflowX: "auto",
                          }}
                        />
                      </div>
                    )}

                  {/* ================= NORMAL TEXT ================= */}
                  {msg.content &&
                    msg.mode !== "database" &&
                    msg.mode !== "hybrid" &&
                    !msg.content.trim().startsWith("<svg") && (
                      <div className="copilot-message-text">
                        {msg.messageIndex !== undefined && (
                          <div style={{ marginTop: 20, marginBottom: 8, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button
                              className="copilot-send-btn"
                              onClick={() =>
                                onExportPDF(msg.messageIndex!)
                              }
                            >
                              📄 PDF
                            </button>

                            <button
                              className="copilot-send-btn"
                              onClick={() =>
                                onExportWord(msg.messageIndex!)
                              }
                            >
                              📝 Word
                            </button>
                          </div>
                        )}
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    )}

                </div>
              </div>
            ))}

            {loading && (
              <div className="copilot-message-row">
                <div className="copilot-avatar assistant">C1</div>
                <div className="copilot-bubble assistant" style={{ maxWidth: "900 px" }}>
                  {messages[step]}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* INPUT */}
          <div className="copilot-input-bar">
            <div className="copilot-input-inner">
              <textarea
                ref={inputRef}
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Ask anything about inventory..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                style={{
                  minHeight: INPUT_MIN_HEIGHT,
                  height: inputHeight,
                  maxHeight: INPUT_MAX_HEIGHT,
                }}
              />

              <button
                className="copilot-send-btn"
                onClick={send}
                disabled={!query.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="copilot-sidebar">
          <div className="copilot-sidebar-section">
            <h4>Capabilities</h4>
            <ul>
              <li>Inventory lookup</li>
              <li>Data analysis</li>
              <li>Export reports</li>
              <li>Chart visualization</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}


