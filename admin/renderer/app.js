let entries = [];
let editingId = null;
let searchQuery = '';

const $ = id => document.getElementById(id);
const entryList = $('entryList');
const emptyState = $('emptyState');
const form = $('form');
const formTitle = $('formTitle');
const formBadge = $('formBadge');
const addBtn = $('addBtn');
const saveBtn = $('saveBtn');
const saveBtnText = $('saveBtnText');
const deleteBtn = $('deleteBtn');
const cancelBtn = $('cancelBtn');
const pushBtn = $('pushBtn');
const pushStatus = $('pushStatus');
const commitMsg = $('commitMsg');
const searchInput = $('searchInput');
const entryCount = $('entryCount');
const toast = $('toast');

const title = $('title');
const description = $('description');
const category = $('category');
const videoUrl = $('videoUrl');
const thumbnailPreview = $('thumbnailPreview');
const thumbnailImg = $('thumbnailImg');

let dragSrcId = null;

// --- Utils ---
function getYoutubeId(url) {
  if (!url) return '';
  const m = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
}

function toEmbedUrl(url) {
  const id = getYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : url;
}

const catLabels = {
  gameplay: 'Gaming Edit',
  video: 'Cinematic Video',
  'color-grading': 'Color Grading',
  'motion-graphics': 'Social Media',
};

const catIcons = {
  gameplay: 'gamepad',
  video: 'film',
  'color-grading': 'palette',
  'motion-graphics': 'magic',
};

function showToast(msg, type = 'info') {
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.className = 'toast'; }, 2500);
}

async function autoPush(action) {
  const msg = commitMsg.value.trim() || `update portfolio (${action})`;
  pushStatus.textContent = 'Syncing...';
  pushStatus.className = 'push-status';
  const res = await window.api.gitPush(msg);
  if (res.success) {
    pushStatus.textContent = 'Synced to ' + res.remotes.join(', ');
    pushStatus.className = 'push-status success';
  } else {
    pushStatus.textContent = res.error;
    pushStatus.className = 'push-status error';
    setTimeout(() => { pushStatus.textContent = ''; pushStatus.className = 'push-status'; }, 4000);
  }
}

// --- Render ---
function filteredEntries() {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return entries;
  return entries.filter(e =>
    e.title.toLowerCase().includes(q) ||
    e.description.toLowerCase().includes(q) ||
    catLabels[e.category]?.toLowerCase().includes(q)
  );
}

function renderSidebar() {
  const list = filteredEntries();
  entryCount.textContent = entries.length;

  if (list.length === 0) {
    entryList.innerHTML = `<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px;">${
      searchQuery ? 'No matching entries' : 'No entries yet'
    }</div>`;
    return;
  }

  entryList.innerHTML = list.map((e, i) => `
    <div class="entry-item${editingId === e.id ? ' active' : ''}"
         draggable="true"
         data-id="${e.id}"
         data-idx="${i}">
      <h4>${e.title}</h4>
      <div class="entry-meta">
        <span class="entry-cat">${catLabels[e.category] || e.category}</span>
        <span class="entry-idx">#${e.id}</span>
      </div>
    </div>
  `).join('');

  // Click
  entryList.querySelectorAll('.entry-item').forEach(el => {
    el.addEventListener('click', () => editEntry(parseInt(el.dataset.id)));
  });

  // Drag reorder
  entryList.querySelectorAll('.entry-item').forEach(el => {
    el.addEventListener('dragstart', e => {
      dragSrcId = parseInt(el.dataset.id);
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => el.classList.remove('dragging'));

    el.addEventListener('dragover', e => {
      e.preventDefault();
      el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));

    el.addEventListener('drop', async e => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const targetId = parseInt(el.dataset.id);
      if (dragSrcId === targetId) return;

      const fromIdx = entries.findIndex(x => x.id === dragSrcId);
      const toIdx = entries.findIndex(x => x.id === targetId);
      const [moved] = entries.splice(fromIdx, 1);
      entries.splice(toIdx, 0, moved);

      const res = await window.api.savePortfolio(entries);
      if (res.success) {
        renderSidebar();
        showToast('Reordered', 'success');
        autoPush('reorder');
      }
      dragSrcId = null;
    });
  });
}

function categoryLabel(cat) { return catLabels[cat] || cat; }

function resetForm() {
  editingId = null;
  form.reset();
  thumbnailPreview.style.display = 'none';
  form.style.display = 'none';
  emptyState.style.display = 'flex';
  saveBtnText.textContent = 'Create Entry';
  deleteBtn.style.display = 'none';
  renderSidebar();
}

function editEntry(id) {
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  editingId = id;
  title.value = entry.title;
  description.value = entry.description;
  category.value = entry.category;
  videoUrl.value = entry.videoUrl;
  updateThumbnail(entry.videoUrl);
  form.style.display = 'flex';
  emptyState.style.display = 'none';
  formTitle.textContent = 'Edit Entry';
  formBadge.textContent = `#${id}`;
  saveBtnText.textContent = 'Save Changes';
  deleteBtn.style.display = 'inline-flex';
  renderSidebar();
}

function updateThumbnail(url) {
  const vid = getYoutubeId(url);
  if (vid) {
    thumbnailImg.src = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
    thumbnailPreview.style.display = 'block';
  } else {
    thumbnailPreview.style.display = 'none';
  }
}

// --- Events ---
videoUrl.addEventListener('input', () => updateThumbnail(videoUrl.value));

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  renderSidebar();
});

addBtn.addEventListener('click', () => {
  editingId = null;
  form.reset();
  thumbnailPreview.style.display = 'none';
  form.style.display = 'flex';
  emptyState.style.display = 'none';
  formTitle.textContent = 'New Entry';
  formBadge.textContent = '';
  saveBtnText.textContent = 'Create Entry';
  deleteBtn.style.display = 'none';
  title.focus();
  renderSidebar();
});

cancelBtn.addEventListener('click', resetForm);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    title: title.value.trim(),
    description: description.value.trim(),
    category: category.value,
    videoUrl: toEmbedUrl(videoUrl.value.trim()),
    icon: 'fa-' + (catIcons[category.value] || 'play-circle'),
    thumbnail: '',
  };

  if (editingId) {
    const idx = entries.findIndex(e => e.id === editingId);
    entries[idx] = { ...entries[idx], ...data };
  } else {
    const maxId = entries.reduce((m, e) => Math.max(m, e.id), 0);
    entries.push({ id: maxId + 1, ...data });
  }

  const res = await window.api.savePortfolio(entries);
  if (res.success) {
    showToast('Saved', 'success');
    resetForm();
    autoPush('save');
  } else {
    showToast('Save failed: ' + res.error, 'error');
  }
});

deleteBtn.addEventListener('click', async () => {
  if (editingId === null) return;
  const r = await window.api.confirm({
    type: 'warning',
    buttons: ['Cancel', 'Delete'],
    defaultId: 0,
    title: 'Delete Entry',
    message: `Delete "${entries.find(e => e.id === editingId)?.title}"?`,
    detail: 'This cannot be undone.',
  });
  if (r !== 1) return;

  entries = entries.filter(e => e.id !== editingId);
  const res = await window.api.savePortfolio(entries);
  if (res.success) {
    showToast('Deleted', 'success');
    resetForm();
    autoPush('delete');
  } else {
    showToast('Delete failed: ' + res.error, 'error');
  }
});

pushBtn.addEventListener('click', () => autoPush('manual'));

// --- Menu shortcuts from main process ---
window.api.onMenuNew(() => addBtn.click());
window.api.onMenuSave(() => {
  if (form.style.display !== 'none') form.requestSubmit();
});
window.api.onMenuPush(() => pushBtn.click());

// --- Keyboard shortcuts ---
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') resetForm();
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') pushBtn.click();
});

// --- Init ---
async function init() {
  const res = await window.api.loadPortfolio();
  if (res.success) {
    entries = res.data;
    renderSidebar();
  } else {
    showToast('Failed to load portfolio: ' + res.error, 'error');
  }
}

init();
