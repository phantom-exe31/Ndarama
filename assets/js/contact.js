document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contactForm');
  const note = document.getElementById('formNote');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      note.textContent = 'Please fill in your name, email, and message before sending.';
      note.style.color = 'var(--terracotta)';
      return;
    }
    note.textContent = 'Thanks — this demo form doesn\'t send yet. Wire it up to your email or CMS backend to go live.';
    note.style.color = 'var(--gold-muted)';
    form.reset();
  });
});
