import React from "react";

export default function MarkdownRenderer({
  content,
}: {
  content: string;
}) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let listItems: string[] = [];
  let tableLines: string[] = [];
  let inTable = false;

  const formatInlineText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} style={{ fontWeight: 600, color: "#0f172a" }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            style={{
              background: "#f1f5f9",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 12,
              color: "#0f172a",
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul
          key={`list-${elements.length}`}
          style={{
            margin: "12px 0",
            paddingLeft: 22,
            listStyleType: "disc",
          }}
        >
          {listItems.map((item, i) => (
            <li
              key={i}
              style={{
                marginBottom: 6,
                lineHeight: 1.6,
                color: "#475569",
                fontSize: 14,
              }}
            >
              {formatInlineText(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushTable = () => {
    if (tableLines.length === 0) return;

    const rows = tableLines.filter(
      (l) => !l.match(/^\|?[\s\-:|]+\|?$/)
    );

    if (rows.length > 0) {
      const header = rows[0]
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);

      const body = rows.slice(1).map((r) =>
        r
          .split("|")
          .map((c) => c.trim())
          .filter(Boolean)
      );

      elements.push(
        <div
          key={`table-${elements.length}`}
          style={{
            margin: "16px 0",
            overflowX: "auto",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: "#ffffff",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                {header.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: "10px 12px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#0f172a",
                      borderBottom: "2px solid #cbd5e1",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid #f1f5f9",
                        whiteSpace: "nowrap",
                        color: "#334155",
                      }}
                    >
                      {formatInlineText(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    tableLines = [];
    inTable = false;
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Table
    if (trimmed.startsWith("|") || (inTable && trimmed.includes("|"))) {
      flushList();
      inTable = true;
      tableLines.push(trimmed);
      return;
    } else if (inTable) {
      flushTable();
    }

    // Empty line
    if (!trimmed) {
      flushList();
      flushTable();
      return;
    }

    // H2
    if (trimmed.startsWith("## ")) {
      flushList();
      flushTable();
      elements.push(
        <h2
          key={`h2-${idx}`}
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#0f172a",
            margin: "20px 0 10px",
            borderBottom: "2px solid #3b82f6",
            paddingBottom: 6,
          }}
        >
          {trimmed.replace(/^##\s*/, "")}
        </h2>
      );
      return;
    }

    // H3
    if (trimmed.startsWith("### ")) {
      flushList();
      flushTable();
      elements.push(
        <h3
          key={`h3-${idx}`}
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#1e293b",
            margin: "14px 0 6px",
            paddingLeft: 8,
            borderLeft: "3px solid #3b82f6",
          }}
        >
          {trimmed.replace(/^###\s*/, "")}
        </h3>
      );
      return;
    }

    // Bullet list
    if (trimmed.match(/^[*\-+]\s+/)) {
      listItems.push(trimmed.replace(/^[*\-+]\s+/, ""));
      return;
    }

    // Numbered list
    if (trimmed.match(/^\d+\.\s+/)) {
      flushList();
      flushTable();
      elements.push(
        <div
          key={`num-${idx}`}
          style={{
            marginBottom: 6,
            color: "#334155",
            fontSize: 14,
          }}
        >
          <strong style={{ color: "#3b82f6", marginRight: 6 }}>
            {trimmed.match(/^\d+/)?.[0]}.
          </strong>
          {formatInlineText(trimmed.replace(/^\d+\.\s+/, ""))}
        </div>
      );
      return;
    }

    // Horizontal rule
    if (trimmed === "---" || trimmed === "***") {
      flushList();
      flushTable();
      elements.push(
        <hr
          key={`hr-${idx}`}
          style={{
            margin: "20px 0",
            border: "none",
            borderTop: "1px solid #e2e8f0",
          }}
        />
      );
      return;
    }

    // Paragraph
    flushList();
    flushTable();
    elements.push(
      <p
        key={`p-${idx}`}
        style={{
          marginBottom: 8,
          lineHeight: 1.7,
          color: "#475569",
          fontSize: 14,
        }}
      >
        {formatInlineText(trimmed)}
      </p>
    );
  });

  flushList();
  flushTable();

  return <>{elements}</>;
}
