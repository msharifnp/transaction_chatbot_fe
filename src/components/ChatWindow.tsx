import React, { useEffect, useRef, useState } from "react";
import { ChatMessage } from "../types/chat";
import MarkdownRenderer from "./MarkdownRenderer";
import { formatCell } from "../utils/format";

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

type Props = {
  chatHistory: ChatMessage[];
  loading: boolean;
  onSend: (query: string) => void;
  onExportPDF: (messageIndex: number) => void;
  onExportWord: (messageIndex: number) => void;
  onExportExcel: (messageIndex: number) => void;
  onExportChartPNG: (messageIndex: number) => void;
  onOpen: () => void;
  isSessionActive: boolean;
  onClose: () => void;
};

export default function ChatWindow({
  chatHistory,
  loading,
  onSend,
  onOpen,
  isSessionActive,
  onClose,
  onExportPDF,
  onExportWord,
  onExportExcel,
  onExportChartPNG,
}: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadingSteps = ["Preparing response"];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, loading]);

  useEffect(() => {
    if (!loading) return;
    const intervalId = setInterval(() => {
      setStep((s) => (s + 1) % loadingSteps.length);
    }, 1500);

    return () => clearInterval(intervalId);
  }, [loading]);

  const send = () => {
    if (!query.trim()) return;
    onSend(query.trim());
    setQuery("");
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!isSessionActive) {
      onOpen();
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery("");
    onClose();
  };

  const handleMinimize = () => {
    setIsOpen(false);
    setQuery("");
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return Number.isNaN(date.getTime()) ? ts : date.toLocaleString();
  };

  const smallActionBtn = {
    padding: "4px 10px",
    borderRadius: 7,
    background: "#ffffff",
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };

  const renderDataTable = (columns: string[], rows: any[]) => (
    <div
      style={{
        maxHeight: 260,
        overflow: "auto",
        background: "#ffffff",
        borderRadius: 7,
        border: "1px solid #c7d2de",
        marginTop: 8,
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
            {columns.map((column) => (
              <th
                key={column}
                style={{
                  padding: "8px 10px",
                  borderBottom: "1px solid #e5e7eb",
                  background: "#eef1f5",
                  fontWeight: 700,
                  position: "sticky",
                  top: 0,
                  textAlign: "left",
                  whiteSpace: "nowrap",
                  width: COLUMN_WIDTHS[column] || COLUMN_WIDTHS.default,
                }}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {columns.map((column) => (
                <td
                  key={column}
                  title={String(row[column] ?? "")}
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid #f1f5f9",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: COLUMN_WIDTHS[column] || COLUMN_WIDTHS.default,
                  }}
                >
                  {formatCell(row[column], column)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <style>
        {`
          @keyframes skeleton {
            0% { background-position: 100% 0; }
            100% { background-position: 0 0; }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {!isOpen && (
        <button
          onClick={handleOpen}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            borderRadius: 999,
            background: "#0f172a",
            color: "#fff",
            border: "none",
            padding: "12px 20px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 12px 30px rgba(15,23,42,0.35)",
          }}
        >
          Ask IVP
        </button>
      )}

      {isOpen && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              background: "#e7e9ee",
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              right: 0,
              zIndex: 9999,
              width: "clamp(640px, 68vw, 860px)",
              maxWidth: "96vw",
              height: "100vh",
              background: "#f8fafd",
              borderRadius: 14,
              border: "none",
              boxShadow: "0 16px 36px rgba(15, 23, 42, 0.22)",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
          <header
            style={{
              padding: "14px 16px",
              position: "relative",
              display: "flex",
              justifyContent: "flex-start",
              alignItems: "center",
              background: "#ffffff",
              border: "1px solid #d9e0ec",
              borderBottom: "none",
              borderRadius: "10px 10px 0 0",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: "#335a8e" }}>
              Smart Invoice Assistant
            </div>
            <button
              onClick={handleClose}
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 28,
                height: 28,
                borderRadius: 999,
                border: "1px solid #3d4550",
                background: "#20242b",
                fontSize: 18,
                lineHeight: "18px",
                color: "#c5cbd5",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              x
            </button>
            <button
              onClick={handleMinimize}
              style={{
                position: "absolute",
                top: 6,
                right: 40,
                width: 28,
                height: 28,
                borderRadius: 999,
                border: "1px solid #7f8ea4",
                background: "#e2e8f0",
                fontSize: 18,
                lineHeight: "18px",
                color: "#334155",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
              title="Minimize"
            >
              -
            </button>
          </header>

          <section
            style={{
              flex: 1,
              margin: 0,
              borderRadius: "0 0 10px 10px",
              border: "1px solid #d9e0ec",
              borderTop: "none",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "10px 10px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: "#e7e9ee",
              }}
            >
              {chatHistory.map((msg, i) => {
                const isUser = msg.role === "user";
                const avatarLabel = isUser ? "YOU" : "AI";
                const hasTextContent = Boolean(
                  msg.content &&
                    msg.mode !== "database" &&
                    msg.mode !== "hybrid" &&
                    !msg.content.trim().startsWith("<svg")
                );
                const hasSvgContent = Boolean(
                  msg.content &&
                    msg.mode !== "database" &&
                    msg.mode !== "hybrid" &&
                    msg.content.trim().startsWith("<svg")
                );
                const isStructured = msg.mode === "database" || msg.mode === "hybrid" || hasSvgContent;

                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      width: "100%",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: isUser ? "row-reverse" : "row",
                        alignItems: "flex-start",
                        gap: 8,
                        maxWidth: "100%",
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 9,
                          background: "#2f65bd",
                          border: "1px solid #9cbbe7",
                          color: "#ffffff",
                          fontSize: 11,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                        title={isUser ? "User" : "Assistant"}
                      >
                        {avatarLabel}
                      </div>

                      <div
                        style={{
                          maxWidth: "100%",
                          width: isStructured ? "calc(100% - 32px)" : "auto",
                          padding: isStructured ? "8px 0 0" : "12px 14px",
                          borderRadius: isStructured ? 0 : 14,
                          background: isStructured ? "transparent" : "#ffffff",
                          border: isStructured ? "none" : "1px solid #b9cae3",
                          fontSize: 13,
                          color: "#213a59",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: hasTextContent || hasSvgContent ? 6 : 0,
                          }}
                        >
                          <div style={{ fontSize: 10, fontWeight: 600, color: "#5f7188" }}>
                            {formatTimestamp(msg.timestamp)}
                          </div>

                          {!isUser && hasTextContent && msg.messageIndex !== undefined && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", flexShrink: 0 }}>
                              <button
                                onClick={() => onExportPDF(msg.messageIndex!)}
                                style={{
                                  ...smallActionBtn,
                                  border: "1px solid #fecaca",
                                  color: "#dc2626",
                                }}
                              >
                                PDF
                              </button>
                              <button
                                onClick={() => onExportWord(msg.messageIndex!)}
                                style={{
                                  ...smallActionBtn,
                                  border: "1px solid #bfdbfe",
                                  color: "#2563eb",
                                }}
                              >
                                Word
                              </button>
                            </div>
                          )}
                        </div>

                        {hasTextContent && (
                          <>
                            {isUser ? (
                              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{msg.content}</div>
                            ) : (
                              <MarkdownRenderer content={msg.content!} />
                            )}
                          </>
                        )}

                        {msg.mode === "database" && msg.data && (
                          <div style={{ marginTop: 6 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                                {msg.data.rows.length}/{msg.data.count} record(s) are shown. Click Excel icon to export all rows.
                              </div>
                              {msg.messageIndex !== undefined && (
                                <button
                                  onClick={() => onExportExcel(msg.messageIndex!)}
                                  style={{
                                    ...smallActionBtn,
                                    border: "1px solid #22c55e",
                                    color: "#15803d",
                                  }}
                                >
                                  Excel
                                </button>
                              )}
                            </div>
                            {renderDataTable(msg.data.columns, msg.data.rows)}
                          </div>
                        )}

                        {msg.mode === "hybrid" && msg.hybridData && (
                          <>
                            <div style={{ marginTop: 6 }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: 13, color: "#334155" }}>
                                  {msg.hybridData.database.rows.length}/{msg.hybridData.database.count} record(s) are shown. Click Excel icon to export all rows.
                                </div>
                                <button
                                  onClick={() => onExportExcel(msg.hybridData!.database.index)}
                                  style={{
                                    ...smallActionBtn,
                                    border: "1px solid #22c55e",
                                    color: "#15803d",
                                  }}
                                >
                                  Excel
                                </button>
                              </div>
                              {renderDataTable(msg.hybridData.database.columns, msg.hybridData.database.rows)}
                            </div>

                            {msg.hybridData.ai.analysisText && (
                              <div style={{ marginTop: 12 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 10,
                                    marginBottom: 8,
                                  }}
                                >
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>
                                    Analysis
                                  </div>
                                  {msg.hybridData.ai.analysisIndex !== undefined && (
                                    <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", flexShrink: 0 }}>
                                      <button
                                        onClick={() => onExportPDF(msg.hybridData!.ai.analysisIndex!)}
                                        style={{
                                          ...smallActionBtn,
                                          border: "1px solid #fecaca",
                                          color: "#dc2626",
                                        }}
                                      >
                                        PDF
                                      </button>
                                      <button
                                        onClick={() => onExportWord(msg.hybridData!.ai.analysisIndex!)}
                                        style={{
                                          ...smallActionBtn,
                                          border: "1px solid #bfdbfe",
                                          color: "#2563eb",
                                        }}
                                      >
                                        Word
                                      </button>
                                    </div>
                                  )}
                                </div>
                                <MarkdownRenderer content={msg.hybridData.ai.analysisText} />
                              </div>
                            )}

                            {msg.hybridData.ai.chart && msg.hybridData.ai.chart.trim().startsWith("<svg") && (
                              <div style={{ marginTop: 12 }}>
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 10,
                                    marginBottom: 8,
                                  }}
                                >
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>
                                    Chart
                                  </div>
                                  {msg.hybridData.ai.chartIndex !== undefined && (
                                    <button
                                      onClick={() => onExportChartPNG(msg.hybridData!.ai.chartIndex!)}
                                      style={{
                                        ...smallActionBtn,
                                        border: "1px solid #86efac",
                                        color: "#166534",
                                      }}
                                    >
                                      PNG
                                    </button>
                                  )}
                                </div>
                                <div
                                  dangerouslySetInnerHTML={{ __html: msg.hybridData.ai.chart }}
                                  style={{
                                    background: "#fff",
                                    borderRadius: 8,
                                    padding: 8,
                                    overflowX: "auto",
                                    border: "1px solid #dcfce7",
                                  }}
                                />
                              </div>
                            )}
                          </>
                        )}

                        {hasSvgContent && (
                          <div style={{ marginTop: 8 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 10,
                                marginBottom: 8,
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>Chart</div>
                              {msg.messageIndex !== undefined && (
                                <button
                                  onClick={() => onExportChartPNG(msg.messageIndex!)}
                                  style={{
                                    ...smallActionBtn,
                                    border: "1px solid #86efac",
                                    color: "#166534",
                                  }}
                                >
                                  PNG
                                </button>
                              )}
                            </div>
                            <div
                              dangerouslySetInnerHTML={{ __html: msg.content }}
                              style={{
                                background: "#fff",
                                borderRadius: 8,
                                padding: 8,
                                overflowX: "auto",
                                border: "1px solid #dcfce7",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    direction: "ltr",
                    gap: 8,
                    color: "#3d4f69",
                    fontSize: 14,
                    lineHeight: "20px",
                    fontWeight: 600,
                  }}
                >
                  {loadingSteps[step] === "Preparing response" && (
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 999,
                        border: "2px solid #9fb6d9",
                        borderTopColor: "#123f86",
                        borderRightColor: "transparent",
                        animationName: "spin",
                        animationDuration: "700ms",
                        animationTimingFunction: "linear",
                        animationIterationCount: "infinite",
                        display: "inline-block",
                        boxSizing: "border-box",
                        flexShrink: 0,
                        order: 1,
                      }}
                    />
                  )}
                  <span style={{ order: 2 }}>{loadingSteps[step]}</span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div
              style={{
                padding: 10,
                borderTop: "1px solid #d9e0ec",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#f8fafd",
              }}
            >
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything about invoice..."
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                style={{
                  flex: 1,
                  resize: "none",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d0d9e6",
                  fontSize: 16,
                  minHeight: 44,
                  outline: "none",
                  background: "#ffffff",
                }}
              />
              <button
                onClick={send}
                disabled={!query.trim()}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 10,
                  border: "1px solid #c5d0df",
                  background: query.trim() ? "#95a9bf" : "#d4dde8",
                  cursor: query.trim() ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="white"
                  style={{
                    transform: "rotate(180deg)",
                    opacity: query.trim() ? 1 : 0.6,
                  }}
                >
                  <path d="M3 12L21 3L14 12L21 21L3 12Z" />
                </svg>
              </button>
            </div>
          </section>
          </div>
        </>
      )}
    </>
  );
}
