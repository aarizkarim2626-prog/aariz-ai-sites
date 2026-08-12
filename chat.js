// Vercel serverless function — this is the only place the Groq key lives.
// It never ships to the browser. Set GROQ_API_KEY in your Vercel project's
// Environment Variables (Settings → Environment Variables), not in this file.

// Very simple in-memory rate limiter: N requests per IP per minute.
// Note: this resets whenever the function's warm instance recycles, and
// each region/instance keeps its own counts — it's a basic deterrent
// against casual abuse, not a hard guarantee. For stricter limits at
// scale, use a shared store like Upstash Redis or Vercel KV instead.
const RATE_LIMIT = 15;          // requests
const WINDOW_MS = 60 * 1000;    // per 1 minute
const hits = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests — slow down a bit and try again." });
  }

  const { message } = req.body || {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: "Message is too long." });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is not set in environment variables.");
    return res.status(500).json({ error: "Server is not configured yet." });
  }

  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: "You are Aariz's AI, a direct assistant. Answer user questions like a brief, highly accurate Google Search snippet. Keep answers to 1-3 short sentences max. Never include filler talk, introductions, metadata, or closing thoughts."
          },
          { role: "user", content: message }
        ],
        temperature: 0.2,
        max_tokens: 150
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      const detail = data?.error?.message ? `: ${data.error.message}` : "";
      return res.status(groqResponse.status).json({ error: `Upstream error${detail}` });
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || "No response received.";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Could not reach the model provider." });
  }
}
