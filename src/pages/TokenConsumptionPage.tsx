import { ChangeEvent, useEffect, useState } from "react";
import {
  getTokenConsumptionOptions,
  getTokenConsumptionSummary,
  TokenConsumptionOptions,
  TokenConsumptionRecord,
} from "../api/tokenConsumptionApi";
import "../styles/TokenConsumptionPage.css";

const ALL_OPTION = "All";

const emptyOptions: TokenConsumptionOptions = {
  UserIds: [],
  Providers: [],
};

const DEFAULT_PROVIDER_OPTIONS = ["Anthropic", "Gemini", "OpenAI"];

function getCurrentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const toIsoDate = (value: Date) => {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    fromDate: toIsoDate(monthStart),
    toDate: toIsoDate(monthEnd),
  };
}

type TokenRow = {
  UserId: string;
  FromDate: string;
  ToDate: string;
  Provider: string;
  InputTokens: number;
  OutputTokens: number;
  TotalTokens: number;
  loading?: boolean;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value || 0);
}

function createEmptyRow(userId: string, provider = ALL_OPTION): TokenRow {
  const { fromDate, toDate } = getCurrentMonthRange();
  return {
    UserId: userId,
    FromDate: fromDate,
    ToDate: toDate,
    Provider: provider,
    InputTokens: 0,
    OutputTokens: 0,
    TotalTokens: 0,
    loading: false,
  };
}

function mapRecordToRow(record: TokenConsumptionRecord): TokenRow {
  return {
    UserId: record.UserId,
    FromDate: record.FromDate,
    ToDate: record.ToDate,
    Provider: record.Provider,
    InputTokens: record.InputTokens,
    OutputTokens: record.OutputTokens,
    TotalTokens: record.TotalTokens,
    loading: false,
  };
}

export default function TokenConsumptionPage() {
  const [rows, setRows] = useState<TokenRow[]>([]);
  const [options, setOptions] = useState<TokenConsumptionOptions>(emptyOptions);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const providerOptions = [
    ALL_OPTION,
    ...Array.from(new Set([...DEFAULT_PROVIDER_OPTIONS, ...options.Providers])),
  ];

  const replaceRow = (userId: string, updater: (row: TokenRow) => TokenRow) => {
    setRows((prev) => prev.map((row) => (row.UserId === userId ? updater(row) : row)));
  };

  const fetchUserRow = async (row: TokenRow) => {
    replaceRow(row.UserId, (current) => ({ ...current, loading: true }));

    try {
      const response = await getTokenConsumptionSummary({
        UserId: row.UserId,
        FromDate: row.FromDate,
        ToDate: row.ToDate,
        Provider: row.Provider,
      });

      const nextRecord = response.data?.[0];

      replaceRow(row.UserId, (current) =>
        nextRecord
          ? {
              ...current,
              ...mapRecordToRow(nextRecord),
              FromDate: row.FromDate,
              ToDate: row.ToDate,
              Provider: row.Provider,
              loading: false,
            }
          : {
              ...current,
              FromDate: row.FromDate,
              ToDate: row.ToDate,
              Provider: row.Provider,
              InputTokens: 0,
              OutputTokens: 0,
              TotalTokens: 0,
              loading: false,
            }
      );
    } catch (err: any) {
      setError(err.response?.data?.detail?.message || err.message);
      replaceRow(row.UserId, (current) => ({ ...current, loading: false }));
    }
  };

  useEffect(() => {
    const loadPageData = async () => {
      setBootstrapping(true);
      setError(null);

      try {
        const [optionsResponse, summaryResponse] = await Promise.all([
          getTokenConsumptionOptions(),
          getTokenConsumptionSummary({
            FromDate: getCurrentMonthRange().fromDate,
            ToDate: getCurrentMonthRange().toDate,
            Provider: ALL_OPTION,
          }),
        ]);

        const nextOptions = optionsResponse.data || emptyOptions;
        const summaryRows = summaryResponse.data || [];
        const summaryMap = new Map(summaryRows.map((row) => [row.UserId, row]));
        const allUserIds = nextOptions.UserIds.length
          ? nextOptions.UserIds
          : summaryRows.map((row) => row.UserId);

        setOptions(nextOptions);
        setRows(
          allUserIds.map((userId) => {
            const existing = summaryMap.get(userId);
            return existing ? mapRecordToRow(existing) : createEmptyRow(userId);
          })
        );
      } catch (err: any) {
        setError(err.response?.data?.detail?.message || err.message);
      } finally {
        setBootstrapping(false);
      }
    };

    loadPageData();
  }, []);

  const handleRowChange = async (
    userId: string,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    const currentRow = rows.find((row) => row.UserId === userId);
    if (!currentRow) {
      return;
    }

    const nextRow = {
      ...currentRow,
      [name]: value,
    };

    replaceRow(userId, () => nextRow);
    await fetchUserRow(nextRow);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      for (const row of rows) {
        await fetchUserRow(row);
      }
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="token-consumption-page">
      <div className="token-consumption-header">
        <div>
          <h1>Token Consumption Details</h1>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={handleRefresh}
          disabled={refreshing || bootstrapping}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="token-consumption-message error">{error}</div>}

      <section className="token-consumption-panel">
        <div className="panel-heading">
          <h2>Token Usage List</h2>
          <span>{rows.length} row(s)</span>
        </div>

        {bootstrapping ? (
          <div className="token-consumption-empty">
            Loading token consumption data...
          </div>
        ) : rows.length === 0 ? (
          <div className="token-consumption-empty">
            No token consumption data found.
          </div>
        ) : (
          <div className="token-consumption-table-wrap">
            <table className="token-consumption-table">
              <colgroup>
                <col className="token-col-user" />
                <col className="token-col-date" />
                <col className="token-col-date" />
                <col className="token-col-provider" />
                <col className="token-col-metric" />
                <col className="token-col-metric" />
                <col className="token-col-metric" />
              </colgroup>
              <thead>
                <tr>
                  <th>User Id</th>
                  <th>From Date</th>
                  <th>To Date</th>
                  <th>Provider</th>
                  <th>Input Tokens</th>
                  <th>Output Tokens</th>
                  <th>Total Tokens</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.UserId}>
                    <td>{row.UserId}</td>
                    <td>
                      <input
                        className="token-row-input"
                        name="FromDate"
                        type="date"
                        value={row.FromDate}
                        onChange={(event) => void handleRowChange(row.UserId, event)}
                      />
                    </td>
                    <td>
                      <input
                        className="token-row-input"
                        name="ToDate"
                        type="date"
                        value={row.ToDate}
                        onChange={(event) => void handleRowChange(row.UserId, event)}
                      />
                    </td>
                    <td>
                      <select
                        className="token-row-input"
                        name="Provider"
                        value={row.Provider}
                        onChange={(event) => void handleRowChange(row.UserId, event)}
                      >
                        {providerOptions.map((provider) => (
                          <option key={provider} value={provider}>
                            {provider}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{row.loading ? "Loading..." : formatNumber(row.InputTokens)}</td>
                    <td>{row.loading ? "Loading..." : formatNumber(row.OutputTokens)}</td>
                    <td>{row.loading ? "Loading..." : formatNumber(row.TotalTokens)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
