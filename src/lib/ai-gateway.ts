import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";

const MODEL_ALIASES: Record<string, string> = {
  "gemini-3-pro-preview": "gemini-3.1-pro-preview",
};

const SUPPORTED_AGENT_PLATFORM_LOCATIONS = new Set(["global", "us", "eu"]);

function normalizeGeminiModel(model: string) {
  return MODEL_ALIASES[model] ?? model;
}

function getAgentPlatformLocation() {
  const location = process.env.GOOGLE_CLOUD_LOCATION ?? "global";
  return SUPPORTED_AGENT_PLATFORM_LOCATIONS.has(location) ? location : "global";
}

export function getGeminiProvider() {
  const provider =
    process.env.AI_PROVIDER ??
    (process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_VERTEX_PROJECT
      ? "agent-platform"
      : "google-ai-studio");

  if (provider === "agent-platform" || provider === "vertex") {
    const project = process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GOOGLE_VERTEX_PROJECT;
    if (!project) {
      throw new Error("Missing GOOGLE_CLOUD_PROJECT for Gemini Enterprise Agent Platform.");
    }

    return createVertex({
      project,
      location: getAgentPlatformLocation(),
      apiKey: process.env.GOOGLE_AGENT_PLATFORM_API_KEY ?? process.env.GOOGLE_VERTEX_API_KEY,
    });
  }

  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Set GEMINI_API_KEY, GOOGLE_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.",
    );
  }

  return createGoogleGenerativeAI({ apiKey });
}

export function getGeminiProModel() {
  return getGeminiProvider()(
    normalizeGeminiModel(process.env.GEMINI_PRO_MODEL ?? "gemini-3.1-pro-preview"),
  );
}

export function getGeminiFlashModel() {
  return getGeminiProvider()(
    normalizeGeminiModel(process.env.GEMINI_FLASH_MODEL ?? "gemini-3-flash-preview"),
  );
}
