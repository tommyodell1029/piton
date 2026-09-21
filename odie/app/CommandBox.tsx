"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ToolCall = { name: string; input: unknown };

export function CommandBox() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || loading) return;

    setLoading(true);
    setError(null);
    setReply(null);

    try {
      const res = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        setReply(data.reply);
        setToolCalls(data.toolCalls ?? []);
        router.refresh();
      }
    } catch {
      setError("Couldn't reach Odie's command router.");
    } finally {
      setLoading(false);
      setMessage("");
    }
  }

  return (
    <>
      {(reply || error) && (
        <div className="card">
          <p className="card-title">Odie</p>
          {error ? (
            <p className="login-error">{error}</p>
          ) : (
            <p className="command-reply">{reply}</p>
          )}
          {toolCalls.length > 0 && (
            <p className="tool-trace">
              Used: {toolCalls.map((t) => t.name).join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="command-bar">
        <form className="command-form" onSubmit={handleSubmit}>
          <input
            className="command-input"
            placeholder="Ask Odie about Piton…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
          />
          <button className="command-send" type="submit" disabled={loading}>
            {loading ? "…" : "Send"}
          </button>
        </form>
      </div>
    </>
  );
}
