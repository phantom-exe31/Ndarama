// ============================================================
// server.js — Supabase Backend for Ndarama Blog
// Location: /supabase/server.js
// ============================================================

require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// CREATE EXPRESS APP
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;

console.log('🔧 Starting server...');

// ============================================================
// SUPABASE CLIENTS
// ============================================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📡 SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('🔑 SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
console.log('🔐 SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '⚠️ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// ============================================================
// ADMIN SETUP & FORCE RESET
// ============================================================
(async function setupAdmin() {
  if (!supabaseAdmin) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not set – admin auto-setup disabled.');
    return;
  }

  try {
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    // Check if admin exists
    const { data: existing, error: findError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', 'admin')
      .maybeSingle();

    if (findError) {
      console.warn('⚠️ Error checking admin:', findError.message);
    }

    if (!existing) {
      // Create admin
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert([{
          id: uuidv4(),
          username: 'admin',
          password_hash: hash,
          role: 'admin',
          created_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error('❌ Failed to create admin:', insertError.message);
      } else {
        console.log(`✅ Admin created (username: admin, password: ${password})`);
      }
    } else {
      // ✅ FORCE RESET: Always update the password to match .env
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ password_hash: hash })
        .eq('username', 'admin');

      if (updateError) {
        console.error('❌ Failed to reset password:', updateError.message);
      } else {
        console.log(`✅ Admin password reset to: ${password}`);
      }
    }
  } catch (err) {
    console.error('❌ Admin setup error:', err.message);
  }
})();

// ============================================================
// MIDDLEWARE
// ============================================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, '..')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================
// CHATBOT (Hugging Face) — same behavior as the old standalone
// server.js, now merged in here so one server handles everything.
// ============================================================
const HF_API_KEY = process.env.HF_API_KEY;
const HF_MODEL = process.env.HF_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';

const CHAT_SYSTEM_PROMPT = `You are the friendly virtual assistant for Ndarama High School, a government day school in Masvingo, Zimbabwe (motto: "Spring of Knowledge and Power").

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
        error: 'The server has no HF_API_KEY set. Add it to supabase/.env (see supabase/.env.example) and restart the server.'
      });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'No messages were provided.' });
    }

    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_API_KEY}`
      },
      body: JSON.stringify({
        model: HF_MODEL,
        max_tokens: 500,
        messages: [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...messages]
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

// ============================================================
// CONTACT FORM — saves to Supabase, then forwards to WhatsApp
// via the official WhatsApp Cloud API (Meta).
// ============================================================
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_RECIPIENT_NUMBER = process.env.WHATSAPP_RECIPIENT_NUMBER; // e.g. 263771234567 (no +)
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || 'contact_form_notification';
const WHATSAPP_TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'en_US';

async function sendWhatsAppNotification({ name, subject, email, message }) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_RECIPIENT_NUMBER) {
    console.warn('WhatsApp not configured — skipping forward (message is still saved in Supabase).');
    return false;
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: WHATSAPP_RECIPIENT_NUMBER,
      type: 'template',
      template: {
        name: WHATSAPP_TEMPLATE_NAME,
        language: { code: WHATSAPP_TEMPLATE_LANG },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: name },
            { type: 'text', text: subject || 'General Inquiry' },
            { type: 'text', text: email },
            { type: 'text', text: message.slice(0, 700) }
          ]
        }]
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('WhatsApp send error:', data);
    return false;
  }
  return true;
}

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const admin = getWriteClient();
    const id = uuidv4();

    const { error: dbError } = await admin.from('contact_messages').insert({
      id,
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : null,
      subject: subject || 'General Inquiry',
      message: message.trim()
    });

    if (dbError) throw dbError;

    let whatsappSent = false;
    try {
      whatsappSent = await sendWhatsAppNotification({ name, subject, email, message });
    } catch (waErr) {
      console.error('WhatsApp forward failed (message is still saved):', waErr);
    }

    if (whatsappSent) {
      await admin.from('contact_messages').update({ whatsapp_sent: true }).eq('id', id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/contact error:', err);
    res.status(500).json({ error: 'Something went wrong submitting your message. Please try again.' });
  }
});

// ============================================================
// JWT SECRET
// ============================================================
const JWT_SECRET = process.env.JWT_SECRET || 'ndarama-secret-key';

// ============================================================
// LOGIN – SIMPLE PLAIN TEXT PASSWORD
// ============================================================
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  console.log('🔍 Login attempt:', { username });

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  // Only allow 'admin' username
  if (username !== 'admin') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Compare password directly with environment variable
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (password !== adminPassword) {
    console.log('❌ Invalid password for:', username);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT token
  const token = jwt.sign(
    { id: 'admin', username: 'admin', role: 'admin' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('✅ Login successful:', username);

  res.json({
    token,
    user: {
      id: 'admin',
      username: 'admin',
      role: 'admin'
    }
  });
});

// ============================================================
// AUTH MIDDLEWARE
// ============================================================
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ============================================================
// HELPER
// ============================================================
function getWriteClient() {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for write operations. Add it to .env.');
  }
  return supabaseAdmin;
}

// ============================================================
// ADMIN ARTICLES ENDPOINT (bypasses RLS)
// ============================================================
app.get('/api/admin/articles', verifyToken, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Service role key not configured' });
    }

    const { data, error } = await supabaseAdmin
      .from('articles')
      .select(`
        *,
        media (*),
        article_tags ( tag:tags (*) )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const articles = data.map(a => ({
      ...a,
      featured: !!a.featured,
      tags: a.article_tags?.map(at => at.tag) || []
    }));

    res.json(articles);
  } catch (err) {
    console.error('GET /api/admin/articles error:', err);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// ============================================================
// PUBLIC ARTICLES ENDPOINT (public, status = published)
// ============================================================
app.get('/api/articles', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        media (*),
        article_tags ( tag:tags (*) )
      `)
      .eq('status', 'published')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const articles = data.map(a => ({
      ...a,
      featured: !!a.featured,
      tags: a.article_tags?.map(at => at.tag) || []
    }));

    res.json(articles);
  } catch (err) {
    console.error('GET /api/articles error:', err);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// ============================================================
// GET SINGLE ARTICLE (public)
// ============================================================
app.get('/api/articles/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        media (*),
        article_tags ( tag:tags (*) )
      `)
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Article not found' });
    }

    await supabase
      .from('articles')
      .update({ views: (data.views || 0) + 1 })
      .eq('id', req.params.id);

    data.featured = !!data.featured;
    data.tags = data.article_tags?.map(at => at.tag) || [];

    res.json(data);
  } catch (err) {
    console.error('GET /api/articles/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// ============================================================
// GET ARTICLES BY SLUG (public)
// ============================================================
app.get('/api/articles/slug/:slug', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        media (*),
        article_tags ( tag:tags (*) )
      `)
      .eq('slug', req.params.slug)
      .eq('status', 'published')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Article not found' });
    }

    data.featured = !!data.featured;
    data.tags = data.article_tags?.map(at => at.tag) || [];

    res.json(data);
  } catch (err) {
    console.error('GET /api/articles/slug/:slug error:', err);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// ============================================================
// GET FEATURED ARTICLES (public)
// ============================================================
app.get('/api/articles/featured', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select(`
        *,
        media (*)
      `)
      .eq('featured', true)
      .eq('status', 'published')
      .order('date', { ascending: false })
      .limit(6);

    if (error) throw error;

    const articles = data.map(a => ({ ...a, featured: !!a.featured }));
    res.json(articles);
  } catch (err) {
    console.error('GET /api/articles/featured error:', err);
    res.status(500).json({ error: 'Failed to fetch featured articles' });
  }
});

// ============================================================
// CREATE ARTICLE (protected)
// ============================================================
app.post('/api/articles', verifyToken, async (req, res) => {
  try {
    const admin = getWriteClient();

    const {
      title, excerpt, content, category, category_label,
      featured, date, author, status, slug, tags, media
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const slugValue = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');
    const id = uuidv4();

    const { data: existingSlug } = await admin
      .from('articles')
      .select('slug')
      .eq('slug', slugValue)
      .maybeSingle();

    const finalSlug = existingSlug ? slugValue + '-' + Date.now().toString().slice(-4) : slugValue;

    const { data: article, error: articleError } = await admin
      .from('articles')
      .insert([{
        id,
        title,
        slug: finalSlug,
        excerpt: excerpt || content.slice(0, 160),
        content,
        category: category || 'general',
        category_label: category_label || category || 'General',
        featured: featured || false,
        author: author || 'Ndarama High School',
        date: date || new Date().toISOString().split('T')[0],
        status: status || 'published'
      }])
      .select()
      .single();

    if (articleError) throw articleError;

    // Insert media
    if (media && media.length > 0) {
      const mediaData = media.map((m, i) => ({
        id: uuidv4(),
        article_id: id,
        type: m.type,
        url: m.url,
        thumbnail_url: m.thumbnail_url || null,
        filename: m.filename || null,
        original_name: m.original_name || null,
        mime_type: m.mime_type || null,
        size: m.size || null,
        alt_text: m.alt_text || null,
        caption: m.caption || null,
        is_featured: m.is_featured || false,
        position: i
      }));
      await admin.from('media').insert(mediaData);
    }

    // Insert tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');

        let { data: tag } = await admin
          .from('tags')
          .select('id')
          .eq('slug', tagSlug)
          .maybeSingle();

        if (!tag) {
          const { data: newTag } = await admin
            .from('tags')
            .insert([{ id: uuidv4(), name: tagName, slug: tagSlug }])
            .select()
            .single();
          tag = newTag;
        }

        await admin
          .from('article_tags')
          .insert([{ article_id: id, tag_id: tag.id }]);
      }
    }

    // Fetch full article using admin
    const { data: fullArticle, error: fetchError } = await admin
      .from('articles')
      .select(`
        *,
        media (*),
        article_tags ( tag:tags (*) )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !fullArticle) {
      return res.status(201).json({
        ...article,
        featured: !!article.featured,
        media: media || [],
        tags: tags || []
      });
    }

    fullArticle.featured = !!fullArticle.featured;
    fullArticle.tags = fullArticle.article_tags?.map(at => at.tag) || [];

    res.status(201).json(fullArticle);
  } catch (err) {
    console.error('POST /api/articles error:', err);
    res.status(500).json({ error: 'Failed to create article: ' + err.message });
  }
});

// ============================================================
// UPDATE ARTICLE (protected)
// ============================================================
app.put('/api/articles/:id', verifyToken, async (req, res) => {
  try {
    const admin = getWriteClient();

    const {
      title, excerpt, content, category, category_label,
      featured, date, author, status, slug, tags, media
    } = req.body;

    const { data: existing, error: existsError } = await admin
      .from('articles')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (existsError || !existing) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const updateData = {
      title: title || existing.title,
      excerpt: excerpt || existing.excerpt,
      content: content || existing.content,
      category: category || existing.category,
      category_label: category_label || existing.category_label,
      featured: featured !== undefined ? featured : existing.featured,
      author: author || existing.author,
      date: date || existing.date,
      status: status || existing.status
    };

    if (slug && slug !== existing.slug) {
      const { data: existingSlug } = await admin
        .from('articles')
        .select('slug')
        .eq('slug', slug)
        .neq('id', req.params.id)
        .maybeSingle();

      updateData.slug = existingSlug ? slug + '-' + Date.now().toString().slice(-4) : slug;
    }

    const { error: updateError } = await admin
      .from('articles')
      .update(updateData)
      .eq('id', req.params.id);

    if (updateError) throw updateError;

    // Update media
    if (media !== undefined) {
      await admin.from('media').delete().eq('article_id', req.params.id);

      if (media.length > 0) {
        const mediaData = media.map((m, i) => ({
          id: uuidv4(),
          article_id: req.params.id,
          type: m.type,
          url: m.url,
          thumbnail_url: m.thumbnail_url || null,
          filename: m.filename || null,
          original_name: m.original_name || null,
          mime_type: m.mime_type || null,
          size: m.size || null,
          alt_text: m.alt_text || null,
          caption: m.caption || null,
          is_featured: m.is_featured || false,
          position: i
        }));
        await admin.from('media').insert(mediaData);
      }
    }

    // Update tags
    if (tags !== undefined) {
      await admin.from('article_tags').delete().eq('article_id', req.params.id);

      for (const tagName of tags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-');

        let { data: tag } = await admin
          .from('tags')
          .select('id')
          .eq('slug', tagSlug)
          .maybeSingle();

        if (!tag) {
          const { data: newTag } = await admin
            .from('tags')
            .insert([{ id: uuidv4(), name: tagName, slug: tagSlug }])
            .select()
            .single();
          tag = newTag;
        }

        await admin
          .from('article_tags')
          .insert([{ article_id: req.params.id, tag_id: tag.id }]);
      }
    }

    // Fetch updated article
    const { data: fullArticle, error: fetchError } = await admin
      .from('articles')
      .select(`
        *,
        media (*),
        article_tags ( tag:tags (*) )
      `)
      .eq('id', req.params.id)
      .single();

    if (fetchError || !fullArticle) {
      return res.json({ ...updateData, id: req.params.id });
    }

    fullArticle.featured = !!fullArticle.featured;
    fullArticle.tags = fullArticle.article_tags?.map(at => at.tag) || [];

    res.json(fullArticle);
  } catch (err) {
    console.error('PUT /api/articles/:id error:', err);
    res.status(500).json({ error: 'Failed to update article: ' + err.message });
  }
});

// ============================================================
// DELETE ARTICLE (protected)
// ============================================================
app.delete('/api/articles/:id', verifyToken, async (req, res) => {
  try {
    const admin = getWriteClient();

    const { error } = await admin
      .from('articles')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/articles/:id error:', err);
    res.status(500).json({ error: 'Failed to delete article: ' + err.message });
  }
});

// ============================================================
// FILE UPLOAD
// ============================================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB — raised to fit video files
});

app.post('/api/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const admin = getWriteClient();

    const file = req.file;
    const ext = file.originalname.split('.').pop();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${ext}`;

    let folder = 'images';
    if (file.mimetype.startsWith('video/')) folder = 'videos';
    else if (!file.mimetype.startsWith('image/')) folder = 'files';

    const filePath = `${folder}/${filename}`;

    const { data, error } = await admin.storage
      .from('blog-uploads')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600'
      });

    if (error) throw error;

    const { data: { publicUrl } } = admin.storage
      .from('blog-uploads')
      .getPublicUrl(filePath);

    res.json({
      url: publicUrl,
      filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      type: folder === 'images' ? 'image' : folder === 'videos' ? 'video' : 'file'
    });
  } catch (err) {
    console.error('POST /api/upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// ============================================================
// GET CATEGORIES (public)
// ============================================================
app.get('/api/categories', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('category, category_label')
      .eq('status', 'published');

    if (error) throw error;

    const counts = {};
    data.forEach(a => {
      const key = a.category;
      if (!counts[key]) {
        counts[key] = { category: a.category, category_label: a.category_label, count: 0 };
      }
      counts[key].count++;
    });

    res.json(Object.values(counts).sort((a, b) => b.count - a.count));
  } catch (err) {
    console.error('GET /api/categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============================================================
// GET TAGS (public)
// ============================================================
app.get('/api/tags', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('*');

    if (error) throw error;

    const { data: counts } = await supabase
      .from('article_tags')
      .select('tag_id');

    const countMap = {};
    counts?.forEach(c => {
      countMap[c.tag_id] = (countMap[c.tag_id] || 0) + 1;
    });

    const result = data.map(tag => ({
      ...tag,
      count: countMap[tag.id] || 0
    }));

    res.json(result.sort((a, b) => b.count - a.count));
  } catch (err) {
    console.error('GET /api/tags error:', err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📝 Admin: http://localhost:${PORT}/admin/editor.html`);
  console.log(`📰 API: http://localhost:${PORT}/api/articles`);
  console.log(`🔑 Login: admin / ${process.env.ADMIN_PASSWORD || 'admin123'}`);
  console.log(`🧪 Health: http://localhost:${PORT}/api/health`);
  if (!HF_API_KEY) {
    console.warn('⚠️  HF_API_KEY is not set — the chatbot will not work until you add it to supabase/.env');
  }
});
