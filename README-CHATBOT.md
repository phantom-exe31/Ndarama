# Ndarama High School — Chatbot Setup (Hugging Face)

The site has a floating chat widget (bottom-right, on every page). It talks
to a local backend (`supabase/server.js`), which is the only place your API
key ever lives — the browser never sees it.

> **Note:** `supabase/server.js` is now the one server you run. It serves
> the whole static site, the `/admin` editor, the articles API, *and* the
> chatbot, all together. The old standalone `server.js` in this root folder
> only ever handled the chatbot and is no longer used for running the site.

## 1. Install Node.js
You need Node.js 18 or newer. Check with:
```
node -v
```

## 2. Install dependencies
From inside the `ndarama-site/supabase` folder:
```
cd supabase
npm install
```

## 3. Add your Hugging Face token (and Supabase config)
Copy `supabase/.env.example` to a new file called `.env` in that same
`supabase` folder, then open it and paste in your real Hugging Face token
on this line:

```
HF_API_KEY=your_huggingface_token_here
```

Get a token from https://huggingface.co/settings/tokens (a "Read" token is
enough) — replace `your_huggingface_token_here` with it, e.g.
`HF_API_KEY=hf_AbCdEfGhIjKlMnOpQrStUvWxYz`. The same `.env` file also holds
your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, etc., which power the news
articles and the admin editor.

Never commit `.env` to git or share it.

### Picking a model
`HF_MODEL` in `.env` controls which model answers. It defaults to
`meta-llama/Llama-3.1-8B-Instruct`. Any chat model available through
Hugging Face's Inference Providers router will work — swap in another one
(e.g. `Qwen/Qwen2.5-7B-Instruct`) by changing that line. Note some models
require you to accept their license on the model's HF page before your
token can use them, and some providers charge per request once you exceed
the free tier.

## 4. Run the site
From inside the `supabase` folder:
```
npm start
```
Then open http://localhost:3000. All pages (Home, About, Academics, Student
Life, News, Contact) are served from here, the News page will show whatever
articles you've published in `/admin/editor.html`, and the chat widget will
get real AI replies.

## How it works
- `assets/js/chatbot.js` — builds the chat widget UI on every page and sends
  each message to `POST /api/chat` on your own server. **The API key is
  never in this file or anywhere else the browser can read** — putting it in
  front-end JavaScript would let anyone steal it via dev tools.
- `supabase/server.js` — receives that request, attaches your `HF_API_KEY`
  and a system prompt describing the school, and forwards it to Hugging
  Face's OpenAI-compatible chat router. The reply is sent back to the
  widget. This same file also serves the static pages and the articles API
  the News page reads from.
- If `HF_API_KEY` isn't set, the server still runs (the rest of the site
  works normally) but the chatbot shows a friendly error asking you to add
  the key.

## Deploying
When you host this for real (Render, Railway, a VPS, etc.), set `HF_API_KEY`
(and the Supabase variables) as environment variables in your hosting
platform's dashboard instead of uploading a `.env` file — same mechanism,
just configured through their UI. Point your start command at
`supabase/server.js`.

## Switching providers later
`supabase/server.js` calls `https://router.huggingface.co/v1/chat/completions`.
To use a different provider (Anthropic, OpenAI, etc.), edit the `fetch(...)`
call and headers around the `/api/chat` route in that file — the request URL
and auth header differ by provider, but the widget and conversation history
don't need to change.
