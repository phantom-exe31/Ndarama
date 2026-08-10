// ============================================================
// ADMIN PANEL – Supabase version with enhanced features
// ============================================================

let token = null;
let currentArticles = [];
let editingId = null;
let deletingId = null;
let mediaList = []; // media for current article being edited
let allMedia = [];  // global media library items
let loginAttempts = 0;
const MAX_LOGIN_ATTEMPTS = 5;
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
let sessionTimer = null;
let lastActivity = Date.now();
let sessionInterval = null;

const API_URL = '/api';

// ============================================================
// DOM REFS
// ============================================================
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const sessionTimerEl = document.getElementById('sessionTimer');
const sessionCountdown = document.getElementById('sessionCountdown');

const articleList = document.getElementById('articleList');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const sortBy = document.getElementById('sortBy');
const newArticleBtn = document.getElementById('newArticleBtn');

const modal = document.getElementById('articleModal');
const modalTitle = document.getElementById('modalTitle');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const articleForm = document.getElementById('articleForm');
const articleId = document.getElementById('articleId');
const modalSave = document.getElementById('modalSave');

const deleteModal = document.getElementById('deleteModal');
const deleteClose = document.getElementById('deleteClose');
const deleteCancel = document.getElementById('deleteCancel');
const deleteConfirm = document.getElementById('deleteConfirm');
const deleteTitle = document.getElementById('deleteTitle');

const fileInput = document.getElementById('fileInput');
const mediaListEl = document.getElementById('mediaList');
const addMediaBtn = document.getElementById('addMediaBtn');
const addVideoFileBtn = document.getElementById('addVideoFileBtn');
const addVideoBtn = document.getElementById('addVideoBtn');
const addFileBtn = document.getElementById('addFileBtn');

const mediaLibModal = document.getElementById('mediaLibraryModal');
const mediaLibraryGrid = document.getElementById('mediaLibraryGrid');
const libFileInput = document.getElementById('libFileInput');
const libUploadBtn = document.getElementById('libUploadBtn');
const mediaLibClose = document.getElementById('mediaLibClose');
const mediaLibCancel = document.getElementById('mediaLibCancel');
const mediaLibSelect = document.getElementById('mediaLibSelect');
const openMediaLibraryBtn = document.getElementById('openMediaLibraryBtn');
const openMediaLibBtn = document.getElementById('openMediaLibBtn');

const exportPdfBtn = document.getElementById('exportPdfBtn');
const toastContainer = document.getElementById('toastContainer');

// ============================================================
// TOAST SYSTEM
// ============================================================
function showToast(message, type = 'info', duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close">✕</button>
  `;
  toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());
  toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, duration);
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================
function resetSessionTimer() {
  lastActivity = Date.now();
  sessionTimerEl.style.transform = 'scaleX(1)';
  sessionTimerEl.className = 'session-timer';
  if (sessionInterval) clearInterval(sessionInterval);
  startSessionCountdown();
}

function startSessionCountdown() {
  const total = SESSION_TIMEOUT;
  let elapsed = 0;
  if (sessionInterval) clearInterval(sessionInterval);
  sessionInterval = setInterval(() => {
    elapsed += 1000;
    const remaining = total - elapsed;
    const pct = Math.max(0, remaining / total);
    sessionTimerEl.style.transform = `scaleX(${pct})`;
    if (pct < 0.2) sessionTimerEl.className = 'session-timer danger';
    else if (pct < 0.4) sessionTimerEl.className = 'session-timer warning';
    else sessionTimerEl.className = 'session-timer';
    if (remaining <= 0) {
      clearInterval(sessionInterval);
      handleSessionTimeout();
    }
    // show countdown in header
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    sessionCountdown.textContent = `⏱ ${mins}m ${secs}s`;
  }, 1000);
}

function handleSessionTimeout() {
  showToast('Session expired. Please login again.', 'error');
  logout();
}

// Activity listeners
['click', 'keydown', 'scroll', 'mousemove'].forEach(evt => {
  document.addEventListener(evt, () => {
    if (adminPanel.style.display !== 'none') resetSessionTimer();
  });
});

// ============================================================
// AUTH
// ============================================================
function checkAuth() {
  const savedToken = localStorage.getItem('adminToken');
  if (savedToken) {
    token = savedToken;
    showAdminPanel();
    loadArticles();
    loadCategories();
    loadMediaLibrary();
    resetSessionTimer();
  }
}

function login(e) {
  e.preventDefault();
  const username = loginUsername.value.trim();
  const password = loginPassword.value.trim();

  if (!username || !password) {
    loginError.textContent = 'Please enter username and password.';
    return;
  }

  if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    loginError.textContent = `Too many failed attempts. Account locked for ${Math.round(SESSION_TIMEOUT/60000)} minutes.`;
    return;
  }

  fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token) {
      token = data.token;
      localStorage.setItem('adminToken', token);
      loginAttempts = 0;
      loginError.textContent = '';
      showAdminPanel();
      loadArticles();
      loadCategories();
      loadMediaLibrary();
      resetSessionTimer();
      showToast('Welcome back, Admin!', 'success');
    } else {
      loginAttempts++;
      loginError.textContent = data.error || 'Invalid credentials.';
      showToast('Login failed', 'error');
    }
  })
  .catch(() => {
    loginError.textContent = 'Network error. Please try again.';
  });
}

function logout() {
  if (sessionInterval) clearInterval(sessionInterval);
  token = null;
  localStorage.removeItem('adminToken');
  loginPassword.value = '';
  loginError.textContent = '';
  loginAttempts = 0;
  showLoginScreen();
  showToast('Logged out.', 'info');
}

function showLoginScreen() {
  loginScreen.style.display = 'flex';
  adminPanel.style.display = 'none';
}

function showAdminPanel() {
  loginScreen.style.display = 'none';
  adminPanel.style.display = 'block';
}

// ============================================================
// API HELPERS
// ============================================================
function apiFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(url, { ...options, headers })
    .then(async res => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      return data;
    });
}

// ============================================================
// LOAD DATA
// ============================================================
function loadArticles() {
  fetch(`${API_URL}/admin/articles`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      currentArticles = data;
      updateStats(data);
      renderArticles(data);
    })
    .catch(err => {
      console.error('Failed to load articles:', err);
      articleList.innerHTML = `<div class="empty-state"><p>⚠️ Failed to load articles.</p></div>`;
      showToast('Error loading articles', 'error');
    });
}

function loadCategories() {
  fetch(`${API_URL}/categories`)
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById('categoryFilter');
      select.innerHTML = '<option value="">All Categories</option>';
      data.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.category;
        opt.textContent = `${cat.category_label || cat.category} (${cat.count})`;
        select.appendChild(opt);
      });
    })
    .catch(err => console.error('Failed to load categories:', err));
}

function loadMediaLibrary() {
  fetch(`${API_URL}/media`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(data => {
      allMedia = data;
      renderMediaLibrary();
    })
    .catch(err => {
      console.error('Failed to load media library:', err);
      allMedia = [];
      renderMediaLibrary();
    });
}

function updateStats(articles) {
  document.getElementById('totalArticles').textContent = articles.length;
  document.getElementById('featuredCount').textContent = articles.filter(a => a.featured).length;
  const categories = new Set(articles.map(a => a.category));
  document.getElementById('categoryCount').textContent = categories.size;
  let mediaCount = 0;
  articles.forEach(a => { if (a.media_count) mediaCount += a.media_count; });
  document.getElementById('mediaCount').textContent = mediaCount;
}

function renderArticles(articles) {
  if (!articles || articles.length === 0) {
    articleList.innerHTML = `<div class="empty-state"><div class="icon">📝</div><h3>No articles yet</h3><p>Click "New Article" to create your first blog post.</p></div>`;
    return;
  }

  // Apply sorting
  const sort = sortBy.value;
  const sorted = [...articles].sort((a, b) => {
    switch (sort) {
      case 'date-asc': return new Date(a.date || a.created) - new Date(b.date || b.created);
      case 'date-desc': return new Date(b.date || b.created) - new Date(a.date || a.created);
      case 'title-asc': return a.title.localeCompare(b.title);
      case 'title-desc': return b.title.localeCompare(a.title);
      case 'status': return (a.status || '').localeCompare(b.status || '');
      default: return 0;
    }
  });

  articleList.innerHTML = sorted.map(article => {
    const thumb = article.media && article.media.length > 0 && article.media[0].url
      ? `<img src="${article.media[0].url}" alt="${article.media[0].alt_text || ''}" loading="lazy" />`
      : `<div class="no-img">📄</div>`;
    const categoryClass = article.category || 'general';
    const statusClass = article.status || 'published';
    return `
      <div class="article-item" data-id="${article.id}">
        <div class="thumb">${thumb}</div>
        <div class="info">
          <h4>${article.title}</h4>
          <div class="meta">
            <span class="category-tag ${categoryClass}">${article.category_label || article.category || 'General'}</span>
            <span>${formatDate(article.date)}</span>
            ${article.featured ? '<span class="featured-badge">★ Featured</span>' : ''}
            <span class="status-badge ${statusClass}">${article.status || 'Published'}</span>
            ${article.media && article.media.length > 0 ? `<span class="media-indicator">📎 ${article.media.length}</span>` : ''}
          </div>
        </div>
        <div class="actions">
          <button class="edit-btn" onclick="editArticle('${article.id}')">✎ Edit</button>
          <button class="delete-btn" onclick="confirmDelete('${article.id}')">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZW', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ============================================================
// FILTER & SEARCH
// ============================================================
function filterArticles() {
  const search = searchInput.value.toLowerCase().trim();
  const category = categoryFilter.value;
  const status = statusFilter.value;
  let filtered = currentArticles;
  if (category) filtered = filtered.filter(a => a.category === category);
  if (status) filtered = filtered.filter(a => a.status === status);
  if (search) {
    filtered = filtered.filter(a =>
      a.title.toLowerCase().includes(search) ||
      (a.excerpt && a.excerpt.toLowerCase().includes(search)) ||
      (a.content && a.content.toLowerCase().includes(search))
    );
  }
  renderArticles(filtered);
}
searchInput.addEventListener('input', filterArticles);
categoryFilter.addEventListener('change', filterArticles);
statusFilter.addEventListener('change', filterArticles);
sortBy.addEventListener('change', filterArticles);

// ============================================================
// MEDIA MANAGEMENT (per article)
// ============================================================
function addMediaItem(mediaData) {
  mediaList.push(mediaData);
  renderMediaList();
}

function removeMediaItem(index) {
  mediaList.splice(index, 1);
  renderMediaList();
}

function updateMediaCaption(index, caption) {
  mediaList[index].caption = caption;
}

function updateMediaAlt(index, alt) {
  mediaList[index].alt_text = alt;
}

function toggleFeaturedMedia(index) {
  mediaList.forEach((m, i) => m.is_featured = (i === index) ? !m.is_featured : false);
  renderMediaList();
}

function renderMediaList() {
  if (!mediaListEl) return;
  if (mediaList.length === 0) {
    mediaListEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--gray);font-size:0.85rem;">No media attached yet.</div>`;
    return;
  }

  mediaListEl.innerHTML = mediaList.map((item, index) => {
    const isImage = item.type === 'image';
    const isVideo = item.type === 'video' || item.type === 'video_link';
    const isFile = item.type === 'file' || item.type === 'audio';

    let preview = '';
    if (isImage && item.url) {
      preview = `<img src="${item.url}" alt="${item.alt_text || ''}" loading="lazy" />`;
    } else if (isVideo && item.url) {
      if (item.url.includes('youtube.com') || item.url.includes('youtu.be')) {
        preview = `<img src="https://img.youtube.com/vi/${getYouTubeId(item.url)}/mqdefault.jpg" alt="Video thumbnail" />`;
      } else if (item.url.includes('vimeo.com')) {
        preview = `<div class="media-icon">🎬</div>`;
      } else if (item.url.includes('tiktok.com')) {
        preview = `<div class="media-icon">🎵</div>`;
      } else if (item.url.includes('instagram.com')) {
        preview = `<div class="media-icon">📸</div>`;
      } else {
        preview = `<video src="${item.url}" muted></video>`;
      }
    } else if (isFile) {
      preview = `<div class="media-icon">📄</div>`;
    } else {
      preview = `<div class="media-icon">📎</div>`;
    }

    return `
      <div class="media-item ${item.is_featured ? 'featured' : ''}">
        ${item.is_featured ? '<div class="featured-badge">★ Featured</div>' : ''}
        <div class="media-preview">${preview}</div>
        <div class="media-info">
          <span class="media-type">${item.type}</span>
          <div>
            <button class="btn-sm btn-secondary" onclick="toggleFeaturedMedia(${index})" style="font-size:0.6rem;padding:2px 6px;">★</button>
            <button class="media-remove" onclick="removeMediaItem(${index})">✕</button>
          </div>
        </div>
        <input class="media-caption-input" placeholder="Caption" value="${item.caption || ''}" onchange="updateMediaCaption(${index}, this.value)" />
        <input class="media-alt-input" placeholder="Alt text" value="${item.alt_text || ''}" onchange="updateMediaAlt(${index}, this.value)" />
      </div>
    `;
  }).join('');
}

function getYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
  return match ? match[1] : '';
}

// ============================================================
// FILE UPLOAD (to Supabase storage via server)
// ============================================================
function uploadFiles(files, target = 'article') {
  const uploadNext = (index) => {
    if (index >= files.length) return;
    const file = files[index];
    const formData = new FormData();
    formData.append('file', file);

    fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      if (data.url) {
        if (target === 'article') {
          addMediaItem({
            type: data.type || 'file',
            url: data.url,
            filename: data.filename,
            original_name: data.originalName,
            mime_type: data.mimeType,
            size: data.size,
            alt_text: file.name.split('.')[0],
            caption: '',
            is_featured: mediaList.length === 0
          });
          showToast(`Uploaded: ${file.name}`, 'success');
        } else if (target === 'library') {
          // Add to library and reload
          loadMediaLibrary();
          showToast(`Uploaded to library: ${file.name}`, 'success');
        }
      }
      uploadNext(index + 1);
    })
    .catch(err => {
      console.error('Upload error:', err);
      showToast(`Failed to upload: ${file.name}`, 'error');
      uploadNext(index + 1);
    });
  };
  uploadNext(0);
}

function addVideoLink() {
  const url = prompt('Enter a YouTube, Vimeo, TikTok, or Instagram video URL:');
  if (!url) return;
  const trimmed = url.trim();
  if (!trimmed) return;
  if (!/(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/|tiktok\.com\/|instagram\.com\/(p|reel|tv)\/)/.test(trimmed)) {
    alert('Please enter a valid YouTube, Vimeo, TikTok, or Instagram URL.');
    return;
  }
  addMediaItem({
    type: 'video_link',
    url: trimmed,
    filename: null,
    original_name: null,
    mime_type: null,
    size: null,
    alt_text: 'Video',
    caption: '',
    is_featured: mediaList.length === 0
  });
  showToast('Video link added.', 'success');
}

// ============================================================
// MEDIA LIBRARY MODAL
// ============================================================
function renderMediaLibrary() {
  const grid = mediaLibraryGrid;
  if (!allMedia || allMedia.length === 0) {
    grid.innerHTML = `<div class="media-library-empty">No media files yet. Upload some!</div>`;
    return;
  }
  grid.innerHTML = allMedia.map(m => `
    <div class="media-library-item" data-id="${m.id}">
      ${m.type === 'image' ? `<img src="${m.url}" alt="${m.original_name || ''}" />` : `<div style="height:90px;display:flex;align-items:center;justify-content:center;background:#f0f0f0;font-size:2rem;">📄</div>`}
      <div class="lib-name">${m.original_name || m.filename || 'file'}</div>
      <div class="lib-actions">
        <button class="select-lib" data-id="${m.id}">Select</button>
        <button class="del-lib" data-id="${m.id}">✕</button>
      </div>
    </div>
  `).join('');

  // Select from library → add to article
  grid.querySelectorAll('.select-lib').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.dataset.id;
      const media = allMedia.find(m => m.id === id);
      if (!media) return;
      // Clone media object with necessary fields
      addMediaItem({
        type: media.type || 'file',
        url: media.url,
        filename: media.filename,
        original_name: media.original_name,
        mime_type: media.mime_type,
        size: media.size,
        alt_text: media.alt_text || '',
        caption: media.caption || '',
        is_featured: mediaList.length === 0
      });
      showToast(`Added: ${media.original_name || media.filename}`, 'success');
    });
  });

  // Delete from library
  grid.querySelectorAll('.del-lib').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const id = this.dataset.id;
      if (!confirm('Delete this media permanently?')) return;
      apiFetch(`${API_URL}/media/${id}`, { method: 'DELETE' })
        .then(() => {
          loadMediaLibrary();
          showToast('Media deleted.', 'error');
        })
        .catch(err => {
          showToast('Error deleting media: ' + err.message, 'error');
        });
    });
  });
}

function openMediaLibrary() {
  renderMediaLibrary();
  mediaLibModal.style.display = 'flex';
}

function closeMediaLibrary() {
  mediaLibModal.style.display = 'none';
}

// Library upload
libUploadBtn.addEventListener('click', function() {
  const files = libFileInput.files;
  if (!files.length) {
    showToast('Select files first.', 'warning');
    return;
  }
  uploadFiles(Array.from(files), 'library');
  libFileInput.value = '';
});

// ============================================================
// PDF EXPORT
// ============================================================
function exportPDF() {
  const content = articleList.innerText || 'No articles';
  const win = window.open('', '_blank');
  if (!win) {
    showToast('Please allow popups for PDF export.', 'warning');
    return;
  }
  win.document.write(`
    <html><head><title>Ndarama Articles</title>
    <style>body{font-family:Inter,sans-serif;padding:40px;max-width:900px;margin:auto;}
    h1{color:#5C2E16;} table{width:100%;border-collapse:collapse;margin-top:20px;}
    th,td{padding:10px;border-bottom:1px solid #eee;text-align:left;}
    th{background:#5C2E16;color:#fff;}</style>
    </head><body>
    <h1>📄 Ndarama Blog — Article List</h1>
    <p>Exported: ${new Date().toLocaleString()}</p>
    <table>
      <tr><th>Title</th><th>Category</th><th>Status</th><th>Date</th></tr>
      ${currentArticles.map(a => `
        <tr><td>${a.title}</td><td>${a.category}</td><td>${a.status}</td><td>${a.date || '—'}</td></tr>
      `).join('')}
    </table>
    <p style="margin-top:30px;color:#888;">Total: ${currentArticles.length} articles</p>
    <script>
      window.onload = function() { window.print(); } <\/script>
    </body></html>
  `);
  win.document.close();
  showToast('PDF export started.', 'success');
}

// ============================================================
// CREATE / EDIT ARTICLE
// ============================================================
function resetForm() {
  document.getElementById('articleId').value = '';
  document.getElementById('articleTitle').value = '';
  document.getElementById('articleCategory').value = 'general';
  document.getElementById('articleCategoryLabel').value = '';
  document.getElementById('articleDate').value = '';
  document.getElementById('articleAuthor').value = '';
  document.getElementById('articleFeatured').value = 'false';
  document.getElementById('articleStatus').value = 'published';
  document.getElementById('articleSlug').value = '';
  document.getElementById('articleTags').value = '';
  document.getElementById('articleExcerpt').value = '';
  document.getElementById('articleContent').value = '';
  mediaList = [];
  renderMediaList();
  editingId = null;
  modalTitle.textContent = 'New Article';
  modalSave.textContent = 'Create Article';
}

function openModal() {
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
  resetForm();
}

function editArticle(id) {
  const article = currentArticles.find(a => a.id === id);
  if (!article) return;

  document.getElementById('articleId').value = article.id;
  document.getElementById('articleTitle').value = article.title || '';
  document.getElementById('articleCategory').value = article.category || 'general';
  document.getElementById('articleCategoryLabel').value = article.category_label || '';
  document.getElementById('articleDate').value = article.date || '';
  document.getElementById('articleAuthor').value = article.author || '';
  document.getElementById('articleFeatured').value = article.featured ? 'true' : 'false';
  document.getElementById('articleStatus').value = article.status || 'published';
  document.getElementById('articleSlug').value = article.slug || '';
  document.getElementById('articleTags').value = article.tags ? article.tags.map(t => t.name).join(', ') : '';
  document.getElementById('articleExcerpt').value = article.excerpt || '';
  document.getElementById('articleContent').value = article.content || '';

  mediaList = article.media ? article.media.map(m => ({
    type: m.type,
    url: m.url,
    filename: m.filename,
    original_name: m.original_name,
    mime_type: m.mime_type,
    size: m.size,
    alt_text: m.alt_text || '',
    caption: m.caption || '',
    is_featured: !!m.is_featured
  })) : [];
  renderMediaList();

  editingId = id;
  modalTitle.textContent = 'Edit Article';
  modalSave.textContent = 'Update Article';
  openModal();
}

function saveArticle(e) {
  e.preventDefault();

  const tagsInput = document.getElementById('articleTags').value.trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

  const data = {
    title: document.getElementById('articleTitle').value.trim(),
    category: document.getElementById('articleCategory').value,
    category_label: document.getElementById('articleCategoryLabel').value.trim(),
    date: document.getElementById('articleDate').value,
    author: document.getElementById('articleAuthor').value.trim(),
    featured: document.getElementById('articleFeatured').value === 'true',
    status: document.getElementById('articleStatus').value,
    slug: document.getElementById('articleSlug').value.trim(),
    excerpt: document.getElementById('articleExcerpt').value.trim(),
    content: document.getElementById('articleContent').value.trim(),
    tags: tags,
    media: mediaList.map(m => ({
      type: m.type,
      url: m.url,
      filename: m.filename || null,
      original_name: m.original_name || null,
      mime_type: m.mime_type || null,
      size: m.size || null,
      alt_text: m.alt_text || null,
      caption: m.caption || null,
      is_featured: m.is_featured || false
    }))
  };

  if (!data.title || !data.content) {
    alert('Title and content are required.');
    return;
  }

  const isEdit = editingId !== null;
  const url = isEdit ? `${API_URL}/articles/${editingId}` : `${API_URL}/articles`;
  const method = isEdit ? 'PUT' : 'POST';

  apiFetch(url, { method, body: JSON.stringify(data) })
    .then(() => {
      closeModal();
      loadArticles();
      loadCategories();
      showToast(isEdit ? 'Article updated!' : 'Article created!', 'success');
    })
    .catch(err => {
      alert('Error saving article: ' + err.message);
    });
}

// ============================================================
// DELETE
// ============================================================
function confirmDelete(id) {
  const article = currentArticles.find(a => a.id === id);
  if (!article) return;
  deletingId = id;
  deleteTitle.textContent = article.title;
  deleteModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
  deleteModal.style.display = 'none';
  document.body.style.overflow = '';
  deletingId = null;
}

function deleteArticle() {
  if (!deletingId) return;
  apiFetch(`${API_URL}/articles/${deletingId}`, { method: 'DELETE' })
    .then(() => {
      closeDeleteModal();
      loadArticles();
      loadCategories();
      showToast('Article deleted.', 'error');
    })
    .catch(err => {
      alert('Error deleting article: ' + err.message);
    });
}

// ============================================================
// EVENT LISTENERS
// ============================================================
loginForm.addEventListener('submit', login);
logoutBtn.addEventListener('click', logout);
newArticleBtn.addEventListener('click', () => { resetForm(); openModal(); });
modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
articleForm.addEventListener('submit', saveArticle);
deleteClose.addEventListener('click', closeDeleteModal);
deleteCancel.addEventListener('click', closeDeleteModal);
deleteModal.addEventListener('click', (e) => { if (e.target === deleteModal) closeDeleteModal(); });
deleteConfirm.addEventListener('click', deleteArticle);

addMediaBtn.addEventListener('click', () => {
  fileInput.accept = 'image/*';
  fileInput.multiple = true;
  fileInput.click();
});
addFileBtn.addEventListener('click', () => {
  fileInput.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt';
  fileInput.multiple = true;
  fileInput.click();
});
addVideoFileBtn.addEventListener('click', () => {
  fileInput.accept = 'video/mp4,video/*';
  fileInput.multiple = true;
  fileInput.click();
});
addVideoBtn.addEventListener('click', addVideoLink);

fileInput.addEventListener('change', function() {
  const files = this.files;
  if (files.length === 0) return;
  const validFiles = Array.from(files).filter(f => {
    if (this.accept.includes('image')) return f.type.startsWith('image/');
    if (this.accept.includes('video')) return f.type.startsWith('video/');
    return true;
  });
  if (validFiles.length === 0) {
    alert('No valid files selected.');
    return;
  }
  uploadFiles(validFiles, 'article');
  this.value = '';
});

// Media Library buttons
openMediaLibraryBtn.addEventListener('click', openMediaLibrary);
openMediaLibBtn.addEventListener('click', openMediaLibrary);
mediaLibClose.addEventListener('click', closeMediaLibrary);
mediaLibCancel.addEventListener('click', closeMediaLibrary);
mediaLibModal.addEventListener('click', (e) => { if (e.target === mediaLibModal) closeMediaLibrary(); });
mediaLibSelect.addEventListener('click', closeMediaLibrary);

// PDF Export
exportPdfBtn.addEventListener('click', exportPDF);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); closeDeleteModal(); closeMediaLibrary(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && modal.style.display !== 'none') {
    e.preventDefault();
    articleForm.dispatchEvent(new Event('submit'));
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n' && adminPanel.style.display !== 'none') {
    e.preventDefault();
    resetForm();
    openModal();
  }
});

// ============================================================
// INIT
// ============================================================
checkAuth();