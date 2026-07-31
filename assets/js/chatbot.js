/* ============================================================
   NDARAMA CHATBOT WIDGET
   Talks to the local backend at POST /api/chat, which in turn
   calls the AI model using the key stored in your .env file.
   See server.js + .env.example for the backend half of this.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  const LOGO_SRC = 'assets/img/logo.jpg';
  const STARTER_CHIPS = [
    "What's the A-Level pass rate?",
    'Tell me about the album',
    'How do I book a tour?',
    'What subjects do you offer?'
  ];

  /* ---------- build DOM ---------- */
  const toggle = document.createElement('button');
  toggle.className = 'chat-toggle';
  toggle.setAttribute('aria-label', 'Open chat with the Ndarama assistant');
  toggle.innerHTML = `
    <svg class="chat-chat-icon" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <svg class="chat-close-icon" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    <span class="chat-dot"></span>
  `;

  const panel = document.createElement('div');
  panel.className = 'chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Ndarama High School assistant chat');
  panel.innerHTML = `
    <div class="chat-header">
      <span class="chat-avatar"><img src="${LOGO_SRC}" alt=""></span>
      <div>
        <div class="chat-title">Ndarama Assistant</div>
        <div class="chat-subtitle">Ask about admissions, results &amp; more</div>
      </div>
      <span class="chat-header-status" title="Online"></span>
    </div>
    <div class="chat-body" id="chatBody">
      <div class="chat-msg bot">Hi! I'm the Ndarama High School assistant. Ask me about admissions, our 2025 results, the album, or anything else about the school.</div>
    </div>
    <div class="chat-suggestions" id="chatSuggestions"></div>
    <form class="chat-input-row" id="chatForm">
      <input type="text" id="chatInput" placeholder="Type a message…" autocomplete="off" aria-label="Message">
      <button type="submit" class="chat-send" id="chatSend" aria-label="Send message">
        <svg viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </form>
  `;

  document.body.appendChild(panel);
  document.body.appendChild(toggle);

  const chatBody = panel.querySelector('#chatBody');
  const chatForm = panel.querySelector('#chatForm');
  const chatInput = panel.querySelector('#chatInput');
  const chatSend = panel.querySelector('#chatSend');
  const chipsWrap = panel.querySelector('#chatSuggestions');

  STARTER_CHIPS.forEach(text => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chat-chip';
    chip.textContent = text;
    chip.addEventListener('click', () => { sendMessage(text); });
    chipsWrap.appendChild(chip);
  });

  /* ---------- open / close ---------- */
  function setOpen(open) {
    toggle.classList.toggle('open', open);
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    if (open) setTimeout(() => chatInput.focus(), 250);
  }
  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('open')) setOpen(false);
  });

  /* ---------- conversation state ---------- */
  // Full message history sent to the backend on every turn (the backend/API is stateless).
  const history = [];

  function addMessage(role, text) {
    const el = document.createElement('div');
    el.className = 'chat-msg ' + role;
    el.textContent = text;
    chatBody.appendChild(el);
    chatBody.scrollTop = chatBody.scrollHeight;
    return el;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'chat-typing';
    el.id = 'chatTyping';
    el.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(el);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
  function hideTyping() {
    const el = document.getElementById('chatTyping');
    if (el) el.remove();
  }

  async function sendMessage(text) {
    const message = (text || '').trim();
    if (!message) return;

    chipsWrap.style.display = 'none';
    addMessage('user', message);
    history.push({ role: 'user', content: message });
    chatInput.value = '';
    chatSend.disabled = true;
    showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });

      const data = await res.json().catch(() => ({}));
      hideTyping();

      if (!res.ok) {
        addMessage('error', data.error || 'The assistant is temporarily unavailable. Please try again shortly.');
        return;
      }

      const reply = data.reply || "Sorry, I didn't catch that — could you rephrase?";
      addMessage('bot', reply);
      history.push({ role: 'assistant', content: reply });

    } catch (err) {
      hideTyping();
      addMessage('error', "I can't reach the assistant right now. If you're the site admin: run the backend with \"npm start\" and make sure HF_API_KEY is set in your .env file.");
    } finally {
      chatSend.disabled = false;
    }
  }

  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(chatInput.value);
  });

});
