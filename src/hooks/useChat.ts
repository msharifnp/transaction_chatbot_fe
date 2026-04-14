import { MutableRefObject, useCallback, useState } from "react";
import { searchApi, transcribeVoiceApi } from "../api/searchApi";
import {
  ApiResponse,
  ChatData,
  ChatMessage,
  DatabaseData,
  HybridData,
  MessageData,
  VoiceTranscriptionResponse,
} from "../types/chat";

export function useChat(
  sessionIdRef: MutableRefObject<string | null>,
  setSessionId: (id: string) => void
) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const applySessionMetadata = useCallback(
    (metadata?: { new_session_id?: string }) => {
      if (metadata?.new_session_id) {
        sessionIdRef.current = metadata.new_session_id;
        setSessionId(metadata.new_session_id);
      }
    },
    [sessionIdRef, setSessionId]
  );

  const appendSearchResponse = useCallback((apiResponse: ApiResponse) => {
    const data = apiResponse.data as
      | DatabaseData
      | MessageData
      | ChatData
      | HybridData;

    if (data.response_type === "message") {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response_message,
          timestamp: new Date().toISOString(),
          mode: "message",
        },
      ]);
      return;
    }

    if (data.response_type === "ai") {
      const messages: ChatMessage[] = [];

      if (data.analysis_text) {
        messages.push({
          role: "assistant",
          content: data.analysis_text.text,
          timestamp: new Date().toISOString(),
          mode: "model",
          messageIndex: data.analysis_text.index,
        });
      }

      if (data.chart) {
        messages.push({
          role: "assistant",
          content: data.chart.svg,
          timestamp: new Date().toISOString(),
          mode: "model",
          messageIndex: data.chart.index,
        });
      }

      if (messages.length === 0) {
        messages.push({
          role: "assistant",
          content: "I couldn't generate a response.",
          timestamp: new Date().toISOString(),
          mode: "model",
        });
      }

      setChatHistory((prev) => [...prev, ...messages]);
      return;
    }

    if (data.response_type === "database") {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          timestamp: new Date().toISOString(),
          mode: "database",
          messageIndex: data.index,
          data: {
            columns: data.columns,
            rows: data.rows,
            count: data.count,
          },
        },
      ]);
      return;
    }

    if (data.response_type === "hybrid") {
      setChatHistory((prev) => [
        ...prev,
        {
          role: "assistant",
          timestamp: new Date().toISOString(),
          mode: "hybrid",
          messageIndex:
            data.ai.analysis_text?.index ?? data.ai.chart?.index,
          hybridData: {
            database: {
              columns: data.database.columns,
              rows: data.database.rows,
              count: data.database.count,
              index: data.database.index,
            },
            ai: {
              analysisText: data.ai.analysis_text?.text,
              analysisIndex: data.ai.analysis_text?.index,
              chart: data.ai.chart?.svg,
              chartIndex: data.ai.chart?.index,
            },
          },
        },
      ]);
    }
  }, []);

  const runQuery = useCallback(
    async (query: string, appendUserMessage: boolean) => {
      if (!query.trim()) {
        return;
      }

      setLoading(true);
      setErr(null);

      if (appendUserMessage) {
        const userMsg: ChatMessage = {
          role: "user",
          content: query,
          timestamp: new Date().toISOString(),
        };

        setChatHistory((prev) => [...prev, userMsg]);
      }

      try {
        const res = await searchApi({
          query,
          SessionId: sessionIdRef.current,
        });

        const apiResponse = res.data as ApiResponse;
        applySessionMetadata(apiResponse.metadata);
        appendSearchResponse(apiResponse);
      } catch (e: any) {
        setErr(e?.message || "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [appendSearchResponse, applySessionMetadata, sessionIdRef]
  );

  const sendMessage = useCallback(
    async (query: string) => {
      await runQuery(query.trim(), true);
    },
    [runQuery]
  );

  const sendVoiceMessage = useCallback(
    async (audioBlob: Blob) => {
      if (!audioBlob || audioBlob.size === 0) {
        return;
      }

      setLoading(true);
      setErr(null);

      try {
        const response = await transcribeVoiceApi({
          audio: audioBlob,
          SessionId: sessionIdRef.current,
        });

        const transcription = response.data as VoiceTranscriptionResponse;
        applySessionMetadata(transcription.metadata);

        const transcript = transcription.data?.transcript?.trim();
        if (!transcript) {
          throw new Error("No speech was detected in the audio.");
        }

        setChatHistory((prev) => [
          ...prev,
          {
            role: "user",
            content: transcript,
            timestamp: new Date().toISOString(),
          },
        ]);

        const res = await searchApi({
          query: transcript,
          SessionId: sessionIdRef.current,
        });

        const apiResponse = res.data as ApiResponse;
        applySessionMetadata(apiResponse.metadata);
        appendSearchResponse(apiResponse);
      } catch (e: any) {
        setErr(
          e?.response?.data?.detail?.message ||
            e?.message ||
            "Voice request failed"
        );
      } finally {
        setLoading(false);
      }
    },
    [appendSearchResponse, applySessionMetadata, sessionIdRef]
  );

  const clearChat = useCallback(() => {
    setChatHistory([]);
    setLoading(false);
    setErr(null);
  }, []);

  return {
    chatHistory,
    loading,
    err,
    sendMessage,
    sendVoiceMessage,
    clearChat,
  };
}
