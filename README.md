# Aariz's AI

A small chat site backed by Groq's `llama-3.1-8b-instant`. The API key lives
only on the server (`api/chat.js`) — the browser never sees it.

## Deploy on Vercel (free)

**Option A — no terminal, just the browser:**
1. Create a GitHub repo and upload these files (`index.html`, `api/chat.js`, `.gitignore`, `.env.example`, `README.md`).
2. Go to https://vercel.com → **Add New → Project** → import that repo.
3. Before deploying, open **Environment Variables** and add:
   - Key: `GROQ_API_KEY`
   - Value: your real Groq key (get one at https://console.groq.com/keys — and rotate the old key you shared earlier, since it's been exposed)
4. Click **Deploy**. Vercel gives you a live URL like `aariz-ai.vercel.app`.

**Option B — command line:**
```bash
npm install -g vercel
cd aariz-ai-site
vercel login
vercel                      # first deploy, follow the prompts
vercel env add GROQ_API_KEY # paste your real key when asked
vercel --prod                # deploy to your live URL
```

## Rotate your key

The key you shared earlier in this chat is no longer safe to use. Go to
https://console.groq.com/keys, revoke the old one, and generate a fresh key
to put in `GROQ_API_KEY`.

## Rate limiting

`api/chat.js` limits each visitor to 15 messages per minute per IP. It's an
in-memory limit, so it resets whenever Vercel recycles the function and isn't
a hard guarantee under heavy traffic — good enough to stop casual abuse, not
meant to survive a real flood of traffic. If this ever gets popular, swap it
for a shared store like Vercel KV or Upstash Redis.

## Local testing

```bash
npm install -g vercel
cd aariz-ai-site
vercel dev
```
Then open the local URL it prints (usually `http://localhost:3000`).
