// ============================================================
// ADMIN PANEL – Supabase version
// ============================================================

let token = null;
let currentArticles = [];
let editingId = null;
let deletingId = null;
let mediaList = [];

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

const articleList = document.getElementById('articleList');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
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
const addVideoBtn = document.getElementById('addVideoBtn');
const addFileBtn = document.getElementById('addFileBtn');

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
      showAdminPanel();
      loadArticles();
      loadCategories();
    } else {
      loginError.textContent = data.error || 'Invalid credentials.';
    }
  })
  .catch(() => {
    loginError.textContent = 'Network error. Please try again.';
  });
}

function logout() {
  token = null;
  localStorage.removeItem('adminToken');
  loginPassword.value = '';
  loginError.textContent = '';
  showLoginScreen();
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

  articleList.innerHTML = articles.map(article => `
    <div class="article-item" data-id="${article.id}">
      <div class="thumb">
        ${article.media && article.media.length > 0 && article.media[0].url ?
          `<img src="${article.media[0].url}" alt="${article.media[0].alt_text || ''}" loading="lazy" />` :
          `<div class="no-img">📄</div>`}
      </div>
      <div class="info">
        <h4>${article.title}</h4>
        <div class="meta">
          <span class="category-tag ${article.category || 'general'}">${article.category_label || article.category || 'General'}</span>
          <span>${formatDate(article.date)}</span>
          ${article.featured ? '<span class="featured-badge">★ Featured</span>' : ''}
          <span class="status-badge ${article.status || 'published'}">${article.status || 'Published'}</span>
          ${article.media && article.media.length > 0 ? `<span class="media-indicator">📎 ${article.media.length}</span>` : ''}
        </div>
      </div>
      <div class="actions">
        <button class="edit-btn" onclick="editArticle('${article.id}')">✎ Edit</button>
        <button class="delete-btn" onclick="confirmDelete('${article.id}')">✕</button>
      </div>
    </div>
  `).join('');
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
      a.excerpt.toLowerCase().includes(search) ||
      a.content.toLowerCase().includes(search)
    );
  }
  renderArticles(filtered);
}
searchInput.addEventListener('input', filterArticles);
categoryFilter.addEventListener('change', filterArticles);
statusFilter.addEventListener('change', filterArticles);

// ============================================================
// MEDIA MANAGEMENT
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
        const embedUrl = getYouTubeEmbedUrl(item.url);
        preview = `<img src="https://img.youtube.com/vi/${getYouTubeId(item.url)}/mqdefault.jpg" alt="Video thumbnail" />`;
      } else if (item.url.includes('vimeo.com')) {
        preview = `<div class="media-icon">🎬</div>`;
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
function getYouTubeEmbedUrl(url) {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : url;
}

// ============================================================
// FILE UPLOAD (to Supabase storage via server)
// ============================================================
function uploadFiles(files) {
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
      }
      uploadNext(index + 1);
    })
    .catch(err => {
      console.error('Upload error:', err);
      alert('Failed to upload: ' + file.name);
      uploadNext(index + 1);
    });
  };
  uploadNext(0);
}

function addVideoLink() {
  const url = prompt('Enter YouTube or Vimeo video URL:');
  if (!url) return;
  const trimmed = url.trim();
  if (!trimmed) return;
  if (!/(youtube\.com\/watch\?v=|youtu\.be\/|vimeo\.com\/)/.test(trimmed)) {
    alert('Please enter a valid YouTube or Vimeo URL.');
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
addVideoBtn.addEventListener('click', addVideoLink);

fileInput.addEventListener('change', function() {
  const files = this.files;
  if (files.length === 0) return;
  const validFiles = Array.from(files).filter(f => {
    if (this.accept.includes('image')) return f.type.startsWith('image/');
    return true;
  });
  if (validFiles.length === 0) {
    alert('No valid files selected.');
    return;
  }
  uploadFiles(validFiles);
  this.value = '';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); closeDeleteModal(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 's' && modal.style.display !== 'none') {
    e.preventDefault();
    articleForm.dispatchEvent(new Event('submit'));
  }
});

// ============================================================
// INIT
// ============================================================
checkAuth();