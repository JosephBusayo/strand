"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, ImagePlus, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Chip } from "@/components/ui/primitives";
import { ToolResult } from "./tool-result";

type Props = {
  slug: string;
  shopName: string;
  shopDescription: string;
  initialMessages: UIMessage[];
};

const SAMPLES = [
  { label: "White sneaker post", file: "/samples/clear-match.jpg" },
  { label: "Two white pairs", file: "/samples/ambiguous.jpg" },
];

const STARTERS = ["What do you sell?", "Show me your sneakers", "How much is delivery?"];

export function ShopChat({ slug, shopName, shopDescription, initialMessages }: Props) {
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textbox = useRef<HTMLTextAreaElement>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, clearError } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      // The server holds the history, so only the newest message is sent.
      prepareSendMessagesRequest: ({ messages }) => {
        const latest = messages[messages.length - 1];
        const text = latest.parts.flatMap((p) => (p.type === "text" ? [p.text] : [])).join(" ");
        const { imageUrl } = (latest.metadata ?? {}) as { imageUrl?: string };
        return { body: { slug, id: latest.id, text, imageUrl } };
      },
    }),
  });

  const busy = status === "submitted" || status === "streaming";

  // What the buyer has said, so chips they already picked show as selected.
  const said = useMemo(
    () =>
      new Set(
        messages
          .filter((m) => m.role === "user")
          .flatMap((m) => m.parts.flatMap((p) => (p.type === "text" ? [p.text] : []))),
      ),
    [messages],
  );

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Grow the message box with its content, up to about five lines.
  useEffect(() => {
    const el = textbox.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, [input]);

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    clearError();
    sendMessage({ text });
    setInput("");
  };

  async function uploadImage(file: File) {
    setUploading(true);
    setNotice(null);
    clearError();
    try {
      const form = new FormData();
      form.append("slug", slug);
      form.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      sendMessage({
        text: "Do you have this one?",
        metadata: { imageUrl: body.url },
      });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function sendSample(path: string) {
    const blob = await (await fetch(path)).blob();
    await uploadImage(new File([blob], "sample.jpg", { type: "image/jpeg" }));
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send(input);
  };

  // Enter sends; Shift+Enter starts a new line.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(input);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink font-display text-lg text-white">
          {shopName.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg leading-tight">{shopName}</h1>
          <p className="truncate text-xs text-ink-2">{shopDescription}</p>
        </div>
        <span className="shrink-0 rounded-chip bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
          Sandbox
        </span>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6">
        {!hasMessages && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <p className="font-display text-display-sm">
                Saw something you like? <em className="font-normal text-ink-3">Show me.</em>
              </p>
              <p className="text-ink-2">Send a screenshot, or ask about anything in the shop.</p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Try a sample screenshot</p>
              <div className="grid grid-cols-2 gap-3">
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.file}
                    type="button"
                    disabled={busy || uploading}
                    onClick={() => sendSample(sample.file)}
                    className="group overflow-hidden rounded-card bg-surface-raised text-left shadow-raised transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                  >
                    <Image
                      src={sample.file}
                      alt=""
                      width={320}
                      height={240}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <span className="block px-3 py-2 text-sm">{sample.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          // Replies saved before ids were generated have an empty id.
          <Message key={message.id || index} message={message} slug={slug} said={said} onChoose={send} />
        ))}

        {(status === "submitted" || uploading) && (
          <div className="flex items-end gap-2" aria-live="polite">
            <LogoMark className="size-7 shrink-0" />
            <div className="flex items-center gap-1 rounded-card bg-surface-raised px-3 py-3 shadow-raised">
              <span className="sr-only">{uploading ? "Uploading your image" : "The shop is typing"}</span>
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="size-1.5 rounded-full bg-ink-3"
                  style={{ animation: `typing 1.2s ${dot * 0.15}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}

        {(error || notice) && (
          <p role="alert" className="rounded-card bg-danger/10 px-3 py-2 text-sm text-danger">
            {notice ?? errorText(error)}
          </p>
        )}
        <div ref={bottom} />
      </div>

      <div className="border-t border-line bg-bg px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {!hasMessages && (
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {STARTERS.map((text) => (
              <Chip key={text} disabled={busy} onClick={() => send(text)} className="shrink-0">
                {text}
              </Chip>
            ))}
          </div>
        )}
        <form
          onSubmit={submit}
          className="flex items-end gap-2 rounded-card border border-line bg-surface-raised p-1.5 focus-within:border-ink"
        >
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Upload a product image"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) uploadImage(file);
              event.target.value = "";
            }}
          />
          <button
            type="button"
            aria-label="Add a screenshot"
            disabled={busy || uploading}
            onClick={() => fileInput.current?.click()}
            className="flex size-11 shrink-0 items-center justify-center rounded-chip text-ink-2 hover:bg-surface hover:text-ink disabled:opacity-50"
          >
            <ImagePlus className="size-5" strokeWidth={1.5} aria-hidden />
          </button>
          <textarea
            ref={textbox}
            rows={1}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Message the shop"
            aria-label="Message"
            className="min-h-11 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 outline-none placeholder:text-ink-3"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={busy || !input.trim()}
            className="flex size-11 shrink-0 items-center justify-center rounded-chip bg-ink text-white transition-opacity disabled:opacity-30"
          >
            <ArrowUp className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        </form>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs whitespace-nowrap text-ink-2">
          <ShieldCheck className="size-3.5" strokeWidth={1.5} aria-hidden />
          PayPal Sandbox ·
          <Link href="/" className="hover:text-ink">
            Powered by <span className="font-display font-semibold text-ink">acag</span>
          </Link>
        </p>
      </div>
    </main>
  );
}

// Stream errors arrive as our own sentence; HTTP errors arrive as a JSON body.
function errorText(error: Error | undefined) {
  const fallback = "The assistant is busy right now. Please send that again.";
  if (!error?.message) return fallback;
  try {
    return (JSON.parse(error.message) as { error?: string }).error ?? fallback;
  } catch {
    return error.message.length < 160 ? error.message : fallback;
  }
}

// The model is told to write plain text, but older replies may still carry markdown emphasis.
const plain = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|\s)\*(\S.*?)\*/g, "$1$2");

function Message({
  message,
  slug,
  said,
  onChoose,
}: {
  message: UIMessage;
  slug: string;
  said: Set<string>;
  onChoose: (text: string) => void;
}) {
  const buyer = message.role === "user";
  const { imageUrl } = (message.metadata ?? {}) as { imageUrl?: string };
  const visible = message.parts.some(
    (p) => (p.type === "text" && p.text.trim()) || p.type.startsWith("tool-"),
  );
  if (!buyer && !visible) return null;

  return (
    <div className={`flex gap-2 ${buyer ? "justify-end" : "items-start"}`}>
      {!buyer && <LogoMark className="mt-1 size-7 shrink-0" />}
      <div className={`flex min-w-0 flex-col gap-2 ${buyer ? "items-end" : "flex-1 items-start"}`}>
        {imageUrl && (
          <Image
            src={imageUrl}
            alt="Your upload"
            width={200}
            height={200}
            unoptimized
            className="size-40 rounded-card object-cover"
          />
        )}
        {message.parts.map((part, index) => {
          if (part.type === "text" && part.text.trim()) {
            return (
              <p
                key={index}
                className={`max-w-[85%] rounded-card px-3.5 py-2.5 whitespace-pre-wrap ${
                  buyer ? "rounded-br-tile bg-ink text-white" : "rounded-tl-tile bg-surface-raised shadow-raised"
                }`}
              >
                {buyer ? part.text : plain(part.text)}
              </p>
            );
          }
          if (part.type.startsWith("tool-")) {
            return <ToolResult key={index} part={part} slug={slug} said={said} onChoose={onChoose} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}
