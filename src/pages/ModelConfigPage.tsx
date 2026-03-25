import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  createModelConfig,
  deleteModelConfig,
  getModelConfigById,
  getModelConfigs,
  getModelConfigOptions,
  ModelConfigOptions,
  ModelConfigPayload,
  ModelConfigRecord,
  updateModelConfig,
} from "../api/modelConfigApi";
import "../styles/ModelConfigPage.css";

interface Props {
  tenantId: string;
}

const emptyOptions: ModelConfigOptions = {
  purposes: [],
  providers: [],
  models_by_provider: {},
};

const emptyForm: ModelConfigPayload = {
  Purpose: "Technical",
  Provider: "Anthropic",
  ModelName: "Claude-3-Opus",
  ApiKey: "",
  Temperature: 0.0,
  TopP: 0.8,
  TopK: 20,
  MaxOutputTokens: 10000,
};

function buildVisibleKeyMap(configList: ModelConfigRecord[]) {
  return configList.reduce<Record<number, boolean>>((acc, config) => {
    acc[config.Id] = false;
    return acc;
  }, {});
}

function EyeToggleButton({
  visible,
  onClick,
  label,
}: {
  visible: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className="icon-btn"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6S2 12 2 12Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        {visible && (
          <path
            d="M4 20 20 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        )}
      </svg>
    </button>
  );
}

function maskApiKey(apiKey: string) {
  if (!apiKey) {
    return "-";
  }

  return "*".repeat(Math.max(8, Math.min(apiKey.length, 16)));
}

export default function ModelConfigPage({ tenantId }: Props) {
  const [configs, setConfigs] = useState<ModelConfigRecord[]>([]);
  const [options, setOptions] = useState<ModelConfigOptions>(emptyOptions);
  const [form, setForm] = useState<ModelConfigPayload>(emptyForm);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false);
  const [visibleConfigKeys, setVisibleConfigKeys] = useState<Record<number, boolean>>({});

  const getModelOptions = (provider: string, selectedModel?: string) => {
    const providerModels = options.models_by_provider[provider] || [];
    if (selectedModel && !providerModels.includes(selectedModel)) {
      return [selectedModel, ...providerModels];
    }
    return providerModels;
  };

  const loadConfigs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getModelConfigs(tenantId);
      const configList = response.data || [];
      setConfigs(configList);
      setVisibleConfigKeys(buildVisibleKeyMap(configList));
    } catch (err: any) {
      setError(err.response?.data?.detail?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadPageData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [configResponse, optionsResponse] = await Promise.all([
          getModelConfigs(tenantId),
          getModelConfigOptions(tenantId),
        ]);

        const configList = configResponse.data || [];
        setConfigs(configList);
        setVisibleConfigKeys(buildVisibleKeyMap(configList));
        setOptions(optionsResponse.data || emptyOptions);

        const firstPurpose = optionsResponse.data?.purposes?.[0] || emptyForm.Purpose;
        const firstProvider = optionsResponse.data?.providers?.[0] || emptyForm.Provider;
        const firstModel =
          optionsResponse.data?.models_by_provider?.[firstProvider]?.[0] ||
          emptyForm.ModelName;

        setForm((prev) => ({
          ...prev,
          Purpose: optionsResponse.data?.purposes?.includes(prev.Purpose)
            ? prev.Purpose
            : firstPurpose,
          Provider: optionsResponse.data?.providers?.includes(prev.Provider)
            ? prev.Provider
            : firstProvider,
          ModelName:
            optionsResponse.data?.models_by_provider?.[prev.Provider]?.includes(prev.ModelName)
              ? prev.ModelName
              : firstModel,
        }));
      } catch (err: any) {
        setError(err.response?.data?.detail?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPageData();
  }, [tenantId]);

  const modelOptions = getModelOptions(form.Provider, form.ModelName);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    const numericFields = ["Temperature", "TopP", "TopK", "MaxOutputTokens"];

    if (name === "Provider") {
      const nextModels = options.models_by_provider[value] || [];
      setForm((prev) => ({
        ...prev,
        Provider: value,
        ModelName: nextModels[0] || "",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: numericFields.includes(name) ? Number(value) : value,
    }));
  };

  const resetForm = (clearMessages = true) => {
    const firstPurpose = options.purposes[0] || emptyForm.Purpose;
    const firstProvider = options.providers[0] || emptyForm.Provider;
    const firstModel =
      options.models_by_provider[firstProvider]?.[0] || emptyForm.ModelName;

    setForm({
      ...emptyForm,
      Purpose: firstPurpose,
      Provider: firstProvider,
      ModelName: firstModel,
    });
    setSelectedId(null);
    setIsApiKeyVisible(false);
    if (clearMessages) {
      setSuccessMessage(null);
      setError(null);
    }
  };

  const handleEdit = async (configId: number) => {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await getModelConfigById(tenantId, configId);
      const config = response.data;
      setSelectedId(config.Id);
      setIsApiKeyVisible(false);
      setForm({
        Purpose: config.Purpose,
        Provider: config.Provider,
        ModelName: config.ModelName,
        ApiKey: config.ApiKey,
        Temperature: config.Temperature,
        TopP: config.TopP,
        TopK: config.TopK,
        MaxOutputTokens: config.MaxOutputTokens,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail?.message || err.message);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = selectedId
        ? await updateModelConfig(tenantId, selectedId, form)
        : await createModelConfig(tenantId, form);

      await loadConfigs();
      resetForm(false);
      setSuccessMessage(response.message);
    } catch (err: any) {
      setError(err.response?.data?.detail?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (configId: number) => {
    const confirmed = window.confirm(
      "Delete this model configuration for the current tenant?"
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      const response = await deleteModelConfig(tenantId, configId);
      if (selectedId === configId) {
        resetForm(false);
      }
      setSuccessMessage(response.message);
      await loadConfigs();
    } catch (err: any) {
      setError(err.response?.data?.detail?.message || err.message);
    }
  };

  return (
    <div className="model-config-page">
      <div className="model-config-header">
        <div>
          <h1>Model Config Details</h1>
          
        </div>
        <button type="button" className="secondary-btn" onClick={loadConfigs}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && <div className="model-config-message error">{error}</div>}
      {successMessage && (
        <div className="model-config-message success">{successMessage}</div>
      )}

      <div className="model-config-layout">
        <section className="model-config-card">
          <div className="card-heading">
            <h2>{selectedId ? "Edit Configuration" : "Create Configuration"}</h2>
            {selectedId && (
              <button
                type="button"
                className="link-btn"
                onClick={() => resetForm()}
              >
                New Config
              </button>
            )}
          </div>

          <form className="model-config-form" onSubmit={handleSubmit}>
            <label>
              Purpose
              <select name="Purpose" value={form.Purpose} onChange={handleChange}>
                {options.purposes.map((purpose) => (
                  <option key={purpose} value={purpose}>
                    {purpose}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Provider
              <select name="Provider" value={form.Provider} onChange={handleChange}>
                {options.providers.map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Model Name
              <select name="ModelName" value={form.ModelName} onChange={handleChange}>
                {modelOptions.map((modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))}
              </select>
            </label>

            <label className="full-width">
              API Key
              <div className="password-input-wrap">
                <input
                  name="ApiKey"
                  type={isApiKeyVisible ? "text" : "password"}
                  value={form.ApiKey}
                  onChange={handleChange}
                  placeholder="Enter provider API key"
                  required
                />
                <EyeToggleButton
                  visible={isApiKeyVisible}
                  onClick={() => setIsApiKeyVisible((prev) => !prev)}
                  label={isApiKeyVisible ? "Hide" : "Show"}
                />
              </div>
            </label>

            <label>
              Temperature
              <input
                name="Temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={form.Temperature}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Top P
              <input
                name="TopP"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={form.TopP}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Top K
              <input
                name="TopK"
                type="number"
                min="0"
                step="1"
                value={form.TopK}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Max Output Tokens
              <input
                name="MaxOutputTokens"
                type="number"
                min="1"
                step="1"
                value={form.MaxOutputTokens}
                onChange={handleChange}
                required
              />
            </label>

            <div className="form-actions full-width">
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving
                  ? "Saving..."
                  : selectedId
                    ? "Update Config"
                    : "Create Config"}
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => resetForm()}
              >
                Clear
              </button>
            </div>
          </form>
        </section>

        <section className="model-config-card">
          <div className="card-heading">
            <h2>Configured Models</h2>
            <span>{configs.length} item(s)</span>
          </div>

          {loading ? (
            <div className="empty-state">Loading model configurations...</div>
          ) : configs.length === 0 ? (
            <div className="empty-state">No model configuration found for this tenant.</div>
          ) : (
            <div className="model-config-table-wrapper">
              <table className="model-config-table">
                <thead>
                  <tr>
                    <th>Purpose</th>
                    <th>Provider</th>
                    <th>Model</th>
                    <th>Temperature</th>
                    <th>Top P</th>
                    <th>Top K</th>
                    <th>Max Tokens</th>
                    <th className="api-key-column">API Key</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((config) => (
                    <tr key={config.Id}>
                      <td>{config.Purpose}</td>
                      <td>{config.Provider}</td>
                      <td>{config.ModelName}</td>
                      <td>{config.Temperature}</td>
                      <td>{config.TopP}</td>
                      <td>{config.TopK}</td>
                      <td>{config.MaxOutputTokens}</td>
                      <td className="api-key-column">
                        <div className="api-key-cell">
                          <span className="api-key-value">
                            {visibleConfigKeys[config.Id]
                              ? config.ApiKey || "-"
                              : maskApiKey(config.ApiKey)}
                          </span>
                          <EyeToggleButton
                            visible={Boolean(visibleConfigKeys[config.Id])}
                            onClick={() =>
                              setVisibleConfigKeys((prev) => ({
                                ...prev,
                                [config.Id]: !prev[config.Id],
                              }))
                            }
                            label={
                              visibleConfigKeys[config.Id]
                                ? `Hide`
                                : `Show`
                            }
                          />
                        </div>
                      </td>
                      <td className="actions-cell">
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => handleEdit(config.Id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-btn"
                          onClick={() => handleDelete(config.Id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
