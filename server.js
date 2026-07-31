/* ============================================================
   NDARAMA HIGH SCHOOL — BACKEND SERVER
   Serves the static site AND proxies chatbot messages to an
   AI model. The API key lives only here, server-side — it is
   never sent to the browser.
   ============================================================ */

require('dotenv').config(); // loads variables from a local .env file

const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname)); // serves index.html, about.html, /assets, etc.

// ------------------------------------------------------------
// >>> YOUR API KEY GOES IN THE .env FILE, NOT HERE. <<<
// Copy .env.example to a new file named ".env" in this same
// folder and set:   HF_API_KEY=hf_xxxxxxxxxxxxxxxxxxxx
// This line just reads whatever you put there:
// ------------------------------------------------------------
const HF_API_KEY = process.env.HF_API_KEY;

// Any chat model available through HF's Inference Providers router works here.
// Examples: "meta-llama/Llama-3.1-8B-Instruct", "Qwen/Qwen2.5-7B-Instruct"
const MODEL = process.env.HF_MODEL || 'meta-llama/Llama-3.70B-Instruct';

const SYSTEM_PROMPT = `You are the friendly virtual assistant for Ndarama High School, a government day school in Masvingo, Zimbabwe (motto: "Spring of Knowledge and Power").

Key facts you can use:
- Founded 1984, government day school, runs a hot-sitting timetable (morning & afternoon batches).
- Head: Mr. Oddy Matongo.
- 2025 A-Level results: 100% overall pass rate (first perfect rate in school history). Pure Mathematics 98 candidates/100%/40 A's. Sociology 42/100%/30 A's. Chemistry 53/100%. Literature in English 32/100%. Physics 38/97.3%. Geography 41/100%. Computer Science 25/100%/16 A's. History 50/100%. Biology 29/97%. Accounts 7/57%. Literature in Shona 9/88%.
- Top student 2025: Elias Murisi, 30 points (maximum) in Sciences.
- First-ever student album "Detembo Re Yambiro" launched July 8, 2026, produced by 8 learners (Forms 3-6), themes include drug awareness and hope; Minister Chadzamira attended the launch.
- Contact: P.O. Box 9010, Masvingo, Zimbabwe. Phone +263 39 225 2984. Cell 0112 181 174. Email info@ndarama.ac.zw. Office hours Mon-Fri 7:30am-4pm, Sat 8am-12pm.

Answer questions about admissions, academics, facilities, and student life warmly and concisely (2-4 sentences unless asked for more detail). If you don't know something specific (e.g. exact fees, term dates), say so honestly and direct the person to contact the school office rather than inventing details.`;

app.post('/api/chat', async (req, res) => {
  try {
    if (!HF_API_KEY) {
      return res.status(500).json({
        error: 'The server has no HF_API_KEY set. Add it to a .env file (see .env.example) and restart the server.'
      });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'No messages were provided.' });
    }

    // Hugging Face's router speaks the same request/response shape as OpenAI's
    // chat completions API, so the system prompt goes inside the messages array.
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Hugging Face API error:', data);
      return res.status(response.status).json({ error: data.error?.message || data.error || 'The AI model returned an error.' });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();

    res.json({ reply: reply || "I'm not sure how to answer that — could you try rephrasing?" });

  } catch (err) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Fallback: send index.html for any unmatched route (simple SPA-style catch-all)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Ndarama High School site running at http://localhost:${PORT}`);
  if (!HF_API_KEY) {
    console.warn('⚠️  HF_API_KEY is not set — the chatbot will not work until you add it to .env');
  }
});
