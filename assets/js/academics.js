document.addEventListener('DOMContentLoaded', () => {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
    });
  });

  document.querySelectorAll('.js-toggle-row').forEach(row => {
    row.addEventListener('click', () => {
      const target = document.getElementById(row.dataset.target);
      if (!target) return;
      const isOpen = target.style.display !== 'none';
      target.style.display = isOpen ? 'none' : 'block';
      if (!isOpen) {
        target.classList.add('in');
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  });
});
