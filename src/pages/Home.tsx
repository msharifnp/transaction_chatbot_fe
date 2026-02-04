// import React, { useState, useEffect } from "react";
// import { fetchInvoices, Invoice, InvoiceResponse } from "../api/invoiceApi";
// import { formatCell, fmtNum } from "../utils/format";
// import { compareInvoice } from "../api/comparisonApi";
// import "../styles/Home.css";

// interface Props {
//   tenantId: string;
// }

// export default function Home({ tenantId }: Props) {
//   const [invoices, setInvoices] = useState<Invoice[]>([]);
//   const [columns, setColumns] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [fromDate, setFromDate] = useState("2025-09-01");
//   const [toDate, setToDate] = useState("2025-12-01");
//   const [comparingIds, setComparingIds] = useState<Set<string>>(new Set());
//   const [filePaths, setFilePaths] = useState<Record<string, string>>({});

//   const handleFetch = async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const response = await fetchInvoices(tenantId, fromDate, toDate);
//       if (response.success) {
//         setInvoices(response.data || []);
//         if (response.data && response.data.length > 0) {
//           setColumns(Object.keys(response.data[0]));
//         }
//       } else {
//         setError(response.message);
//       }
//     } catch (err: any) {
//       setError(err.response?.data?.detail?.message || err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     handleFetch();
//   }, []);

//   const displayColumns = columns.length > 0 ? columns : [
//     "Id",
//     "InvoiceDate",
//     "BillReceiveDate",
//     "AccountNumber",
//     "InvoiceNumber",
//     "InvoiceStatusType",
//     "InvoiceApprovalStatus",
//     "NetTotal",
//     "TotalTax",
//   ];

//   const handleCompare = async (invoice: Invoice) => {
//     const invoiceId = invoice.InvoiceNumber;
//     console.log(`[COMPARE] Starting for invoice: ${invoiceId}`);
    
//     // Add to comparing set
//     setComparingIds((prev) => new Set(prev).add(invoiceId));

//     try {
//       // Extract date from InvoiceDate
//       const invoiceDate = invoice.InvoiceDate as string;
//       const currentDate = invoiceDate.split("T")[0];
      
//       const req = { 
//         AccountNumber: invoice.AccountNumber as string,
//         CurrentDate: currentDate
//       };
      
//       console.log(`[COMPARE] Request:`, req);
      
//       // Call API
//       const response = await compareInvoice(req, tenantId);
      
//       console.log(`[COMPARE] Response:`, response);
      
//       // Check response
//       if (response.success && response.data?.File_Path) {
//         const filePath = response.data.File_Path;
//         console.log(`[COMPARE] ✅ Success! File path: ${filePath}`);
        
//         // Update state
//         setFilePaths((prev) => ({
//           ...prev,
//           [invoiceId]: filePath
//         }));
        
//         console.log(`[COMPARE] State updated for ${invoiceId}`);
//       } else {
//         console.error(`[COMPARE] ❌ Failed:`, response.message);
//         alert(`Comparison failed: ${response.message}`);
//       }

      
      
//     } catch (error: any) {
//       console.error(`[COMPARE] ❌ Error:`, error);
//       alert(`Error: ${error.message || 'Unknown error occurred'}`);
//     } finally {
//       // Remove from comparing set
//       setComparingIds((prev) => {
//         const newSet = new Set(prev);
//         newSet.delete(invoiceId);
//         return newSet;
//       });
//     }
//   };

//   const handleDownloadPDF = async (filePath: string, fileName: string) => {
//     try {
//       const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
//       const downloadUrl = `${API_BASE}/api/comparison/download?file_path=${encodeURIComponent(filePath)}`;
      
//       console.log(`[DOWNLOAD] Downloading: ${downloadUrl}`);
      
//       const response = await fetch(downloadUrl, {
//         method: "GET",
//         headers: {
//           "TenantId": tenantId,
//         },
//       });

//       if (!response.ok) {
//         throw new Error(`Download failed with status ${response.status}`);
//       }

//       const blob = await response.blob();
//       const link = document.createElement("a");
//       link.href = URL.createObjectURL(blob);
//       link.download = fileName;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(link.href);
      
//       console.log(`[DOWNLOAD] ✅ Success`);
//     } catch (error: any) {
//       console.error(`[DOWNLOAD] ❌ Error:`, error);
//       alert(`Failed to download PDF: ${error.message}`);
//     }
//   };

//   return (
//     <div className="home-container">
//       <h1>📊 Transaction Records</h1>

//       <div className="filters">
//         <div className="filter-group">
//           <label>From Date:</label>
//           <input
//             type="date"
//             value={fromDate}
//             onChange={(e) => setFromDate(e.target.value)}
//           />
//         </div>

//         <div className="filter-group">
//           <label>To Date:</label>
//           <input
//             type="date"
//             value={toDate}
//             onChange={(e) => setToDate(e.target.value)}
//           />
//         </div>

//         <button onClick={handleFetch} disabled={loading} className="fetch-btn">
//           {loading ? "Loading..." : "Search"}
//         </button>
//       </div>

//       {error && <div className="error-message">❌ {error}</div>}

//       {loading && <div className="loading">Loading invoices...</div>}

//       {!loading && invoices.length > 0 && (
//         <div className="table-wrapper">
//           <table className="invoices-table">
//             <thead>
//               <tr>
//                 {displayColumns.map((col) => (
//                   <th key={col}>{col}</th>
//                 ))}
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {invoices.map((invoice, idx) => {
//                 const invoiceId = invoice.InvoiceNumber;
//                 const hasFilePath = !!filePaths[invoiceId];
//                 const isComparing = comparingIds.has(invoiceId);
                
//                 // Extract date for filename
//                 const invoiceDate = invoice.InvoiceDate as string;
//                 const dateForFilename = invoiceDate.split("T")[0];
//                 const fileName = `${invoice.AccountNumber}-${dateForFilename}.pdf`;
                
//                 return (
//                   <tr key={invoiceId || idx}>
//                     {displayColumns.map((col) => (
//                       <td key={`${invoiceId}-${col}`}>
//                         {col === "NetTotal" || col === "TotalTax" || col === "GrandTotal"
//                           ? fmtNum(invoice[col as keyof Invoice])
//                           : formatCell(invoice[col as keyof Invoice], col)}
//                       </td>
//                     ))}
//                     <td>
//                       {hasFilePath ? (
//                         <button
//                           className="download-btn"
//                           onClick={() => handleDownloadPDF(filePaths[invoiceId], fileName)}
//                         >
//                           📥 Download PDF
//                         </button>
//                       ) : isComparing ? (
//                         <button className="compare-btn loading-btn" disabled>
//                           ⏳ In Progress...
//                         </button>
//                       ) : (
//                         <button
//                           className="compare-btn"
//                           onClick={() => handleCompare(invoice)}
//                         >
//                           Compare
//                         </button>
//                       )}
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {!loading && invoices.length === 0 && !error && (
//         <div className="no-data">No invoices found</div>
//       )}
//     </div>
//   );
// }




import React, { useState, useEffect } from "react";
import { fetchInvoices, Invoice } from "../api/invoiceApi";
import { formatCell, fmtNum } from "../utils/format";
import { compareInvoice } from "../api/comparisonApi";
import "../styles/Home.css";

interface Props {
  tenantId: string;
}

export default function Home({ tenantId }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("2025-09-01");
  const [toDate, setToDate] = useState("2025-12-01");
  const [comparingIds, setComparingIds] = useState<Set<string>>(new Set());
  const [fileIds, setFileIds] = useState<Record<string, number>>({});

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchInvoices(tenantId, fromDate, toDate);
      if (response.success) {
        setInvoices(response.data || []);
        if (response.data && response.data.length > 0) {
          setColumns(Object.keys(response.data[0]));
        }
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleFetch();
  }, []);

  const handleCompare = async (invoice: Invoice) => {
    const invoiceId = invoice.InvoiceNumber;
    setComparingIds((prev) => new Set(prev).add(invoiceId));

    try {
      const invoiceDate = invoice.InvoiceDate as string;
      const currentDate = invoiceDate.split("T")[0];

      const response = await compareInvoice(
        {
          AccountNumber: invoice.AccountNumber as string,
          CurrentDate: currentDate,
        },
        tenantId
      );

      if (response.success && response.data?.file_id) {
        setFileIds((prev) => ({
          ...prev,
          [invoiceId]: response.data!.file_id,
        }));
      } else {
        alert(`Comparison failed: ${response.message}`);
      }
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setComparingIds((prev) => {
        const s = new Set(prev);
        s.delete(invoiceId);
        return s;
      });
    }
  };

  // ✅ Correct download handler (sends TenantId header)
  const handleDownloadPDF = async (fileId: number) => {
    try {
      const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
      const url = `${API_BASE}/api/comparison/download/${fileId}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          TenantId: tenantId,
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `comparison-${fileId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const displayColumns =
    columns.length > 0
      ? columns
      : [
          "Id",
          "InvoiceDate",
          "BillReceiveDate",
          "AccountNumber",
          "InvoiceNumber",
          "InvoiceStatusType",
          "InvoiceApprovalStatus",
          "NetTotal",
          "TotalTax",
        ];

  return (
    <div className="home-container">
      <h1>📊 Transaction Records</h1>

      <div className="filters">
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        <button onClick={handleFetch}>{loading ? "Loading..." : "Search"}</button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {!loading && invoices.length > 0 && (
        <table className="invoices-table">
          <thead>
            <tr>
              {displayColumns.map((c) => (
                <th key={c}>{c}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, idx) => {
              const invoiceId = invoice.InvoiceNumber;
              const fileId = fileIds[invoiceId];
              const isComparing = comparingIds.has(invoiceId);

              return (
                <tr key={invoiceId || idx}>
                  {displayColumns.map((col) => (
                    <td key={col}>
                      {col === "NetTotal" || col === "TotalTax"
                        ? fmtNum(invoice[col as keyof Invoice])
                        : formatCell(invoice[col as keyof Invoice], col)}
                    </td>
                  ))}
                  <td>
                    {fileId ? (
                      <button onClick={() => handleDownloadPDF(fileId)}>
                        📥 Download PDF
                      </button>
                    ) : isComparing ? (
                      <button disabled>⏳ In Progress...</button>
                    ) : (
                      <button onClick={() => handleCompare(invoice)}>
                        Compare
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
