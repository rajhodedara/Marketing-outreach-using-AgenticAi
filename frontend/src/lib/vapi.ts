/**
 * vapi.ts — Singleton wrapper for the Vapi Web SDK.
 * Import { vapiClient } from '@/lib/vapi' wherever you need voice call functionality.
 */
import Vapi from "@vapi-ai/web";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";

let _instance: Vapi | null = null;

export function getVapi(): Vapi {
  if (!_instance) {
    if (!PUBLIC_KEY) {
      console.warn("NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set in .env.local");
    }
    _instance = new Vapi(PUBLIC_KEY || "dummy_key");
  }
  return _instance;
}

export type CallStatus = "idle" | "connecting" | "active" | "ended" | "error";

export interface TranscriptMessage {
  role: "user" | "assistant";
  text: string;
  isFinal: boolean;
}

/**
 * Start a voice call with the Julian assistant.
 * @param assistantId - Vapi assistant ID from backend
 * @param briefText   - The verified brief to inject into Julian's system prompt
 * @returns The call object (contains call.id for WebSocket subscription)
 */
export async function startJulianCall(
  assistantId: string,
  briefText: string
): Promise<string> {
  console.log("Starting Julian Call with Assistant ID:", assistantId);
  const vapi = getVapi();
  const call = await vapi.start(assistantId, {
    variableValues: {
      verified_brief: briefText,
    },
  });
  return call?.id ?? "";
}

export function stopCall(): void {
  const vapi = getVapi();
  vapi.stop();
}

export function onCallStart(cb: () => void): void {
  getVapi().on("call-start", cb);
}

export function onCallEnd(cb: () => void): void {
  getVapi().on("call-end", cb);
}

export function onTranscript(cb: (msg: TranscriptMessage) => void): void {
  getVapi().on("message", (message: unknown) => {
    const msg = message as Record<string, unknown>;
    if (msg?.type === "transcript") {
      cb({ 
        role: msg.role as "user" | "assistant", 
        text: msg.transcript as string,
        isFinal: msg.transcriptType === "final"
      });
    }
  });
}

export function onError(cb: (err: unknown) => void): void {
  getVapi().on("error", cb);
}

export function offAll(): void {
  const vapi = getVapi();
  vapi.removeAllListeners();
}
