document.addEventListener('DOMContentLoaded', () => {

  /* ============ RESULTS CHART ============ */
  const results = [
    { name: 'Pure Mathematics', pct: 100, type: 'stem', candidates: 98, a: 40, note: 'Highest enrollment — flagship STEM subject' },
    { name: 'Sociology', pct: 100, type: 'arts', candidates: 42, a: 30, note: 'Leading Arts performer' },
    { name: 'Chemistry', pct: 100, type: 'stem', candidates: 53, a: 21, note: 'Full pass rate across all candidates' },
    { name: 'Lit. in English', pct: 100, type: 'arts', candidates: 32, a: 21, note: 'Full pass rate across all candidates' },
    { name: 'Physics', pct: 97.3, type: 'stem', candidates: 38, a: 19, note: 'Near-perfect pass rate' },
    { name: 'Geography', pct: 100, type: 'arts', candidates: 41, a: 17, note: 'Full pass rate across all candidates' },
    { name: 'Computer Science', pct: 100, type: 'stem', candidates: 25, a: 16, note: '64% of candidates scored an A' },
    { name: 'History', pct: 100, type: 'arts', candidates: 50, a: 14, note: 'Highest Arts enrollment' },
    { name: 'Biology', pct: 97, type: 'stem', candidates: 29, a: 9, note: 'Strong showing across the cohort' },
  ];
  const chartCard = document.getElementById('chartCard');
  if (chartCard) {
    results.forEach(r => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const barClass = r.pct === 100 ? 'perfect' : r.type;
      row.innerHTML = `
        <div class="bar-label">${r.name}</div>
        <div class="bar-track"><div class="bar-fill ${barClass}" data-pct="${r.pct}"></div></div>
        <div class="bar-pct">${r.pct}%</div>
        <div class="bar-tip">${r.candidates} candidates · ${r.a} A grades — ${r.note}</div>
      `;
      chartCard.appendChild(row);
    });
    const chartIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        chartIO.unobserve(e.target);
        e.target.querySelectorAll('.bar-fill').forEach(fill => {
          requestAnimationFrame(() => { fill.style.width = fill.dataset.pct + '%'; });
        });
      });
    }, { threshold: 0.2 });
    chartIO.observe(chartCard);
  }

  /* ============ ALBUM TRACKLIST (mock audio UI) ============ */
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
  if (tracklistEl) {
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
  }

  /* ============ TESTIMONIAL CAROUSEL ============ */
  const testimonials = [
    { quote: "Ndarama is a very good school and it has very well disciplined students. It's adorable.", name: 'Mesnah Takunda', role: 'Community Member' },
    { quote: 'I would like to shower a ton of appreciation to my former school Ndarama High, which was and still is instrumental in my journey to success — a base of knowledge and character build-up.', name: 'Brian Manyathi', role: 'Former Student' },
    { quote: "Best school in Masvingo, coz that's where I thrive for greatness.", name: 'Elwin Hlavano', role: 'Former Student' },
  ];
  const tWrap = document.getElementById('tWrap');
  const tDots = document.getElementById('tDots');
  if (tWrap && tDots) {
    testimonials.forEach((t, i) => {
      const card = document.createElement('div');
      card.className = 't-card' + (i === 0 ? ' active' : '');
      card.innerHTML = `<blockquote>&ldquo;${t.quote}&rdquo;</blockquote><cite>${t.name} — ${t.role}</cite><div class="t-stars">★★★★★</div>`;
      tWrap.insertBefore(card, tDots);
      const dot = document.createElement('button');
      dot.setAttribute('aria-label', 'Show testimonial ' + (i + 1));
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => showTestimonial(i));
      tDots.appendChild(dot);
    });
    let tIndex = 0;
    let tTimer;
    function showTestimonial(i) {
      const cards = tWrap.querySelectorAll('.t-card');
      const dots = tDots.querySelectorAll('button');
      cards.forEach(c => c.classList.remove('active'));
      dots.forEach(d => d.classList.remove('active'));
      cards[i].classList.add('active');
      dots[i].classList.add('active');
      tIndex = i;
      restartAutoplay();
    }
    function restartAutoplay() {
      clearInterval(tTimer);
      tTimer = setInterval(() => showTestimonial((tIndex + 1) % testimonials.length), 6000);
    }
    restartAutoplay();
    tWrap.addEventListener('mouseenter', () => clearInterval(tTimer));
    tWrap.addEventListener('mouseleave', restartAutoplay);
  }

  /* ============ 3D HERO SIGNATURE: kopjes + rising crest ============ */
  (function initHero3D() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || !window.THREE) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 1.6, 9);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    const kopjeGroup = new THREE.Group();
    const kopjeMat = new THREE.MeshStandardMaterial({ color: 0x3a4a6b, flatShading: true, roughness: 0.9, metalness: 0.05 });
    const kopjePositions = [[-4.2, -1.4, -2, 1.3], [-1.8, -1.7, -4, 2.1], [2.6, -1.5, -3, 1.8], [4.6, -1.8, -5, 2.6], [0.2, -2, -6, 2.8]];
    kopjePositions.forEach(([x, y, z, scale]) => {
      const geo = new THREE.IcosahedronGeometry(1, 0);
      const mesh = new THREE.Mesh(geo, kopjeMat);
      mesh.position.set(x, y, z);
      mesh.scale.set(scale, scale * 0.75, scale);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      kopjeGroup.add(mesh);
    });
    scene.add(kopjeGroup);

    const crestGroup = new THREE.Group();
    const goldMat = new THREE.MeshBasicMaterial({ color: 0xC9A227, wireframe: true, transparent: true, opacity: 0.55 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.045, 16, 100), goldMat);
    crestGroup.add(ring);
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), new THREE.MeshBasicMaterial({ color: 0xC9A227, wireframe: true, transparent: true, opacity: 0.85 }));
    crestGroup.add(core);
    crestGroup.position.set(0, 1.4, 0);
    scene.add(crestGroup);

    scene.add(new THREE.AmbientLight(0x8899bb, 1.1));
    const rim = new THREE.DirectionalLight(0xC9A227, 0.6);
    rim.position.set(-3, 5, 4);
    scene.add(rim);

    const particleCount = 140;
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8 - 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
      speeds[i] = 0.002 + Math.random() * 0.004;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({ color: 0xC9A227, size: 0.045, transparent: true, opacity: 0.75 });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);
    });

    let raf;
    function animate() {
      raf = requestAnimationFrame(animate);
      if (!prefersReduced) {
        crestGroup.rotation.y += 0.0032;
        crestGroup.rotation.x = Math.sin(Date.now() * 0.0002) * 0.08;
        kopjeGroup.rotation.y += 0.0003;

        const posArr = pGeo.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
          posArr[i * 3 + 1] += speeds[i];
          if (posArr[i * 3 + 1] > 5) posArr[i * 3 + 1] = -3.5;
        }
        pGeo.attributes.position.needsUpdate = true;

        camera.position.x += (mouseX * 1.2 - camera.position.x) * 0.02;
        camera.position.y += (1.6 - mouseY * 0.6 - camera.position.y) * 0.02;
        camera.lookAt(0, 0.6, 0);
      }
      renderer.render(scene, camera);
    }
    animate();
    canvas.classList.add('ready');

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); } else { animate(); }
    });
  })();

});
