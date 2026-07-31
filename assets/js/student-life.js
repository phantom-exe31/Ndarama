document.addEventListener('DOMContentLoaded', () => {
  const tracks = [
    { title: 'Vachandida (They Will Love Me)', time: '3:42', form: 'Form 5' },
    { title: 'Yambiro (The Warning)', time: '4:15', form: 'Form 6' },
    { title: 'Nzira Yerudo (Path of Love)', time: '3:28', form: 'Form 4' },
    { title: 'Rugare (Peace)', time: '3:56', form: 'Form 6' },
    { title: 'Simba Redu (Our Strength)', time: '4:02', form: 'Form 5' },
    { title: 'Tarisiro (Hope)', time: '3:34', form: 'Form 3' },
    { title: 'Nhaka (Heritage)', time: '4:22', form: 'Form 6' },
    { title: 'Detembo Re Yambiro (Reprise)', time: '5:01', form: 'Form 3' },
  ];
  const tracklistEl = document.getElementById('tracklist');
  if (!tracklistEl) return;
  tracks.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'track';
    row.innerHTML = `
      <div class="track-play" role="button" tabindex="0" aria-label="Play ${t.title}">
        <svg viewBox="0 0 10 12"><polygon points="0,0 10,6 0,12"/></svg>
      </div>
      <div class="track-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="track-title">${t.title}</div>
      <div class="track-meta">${t.time} · ${t.form}</div>
    `;
    const playBtn = row.querySelector('.track-play');
    function toggle() {
      const wasPlaying = row.classList.contains('playing');
      document.querySelectorAll('.track.playing').forEach(el => el.classList.remove('playing'));
      if (!wasPlaying) row.classList.add('playing');
    }
    playBtn.addEventListener('click', toggle);
    playBtn.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); } });
    tracklistEl.appendChild(row);
  });
});
