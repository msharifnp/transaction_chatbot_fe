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
  const [isOpen, setIsOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const messages = [
  "Fetching invoices",
  "Analyzing data",
  "Preparing response",
];
const [step, setStep] = useState(0);

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
  };

  return (
    <>
     <style>
      {`
        @keyframes skeleton {
          0% { background-position: 100% 0; }
          100% { background-position: 0 0; }
        }
      `}
    </style>
      {/* FLOATING OPEN BUTTON */}
      {!isOpen && (
        <button
          onClick={() => {setIsOpen(true);
            onOpen();}
          }
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

      {/* CHAT WINDOW */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            width: 960,
            maxWidth: "95vw",
            height: "calc(100vh - 48px)",
            background: "#e0f2fe",
            borderRadius: 24,
            boxShadow: "0 18px 45px rgba(15,23,42,0.28)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* HEADER */}
          <header
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#e0f2fe",
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "#020617" }}>
              Smart Invoice Assistant
            </div>
            <button
  onClick={() => {
    setIsOpen(false);
    onClose();
  }}
  style={{
    border: "none",
    background: "transparent",
    fontSize: 20,
    cursor: "pointer",
    color: "#020617",
  }}
>
  ×
</button>
          </header>

          {/* INNER PANEL */}
          <section
            style={{
              flex: 1,
              margin: 16,
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {/* CHAT BODY */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
                background: "#f8fafc",
              }}
            >
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent:
                      msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "100%",
                      padding: "12px 14px",
                      borderRadius: 14,
                      background:
                        msg.role === "user" ? "#e0ebff" : "#ffffff",
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                      color: "#0f172a",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 6,
                        color: "#334155",
                      }}
                    >
                      {msg.role === "user" ? "You" : "AI Assistant"}
                    </div>

                    {/* ================= DATABASE MODE ================= */}
                    {msg.mode === "database" && msg.data && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 12,
                          borderRadius: 12,
                          background: "#eff6ff",
                          border: "1px solid #dbeafe",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 10,
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 13 }}>
                            Data results ({msg.data.count})
                          </div>

                          {msg.messageIndex !== undefined && (
                            <button
                              onClick={() => onExportExcel(msg.messageIndex!)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 14px",
                                borderRadius: 8,
                                border: "1px solid #22c55e",
                                background: "#ecfdf5",
                                color: "#15803d",
                                fontSize: 13,
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              📊 Excel
                            </button>
                          )}
                        </div>

                        <div
                          style={{
                            maxHeight: 260,
                            overflow: "auto",
                            background: "#ffffff",
                            borderRadius: 8,
                            border: "1px solid #c7d2fe",
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
                        {/* Database Table */}
                        <div
                          style={{
                            marginTop: 8,
                            padding: 12,
                            borderRadius: 12,
                            background: "#eff6ff",
                            border: "1px solid #dbeafe",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 10,
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 13 }}>
                              Data results ({msg.hybridData.database.count})
                            </div>

                            <button
                              onClick={() => onExportExcel(msg.hybridData!.database.index)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 14px",
                                borderRadius: 8,
                                border: "1px solid #22c55e",
                                background: "#ecfdf5",
                                color: "#15803d",
                                fontSize: 13,
                                fontWeight: 700,
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
                              border: "1px solid #c7d2fe",
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

                        {/* AI Analysis Text */}
                        {msg.hybridData.ai.analysisText && (
                          <div
                            style={{
                              marginTop: 12,
                              padding: 12,
                              borderRadius: 12,
                              background: "#f0fdf4",
                              border: "1px solid #dcfce7",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: "#166534",
                                }}
                              >
                                AI Analysis
                              </div>

                              {msg.hybridData.ai.analysisIndex !== undefined && (
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    onClick={() => onExportPDF(msg.hybridData!.ai.analysisIndex!)}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: 8,
                                      border: "1px solid #fecaca",
                                      background: "#ffffff",
                                      color: "#dc2626",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    📄 PDF
                                  </button>

                                  <button
                                    onClick={() => onExportWord(msg.hybridData!.ai.analysisIndex!)}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: 8,
                                      border: "1px solid #bfdbfe",
                                      background: "#ffffff",
                                      color: "#2563eb",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    📝 Word
                                  </button>
                                </div>
                              )}
                            </div>

                            <MarkdownRenderer content={msg.hybridData.ai.analysisText} />
                          </div>
                        )}

                        {/* AI Chart */}
                        {msg.hybridData.ai.chart && msg.hybridData.ai.chart.trim().startsWith("<svg") && (
                          <div
                            style={{
                              marginTop: 12,
                              padding: 12,
                              borderRadius: 12,
                              background: "#f0fdf4",
                              border: "1px solid #dcfce7",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>
                                Chart Visualization
                              </div>

                              {msg.hybridData.ai.chartIndex !== undefined && (
                                <button
                                  onClick={() => onExportChartPNG(msg.hybridData!.ai.chartIndex!)}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    border: "1px solid #86efac",
                                    background: "#ffffff",
                                    color: "#166534",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  ⬇️ PNG
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
                              }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* ================= TEXT CONTENT (Non-SVG) ================= */}
                    {msg.content &&
                      msg.mode !== "database" &&
                      msg.mode !== "hybrid" &&
                      !msg.content.trim().startsWith("<svg") && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 12,
                            borderRadius: 12,
                            background: "#f0fdf4",
                            border: "1px solid #dcfce7",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: "#166534",
                              }}
                            >
                              AI Analysis
                            </div>

                            {msg.messageIndex !== undefined && (
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  onClick={() => onExportPDF(msg.messageIndex!)}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: 8,
                                    border: "1px solid #fecaca",
                                    background: "#ffffff",
                                    color: "#dc2626",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  📄 PDF
                                </button>

                                <button
                                  onClick={() => onExportWord(msg.messageIndex!)}
                                  style={{
                                    padding: "6px 14px",
                                    borderRadius: 8,
                                    border: "1px solid #bfdbfe",
                                    background: "#ffffff",
                                    color: "#2563eb",
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  📝 Word
                                </button>
                              </div>
                            )}
                          </div>

                          <MarkdownRenderer content={msg.content} />
                        </div>
                      )}

                    {/* ================= SVG CHART (Standalone) ================= */}
                    {msg.content &&
                      msg.mode !== "database" &&
                      msg.mode !== "hybrid" &&
                      msg.content.trim().startsWith("<svg") && (
                        <div
                          style={{
                            marginTop: 8,
                            padding: 12,
                            borderRadius: 12,
                            background: "#f0fdf4",
                            border: "1px solid #dcfce7",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>
                              Chart Visualization
                            </div>

                            {msg.messageIndex !== undefined && (
                              <button
                                onClick={() => onExportChartPNG(msg.messageIndex!)}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  border: "1px solid #86efac",
                                  background: "#ffffff",
                                  color: "#166534",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                ⬇️ PNG
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
                            }}
                          />
                        </div>
                      )}
                  </div>
                </div>
              ))}

              {loading && (
                <div
                  style={{
                    width: 260,
                    height: 38,
                    borderRadius: 14,
                    background:
                      "linear-gradient(90deg, #ececf0 25%, #93c5fd 37%, #c7d2fe 63%)",
                    backgroundSize: "400% 100%",
                    animation: "skeleton 1.4s ease infinite",
                    alignSelf: "flex-start",
                    display: "flex",
                    alignItems: "center",
                    paddingLeft: 14,
                    color: "#1e293b",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {messages[step]}…
                </div>
              )}



              <div ref={chatEndRef} />
            </div>

            {/* INPUT */}
            <div
              style={{
                padding: 16,
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                gap: 10,
                background: "#ffffff",
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
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  minHeight: 44,
                  outline: "none",
                }}
              />
              <button
                onClick={send}
                disabled={!query.trim()}
                style={{
                  width: 84,              // 👈 fixed width (same visual size)
                  height: 84,
                  borderRadius: 10,
                  border: "none",
                  background: query.trim() ? "#2563eb" : "#cbd5e1",
                  cursor: query.trim() ? "pointer" : "not-allowed",

                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="white"
                style={{
                  transform: "rotate(180deg)", // ✅ fixes direction
                  opacity: query.trim() ? 1 : 0.6,
                }}
              >
                <path d="M3 12L21 3L14 12L21 21L3 12Z" />
              </svg>

              </button>

            </div>
          </section>
        </div>
      )}
    </>
  );
}


