"use client";

import { useState } from "react";

type EmailArtworkFormProps = {
  artworkId: string;
  className?: string;
};

type Status = "idle" | "sending" | "sent" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailArtworkForm({ artworkId, className }: EmailArtworkFormProps) {
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
    <form onSubmit={handleSubmit} className={className}>
      <label
        className="mb-1 block text-[0.8rem] text-ink-muted"
        htmlFor={`email-${artworkId}`}
      >
        Email it to yourself
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
          className="min-h-10 flex-1 rounded-control border border-border bg-control px-3 text-sm text-ink placeholder:text-ink-faint"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex min-h-10 items-center justify-center rounded-control border border-border bg-control px-4 text-sm text-ink transition-colors hover:bg-control-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send"}
        </button>
      </div>
      {message ? (
        <p
          className={`mt-2 text-[0.8rem] ${
            status === "error" ? "text-danger" : "text-ink-muted"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
