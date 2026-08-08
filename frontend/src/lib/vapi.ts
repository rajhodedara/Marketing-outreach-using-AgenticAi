/**
 * vapi.ts ? Singleton wrapper for the Vapi Web SDK.
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

export async function startArminCall(
  assistantId: string,
  briefText: string
): Promise<string> {
  console.log("Starting Armin Call with Assistant ID:", assistantId);
  console.log("Using Vapi Public Key starting with:", PUBLIC_KEY ? `${PUBLIC_KEY.substring(0, 8)}...` : "NONE");
  
  if (!PUBLIC_KEY || PUBLIC_KEY === "dummy_key") {
    throw new Error("VAPI Public Key is missing. Please set NEXT_PUBLIC_VAPI_PUBLIC_KEY in your environment variables.");
  }

  // Check if they accidentally put a private key (Vapi private keys often start with different prefixes, though they can vary. Public keys usually don't throw 404 on the web endpoint unless mismatched).
  if (PUBLIC_KEY.length > 0 && !PUBLIC_KEY.includes('-') && PUBLIC_KEY.length > 40) {
     console.warn("WARNING: The VAPI key looks like it might be a private key instead of a Public Key. Web SDK requires a Public Key.");
  }

  const vapi = getVapi();
  try {
    const call = await vapi.start(assistantId, {
      variableValues: {
        verified_brief: briefText,
        current_datetime: new Date().toString(),
      },
    });
    return call?.id ?? "";
  } catch (error: any) {
    console.error("Vapi start call failed. This is often due to a CORS issue or a 404 if the Assistant ID doesn't exist on the account associated with this Public Key.", error);
    throw error;
  }
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
