import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
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

const VOICE_PURPOSE = "Voice";
const emptyOptions: ModelConfigOptions = {
  purposes: [],
  providers: [],
  models_by_provider: {},
};

const llmDefaults = {
  temperature: 0,
  topP: 0.8,
  topK: 20,
  maxTokens: 10000,
};

const voiceDefaults = {
  languageCode: "en-US",
  alternativeLanguageCodes: ["ar-SA"],
  sampleRateHertz: 16000,
  encoding: "LINEAR16",
  enableAutomaticPunctuation: true,
  enableWordTimeOffsets: false,
};

const emptyForm: ModelConfigPayload = {
  Purpose: "Technical",
  Provider: "Anthropic",
  ModelName: "Claude-3-Opus",
  CredentialsRef: "",
  SecretValue: "",
  Config: { ...llmDefaults },
};

function isVoicePurpose(purpose: string) {
  return purpose === VOICE_PURPOSE;
}

function normalizeLlmConfig(config?: Record<string, any>) {
  return {
    temperature: Number(config?.temperature ?? llmDefaults.temperature),
    topP: Number(config?.topP ?? llmDefaults.topP),
    topK: Number(config?.topK ?? llmDefaults.topK),
    maxTokens: Number(config?.maxTokens ?? llmDefaults.maxTokens),
  };
}

function normalizeVoiceConfig(config?: Record<string, any>) {
  const alternativeLanguageCodes = Array.isArray(config?.alternativeLanguageCodes)
    ? config?.alternativeLanguageCodes
    : typeof config?.alternativeLanguageCodes === "string"
      ? config.alternativeLanguageCodes
          .split(",")
          .map((code: string) => code.trim())
          .filter(Boolean)
      : voiceDefaults.alternativeLanguageCodes;

  return {
    languageCode: String(config?.languageCode ?? voiceDefaults.languageCode),
    alternativeLanguageCodes,
    sampleRateHertz: Number(config?.sampleRateHertz ?? voiceDefaults.sampleRateHertz),
    encoding: String(config?.encoding ?? voiceDefaults.encoding).toUpperCase(),
    enableAutomaticPunctuation: Boolean(
      config?.enableAutomaticPunctuation ?? voiceDefaults.enableAutomaticPunctuation
    ),
    enableWordTimeOffsets: Boolean(
      config?.enableWordTimeOffsets ?? voiceDefaults.enableWordTimeOffsets
    ),
  };
}

function formatConfigPreview(config: Record<string, any>, purpose: string) {
  if (isVoicePurpose(purpose)) {
    const voiceConfig = normalizeVoiceConfig(config);
    const altLanguages = voiceConfig.alternativeLanguageCodes.length
      ? voiceConfig.alternativeLanguageCodes.join(", ")
      : "-";

    return [
      `Primary: ${voiceConfig.languageCode}`,
      `Alt: ${altLanguages}`,
      `${voiceConfig.sampleRateHertz} Hz`,
      voiceConfig.encoding,
      `Punctuation: ${voiceConfig.enableAutomaticPunctuation ? "On" : "Off"}`,
      `Word Offsets: ${voiceConfig.enableWordTimeOffsets ? "On" : "Off"}`,
    ].join(" | ");
  }

  const llmConfig = normalizeLlmConfig(config);
  return [
    `Temp: ${llmConfig.temperature}`,
    `Top P: ${llmConfig.topP}`,
    `Top K: ${llmConfig.topK}`,
    `Max Tokens: ${llmConfig.maxTokens}`,
  ].join(" | ");
}

export default function ModelConfigPage() {
  const [configs, setConfigs] = useState<ModelConfigRecord[]>([]);
  const [options, setOptions] = useState<ModelConfigOptions>(emptyOptions);
  const [form, setForm] = useState<ModelConfigPayload>(emptyForm);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const providerOptions = useMemo(() => {
    return options.providers.length ? options.providers : [emptyForm.Provider];
  }, [options.providers]);

  const modelOptions = useMemo(() => {
    const providerModels = options.models_by_provider[form.Provider] || [];
    if (providerModels.length) {
      return providerModels;
    }

    return form.ModelName ? [form.ModelName] : [emptyForm.ModelName];
  }, [form.ModelName, form.Provider, form.Purpose, options.models_by_provider]);

  const currentLlmConfig = normalizeLlmConfig(form.Config);
  const currentVoiceConfig = normalizeVoiceConfig(form.Config);

  const buildDefaultForm = (
    purpose: string,
    previous?: ModelConfigPayload,
    sourceOptions: ModelConfigOptions = options
  ): ModelConfigPayload => {
    const availableProviders = sourceOptions.providers;
    const fallbackProvider = previous?.Provider || emptyForm.Provider;
    const provider = availableProviders.includes(fallbackProvider)
      ? fallbackProvider
      : availableProviders[0] || fallbackProvider;
    const models = sourceOptions.models_by_provider[provider] || [];
    const fallbackModel = previous?.ModelName || emptyForm.ModelName;
    const modelName = models.includes(fallbackModel)
      ? fallbackModel
      : models[0] || fallbackModel;

    if (isVoicePurpose(purpose)) {
      return {
        Purpose: VOICE_PURPOSE,
        Provider: provider,
        ModelName: modelName,
        CredentialsRef: previous?.CredentialsRef || "",
        SecretValue: "",
        Config: normalizeVoiceConfig(previous?.Config),
      };
    }

    return {
      Purpose: purpose,
      Provider: provider,
      ModelName: modelName,
      CredentialsRef: previous?.CredentialsRef || "",
      SecretValue: "",
      Config: normalizeLlmConfig(previous?.Config),
    };
  };

  const loadConfigs = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getModelConfigs();
      setConfigs(response.data || []);
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
          getModelConfigs(),
          getModelConfigOptions(),
        ]);

        const configList = configResponse.data || [];
        const nextOptions = optionsResponse.data || emptyOptions;
        const initialPurpose = nextOptions.purposes.includes(emptyForm.Purpose)
          ? emptyForm.Purpose
          : nextOptions.purposes[0] || emptyForm.Purpose;

        setConfigs(configList);
        setOptions(nextOptions);
        setForm((prev) => buildDefaultForm(initialPurpose, prev, nextOptions));
      } catch (err: any) {
        setError(err.response?.data?.detail?.message || err.message);
      } finally {
        setLoading(false);
      }
    };

    void loadPageData();
  }, []);

  const updateConfigValue = (key: string, value: any) => {
    setForm((prev) => ({
      ...prev,
      Config: {
        ...prev.Config,
        [key]: value,
      },
    }));
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;

    if (name === "Purpose") {
      setForm((prev) => buildDefaultForm(value, prev));
      return;
    }

    if (name === "Provider") {
      const nextModels = options.models_by_provider[value] || [];
      setForm((prev) => ({
        ...prev,
        Provider: value,
        ModelName: nextModels[0] || "",
      }));
      return;
    }

    if (name === "alternativeLanguageCodes") {
      updateConfigValue(
        "alternativeLanguageCodes",
        value
          .split(",")
          .map((code) => code.trim())
          .filter(Boolean)
      );
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLlmConfigChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    updateConfigValue(name, Number(value));
  };

  const handleVoiceCheckboxChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, checked } = event.target;
    updateConfigValue(name, checked);
  };

  const resetForm = (clearMessages = true) => {
    const defaultPurpose = options.purposes.includes(emptyForm.Purpose)
      ? emptyForm.Purpose
      : options.purposes[0] || emptyForm.Purpose;

    setForm(buildDefaultForm(defaultPurpose));
    setSelectedId(null);
    if (clearMessages) {
      setSuccessMessage(null);
      setError(null);
    }
  };

  const handleEdit = async (configId: number) => {
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await getModelConfigById(configId);
      const config = response.data;
      const nextForm: ModelConfigPayload = {
        Purpose: config.Purpose,
        Provider: config.Provider,
        ModelName: config.ModelName,
        CredentialsRef: config.CredentialsRef,
        SecretValue: "",
        Config: isVoicePurpose(config.Purpose)
          ? normalizeVoiceConfig(config.Config)
          : normalizeLlmConfig(config.Config),
      };

      setSelectedId(config.Id);
      setForm(nextForm);
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
      const payload: ModelConfigPayload = {
        ...form,
        SecretValue: form.SecretValue?.trim() || undefined,
        Config: isVoicePurpose(form.Purpose)
          ? normalizeVoiceConfig(form.Config)
          : normalizeLlmConfig(form.Config),
      };

      const response = selectedId
        ? await updateModelConfig(selectedId, payload)
        : await createModelConfig(payload);

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
      const response = await deleteModelConfig(configId);
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
          <h1>Model Configuration</h1>
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
                {providerOptions.map((provider) => (
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
              Secret Key
              <textarea
                name="SecretValue"
                className="credential-textarea"
                value={form.SecretValue || ""}
                onChange={handleChange}
                placeholder={
                  selectedId
                    ? "Leave blank to keep the current Key Vault secret"
                    : isVoicePurpose(form.Purpose)
                      ? "Enter service account JSON"
                      : "Enter provider secret key"
                }
                rows={5}
                required={!selectedId}
              />
              {form.CredentialsRef && (
                <div className="hint-text">
                  
                </div>
              )}
            </label>

            {isVoicePurpose(form.Purpose) ? (
              <div className="config-panel full-width">
                <div className="config-panel-title">Transcription Parameters</div>

                <label>
                  Primary Language
                  <input
                    name="languageCode"
                    value={currentVoiceConfig.languageCode}
                    onChange={(event) =>
                      updateConfigValue("languageCode", event.target.value)
                    }
                    placeholder="en-US"
                  />
                </label>

                <label>
                  Alternative Language
                  <input
                    name="alternativeLanguageCodes"
                    value={currentVoiceConfig.alternativeLanguageCodes.join(", ")}
                    onChange={handleChange}
                    placeholder="ar-SA, hi-IN"
                  />
                </label>

                <label>
                  Sample Rate Hertz
                  <input
                    name="sampleRateHertz"
                    type="number"
                    min="8000"
                    step="1000"
                    value={currentVoiceConfig.sampleRateHertz}
                    onChange={(event) =>
                      updateConfigValue("sampleRateHertz", Number(event.target.value))
                    }
                  />
                </label>

                <label>
                  Encoding
                  <input
                    name="encoding"
                    value={currentVoiceConfig.encoding}
                    onChange={(event) =>
                      updateConfigValue("encoding", event.target.value)
                    }
                    placeholder="LINEAR16"
                  />
                </label>

                <label className="checkbox-field">
                  <input
                    name="enableAutomaticPunctuation"
                    type="checkbox"
                    checked={currentVoiceConfig.enableAutomaticPunctuation}
                    onChange={handleVoiceCheckboxChange}
                  />
                  <span>Enable Automatic Punctuation</span>
                </label>

                <label className="checkbox-field">
                  <input
                    name="enableWordTimeOffsets"
                    type="checkbox"
                    checked={currentVoiceConfig.enableWordTimeOffsets}
                    onChange={handleVoiceCheckboxChange}
                  />
                  <span>Enable Word Time Offsets</span>
                </label>

                <div className="hint-text">
                  
                </div>
              </div>
            ) : (
              <div className="config-panel full-width">
                <div className="config-panel-title">LLM Generation Parameters</div>

                <label>
                  Temperature
                  <input
                    name="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={currentLlmConfig.temperature}
                    onChange={handleLlmConfigChange}
                    required
                  />
                </label>

                <label>
                  Top P
                  <input
                    name="topP"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={currentLlmConfig.topP}
                    onChange={handleLlmConfigChange}
                    required
                  />
                </label>

                <label>
                  Top K
                  <input
                    name="topK"
                    type="number"
                    min="0"
                    step="1"
                    value={currentLlmConfig.topK}
                    onChange={handleLlmConfigChange}
                    required
                  />
                </label>

                <label>
                  Max Tokens
                  <input
                    name="maxTokens"
                    type="number"
                    min="1"
                    step="1"
                    value={currentLlmConfig.maxTokens}
                    onChange={handleLlmConfigChange}
                    required
                  />
                </label>
              </div>
            )}

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
                    <th className="api-key-column">Key Vault Secret</th>
                    <th className="config-column">Config</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((config) => (
                    <tr key={config.Id}>
                      <td>{config.Purpose}</td>
                      <td>{config.Provider}</td>
                      <td>{config.ModelName}</td>
                      <td className="api-key-column">{config.CredentialsRef || "-"}</td>
                      <td className="config-column">
                        <div className="config-preview">
                          {formatConfigPreview(config.Config || {}, config.Purpose)}
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
