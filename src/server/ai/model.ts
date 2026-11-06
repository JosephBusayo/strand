import { google } from "@ai-sdk/google";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";

// Each free Gemini model has its own quota, so a busy model hands over to the next.
// gemini-3.5-flash allows only 20 free requests a day, so it is the backup rather than the main model.
// gemini-3.1-flash-lite was tried and left out: it stalled for minutes and claimed stock without checking.
const PRIMARY_MODEL = "gemini-3.5-flash-lite";
const BACKUP_MODELS = ["gemini-3.5-flash"];

const shouldFallBack = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const status = "statusCode" in error ? error.statusCode : undefined;
  return status === 429 || (typeof status === "number" && status >= 500) || status === undefined;
};

export function withFallback(primary: LanguageModelV4, backups: LanguageModelV4[]) {
  async function attempt<T>(call: (model: LanguageModelV4) => PromiseLike<T>) {
    let lastError: unknown;
    for (const model of [primary, ...backups]) {
      try {
        return await call(model);
      } catch (error) {
        if (!shouldFallBack(error)) throw error;
        console.warn("model unavailable, trying next", model.modelId, error instanceof Error ? error.message : error);
        lastError = error;
      }
    }
    throw lastError;
  }

  return wrapLanguageModel({
    model: primary,
    middleware: {
      specificationVersion: "v4",
      wrapGenerate: ({ params }) => attempt((model) => model.doGenerate(params)),
      wrapStream: ({ params }) => attempt((model) => model.doStream(params)),
    },
  });
}

export const assistantModel = () =>
  withFallback(google(PRIMARY_MODEL), BACKUP_MODELS.map((id) => google(id)));
