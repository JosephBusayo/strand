import { APICallError } from "@ai-sdk/provider";
import { generateText } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { withFallback } from "./model";

const failing = (statusCode: number) =>
  new MockLanguageModelV4({
    modelId: `fails-${statusCode}`,
    doGenerate: async () => {
      throw new APICallError({
        message: "nope",
        url: "",
        requestBodyValues: {},
        statusCode,
        isRetryable: false,
      });
    },
  });

const working = new MockLanguageModelV4({
  modelId: "works",
  doGenerate: async () => ({
    content: [{ type: "text", text: "from backup" }],
    finishReason: { unified: "stop", raw: "stop" },
    usage: {
      inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 1, text: 1, reasoning: 0 },
    },
    warnings: [],
  }),
});

const run = (model: ReturnType<typeof withFallback>) =>
  generateText({ model, prompt: "hi", maxRetries: 0 });

describe("withFallback", () => {
  it("moves to the next model when one is rate limited", async () => {
    const { text } = await run(withFallback(failing(429), [failing(503), working]));
    expect(text).toBe("from backup");
  });

  it("does not hide a bad request", async () => {
    await expect(run(withFallback(failing(400), [working]))).rejects.toThrow("nope");
  });
});
