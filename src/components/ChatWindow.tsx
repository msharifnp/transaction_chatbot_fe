import React, { useEffect, useRef, useState } from "react";
import { ChatMessage } from "../types/chat";
import MarkdownRenderer from "./MarkdownRenderer";
import { formatCell } from "../utils/format";
import { getModelConfigs } from "../api/modelConfigApi";

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
  onSendVoice: (audio: Blob) => Promise<void> | void;
  onExportPDF: (messageIndex: number) => void;
  onExportWord: (messageIndex: number) => void;
  onExportExcel: (messageIndex: number) => void;
  onExportChartPNG: (messageIndex: number) => void;
  onOpen: () => void;
  isSessionActive: boolean;
  onClose: () => void;
};

function mergeFloat32Buffers(buffers: Float32Array[]) {
  const totalLength = buffers.reduce((sum, buffer) => sum + buffer.length, 0);
  const result = new Float32Array(totalLength);
  let offset = 0;

  buffers.forEach((buffer) => {
    result.set(buffer, offset);
    offset += buffer.length;
  });

  return result;
}

function downsampleBuffer(
  buffer: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
) {
  if (outputSampleRate >= inputSampleRate) {
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;

  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    let accum = 0;
    let count = 0;

    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }

    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }

  return result;
}

function encodeWavBlob(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(
      offset,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true
    );
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

const SIGNAL_BAR_COUNT = 20;

function createIdleSignalLevels() {
  return Array.from({ length: SIGNAL_BAR_COUNT }, () => 0.08);
}

function buildSignalLevels(samples: ArrayLike<number>) {
  if (!samples.length) {
    return createIdleSignalLevels();
  }

  const levels: number[] = [];
  const bucketSize = Math.max(1, Math.floor(samples.length / SIGNAL_BAR_COUNT));

  for (let barIndex = 0; barIndex < SIGNAL_BAR_COUNT; barIndex += 1) {
    const start = barIndex * bucketSize;
    const end = Math.min(samples.length, start + bucketSize);
    let peak = 0;

    for (let i = start; i < end; i += 1) {
      const amplitude = Math.abs((samples[i] - 128) / 128);
      if (amplitude > peak) {
        peak = amplitude;
      }
    }

    levels.push(Math.max(0.08, Math.min(1, peak * 2.8)));
  }

  return levels;
}

export default function ChatWindow({
  chatHistory,
  loading,
  onSend,
  onSendVoice,
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
  const [isRecording, setIsRecording] = useState(false);
  const [isRecorderReady, setIsRecorderReady] = useState(false);
  const [isVoiceDetected, setIsVoiceDetected] = useState(false);
  const [signalLevels, setSignalLevels] = useState(createIdleSignalLevels);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformFrameRef = useRef<number | null>(null);
  const waveformBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const targetSampleRateRef = useRef(16000);
  const inputSampleRateRef = useRef(16000);
  const cachedVoiceSampleRateRef = useRef(16000);
  const voiceSampleRateLoadedRef = useRef(false);
  const isRecordingSetupRef = useRef(false);

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

  const stopWaveformAnimation = () => {
    if (waveformFrameRef.current !== null) {
      window.cancelAnimationFrame(waveformFrameRef.current);
      waveformFrameRef.current = null;
    }

    analyserRef.current = null;
    waveformBufferRef.current = null;
    setSignalLevels(createIdleSignalLevels());
    setIsRecorderReady(false);
    setIsVoiceDetected(false);
  };

  const startWaveformAnimation = () => {
    if (!analyserRef.current || !waveformBufferRef.current) {
      return;
    }

    const tick = () => {
      const analyser = analyserRef.current;
      const waveformBuffer = waveformBufferRef.current;

      if (!analyser || !waveformBuffer) {
        return;
      }

      analyser.getByteTimeDomainData(waveformBuffer);

      let sumSquares = 0;
      for (let i = 0; i < waveformBuffer.length; i += 1) {
        const normalized = (waveformBuffer[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }

      const rms = Math.sqrt(sumSquares / waveformBuffer.length);
      setIsVoiceDetected(rms > 0.035);
      setSignalLevels(buildSignalLevels(waveformBuffer));
      waveformFrameRef.current = window.requestAnimationFrame(tick);
    };

    tick();
  };

  const cleanupRecordingResources = async () => {
    stopWaveformAnimation();
    processorRef.current?.disconnect();
    analyserRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

    if (audioContextRef.current) {
      await audioContextRef.current.close();
    }

    processorRef.current = null;
    analyserRef.current = null;
    sourceNodeRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    audioChunksRef.current = [];
  };

  useEffect(() => {
    return () => {
      void cleanupRecordingResources();
    };
  }, []);

  useEffect(() => {
    void getVoiceSampleRate();
  }, []);

  const send = () => {
    if (!query.trim() || loading || isRecording) return;
    onSend(query.trim());
    setQuery("");
  };

  const getVoiceSampleRate = async () => {
    if (voiceSampleRateLoadedRef.current) {
      return cachedVoiceSampleRateRef.current;
    }

    try {
      const response = await getModelConfigs();
      const voiceConfig = (response.data || []).find(
        (config) => config.Purpose === "Voice"
      );
      const sampleRate = Number(voiceConfig?.Config?.sampleRateHertz ?? 16000);
      const nextSampleRate =
        Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 16000;
      cachedVoiceSampleRateRef.current = nextSampleRate;
      voiceSampleRateLoadedRef.current = true;
      return nextSampleRate;
    } catch {
      return cachedVoiceSampleRateRef.current;
    }
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      window.alert("Microphone access is not supported in this browser.");
      return;
    }

    isRecordingSetupRef.current = true;
    setIsRecording(true);

    try {
      targetSampleRateRef.current = cachedVoiceSampleRateRef.current;
      if (!voiceSampleRateLoadedRef.current) {
        void getVoiceSampleRate().then((sampleRate) => {
          targetSampleRateRef.current = sampleRate;
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;

      inputSampleRateRef.current = audioContext.sampleRate;
      audioChunksRef.current = [];

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(analyser);
      source.connect(processor);
      processor.connect(audioContext.destination);
      analyserRef.current = analyser;
      waveformBufferRef.current = new Uint8Array(
        new ArrayBuffer(analyser.fftSize)
      );
      setIsRecorderReady(true);
      startWaveformAnimation();

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      processorRef.current = processor;
    } catch (error) {
      console.error("[ChatWindow] Failed to start recording", error);
      setIsRecording(false);
      window.alert("Unable to access the microphone.");
    } finally {
      isRecordingSetupRef.current = false;
    }
  };

  const stopRecording = async () => {
    try {
      const mergedBuffer = mergeFloat32Buffers(audioChunksRef.current);
      const downsampledBuffer = downsampleBuffer(
        mergedBuffer,
        inputSampleRateRef.current,
        targetSampleRateRef.current
      );
      const wavBlob = encodeWavBlob(
        downsampledBuffer,
        targetSampleRateRef.current
      );

      await cleanupRecordingResources();
      setIsRecording(false);
      audioChunksRef.current = [];

      if (wavBlob.size > 44) {
        await onSendVoice(wavBlob);
      }
    } catch (error) {
      console.error("[ChatWindow] Failed to stop recording", error);
      window.alert("Unable to process the recorded audio.");
      await cleanupRecordingResources();
      setIsRecording(false);
    }
  };

  const handleVoiceClick = async () => {
    if (loading) {
      return;
    }

    if (isRecording) {
      if (isRecordingSetupRef.current) {
        return;
      }
      await stopRecording();
      return;
    }

    await startRecording();
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!isSessionActive) {
      onOpen();
    }
  };

  const handleClose = () => {
    if (isRecording) {
      void cleanupRecordingResources();
      setIsRecording(false);
      isRecordingSetupRef.current = false;
    }
    setIsOpen(false);
    setQuery("");
    onClose();
  };

  const handleMinimize = () => {
    if (isRecording) {
      void cleanupRecordingResources();
      setIsRecording(false);
      isRecordingSetupRef.current = false;
    }
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
                top: 8,
                right: 8,
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "1px solid #4b5563",
                background: "#20242b",
                fontSize: 17,
                lineHeight: "17px",
                color: "#c5cbd5",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.04)",
              }}
            >
              x
            </button>
            <button
              onClick={handleMinimize}
              style={{
                position: "absolute",
                top: 8,
                right: 44,
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "1px solid #94a3b8",
                background: "#e2e8f0",
                fontSize: 17,
                lineHeight: "17px",
                color: "#334155",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.35)",
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
                flexDirection: "column",
                gap: 8,
                background: "#f8fafd",
              }}
            >
              {(isRecording || loading) && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: isRecording ? "#b45309" : "#475569",
                  }}
                >
                  {isRecording
                    ? "Recording... click the microphone again to transcribe and send."
                    : ""}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minHeight: 44,
                    borderRadius: 10,
                    border: isRecording ? "1px solid #f5d08a" : "1px solid #d0d9e6",
                    background: isRecording
                      ? "linear-gradient(180deg, #fffaf0 0%, #fff7e6 100%)"
                      : "#ffffff",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  {isRecording && isRecorderReady ? (
                    <div
                      style={{
                        height: "100%",
                        minHeight: 44,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 12px",
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 32,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          gap: 6,
                        }}
                      >
                        {signalLevels.map((level, index) => (
                          <span
                            key={index}
                            style={{
                              width: 4,
                              height: `${Math.max(8, Math.round(level * 28))}px`,
                              borderRadius: 999,
                              background: "#d4147a",
                              opacity: isVoiceDetected ? 1 : 0.75,
                              display: "inline-block",
                              transition: "height 70ms linear, opacity 120ms ease",
                              transform: "translateZ(0)",
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
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
                        width: "100%",
                        resize: "none",
                        padding: "10px 12px",
                        border: "none",
                        fontSize: 16,
                        minHeight: 58,
                        outline: "none",
                        background: "transparent",
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
                <button
                  onClick={() => void handleVoiceClick()}
                  disabled={loading}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    border: isRecording
                      ? "1px solid #f59e0b"
                      : "1px solid #c5d0df",
                    background: isRecording ? "#fef3c7" : "#ffffff",
                    color: isRecording ? "#b45309" : "#334155",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 15.5a3.5 3.5 0 0 0 3.5-3.5V7A3.5 3.5 0 1 0 8.5 7v5a3.5 3.5 0 0 0 3.5 3.5Z"
                      fill="currentColor"
                    />
                    <path
                      d="M6 11.5a6 6 0 0 0 12 0"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 17.5v3"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                    <path
                      d="M9 20.5h6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <button
                  onClick={send}
                  disabled={!query.trim() || isRecording}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 10,
                    border: "1px solid #c5d0df",
                    background:
                      query.trim() && !isRecording ? "#95a9bf" : "#d4dde8",
                    cursor:
                      query.trim() && !isRecording ? "pointer" : "not-allowed",
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
                      opacity: query.trim() && !isRecording ? 1 : 0.6,
                    }}
                  >
                    <path d="M3 12L21 3L14 12L21 21L3 12Z" />
                  </svg>
                </button>
              </div>
            </div>
          </section>
          </div>
        </>
      )}
    </>
  );
}
