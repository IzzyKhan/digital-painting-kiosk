"use client";

import { useState } from "react";

type EmailArtworkFormProps = {
  artworkId: string;
  className?: string;
  variant?: "default" | "inline";
};

type Status = "idle" | "sending" | "sent" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailArtworkForm({
  artworkId,
  className,
  variant = "default",
}: EmailArtworkFormProps) {
  const inline = variant === "inline";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;

    const trimmed = email.trim();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setStatus("sending");
    setMessage("");

    try {
      const res = await fetch(`/api/artworks/${artworkId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? "Failed to send email");
      }

      setStatus("sent");
      setMessage("Sent! Check your inbox.");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Failed to send email"
      );
    }
  };

  return (
    <div className={inline ? `shrink-0 ${className ?? ""}` : className}>
      <form
        onSubmit={handleSubmit}
        className={
          inline ? "flex shrink-0 flex-nowrap items-center gap-2" : undefined
        }
      >
        {inline ? (
          <>
            {message ? (
              <p
                className={`max-w-[9rem] shrink-0 truncate text-[0.65rem] ${
                  status === "error" ? "text-danger" : "text-ink-muted"
                }`}
                aria-live="polite"
              >
                {message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={status === "sending"}
              className="kiosk-pill shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send"}
            </button>
            <label className="sr-only" htmlFor={`email-${artworkId}`}>
              Email
            </label>
            <input
              id={`email-${artworkId}`}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (status !== "idle") setStatus("idle");
              }}
              className="kiosk-input kiosk-input-header h-8"
            />
          </>
        ) : (
          <>
            <label
              className="kiosk-section-label mb-2 block"
              htmlFor={`email-${artworkId}`}
            >
              Email
            </label>
            <div className="flex gap-2">
              <input
                id={`email-${artworkId}`}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (status !== "idle") setStatus("idle");
                }}
                className="kiosk-input min-h-8 w-full flex-1"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                className="kiosk-pill shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </form>
      {message && !inline ? (
        <p
          className={`mt-2 text-[0.8rem] ${
            status === "error" ? "text-danger" : "text-ink-muted"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
