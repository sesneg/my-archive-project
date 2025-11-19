// Keys for localStorage
const STORE_KEY = 'my_personal_archive_v2';
const PIN_KEY = 'my_archive_pin_v2';
const PREF_KEY = 'my_archive_prefs_v2';

let archive = { title: 'Sports Car Archive', categories: [] };
let prefs = { theme: 'dark', anim: 'smooth', locked: false };
let activeCatId = null;

// Utils
const uid = (p = 'id') => p + '_' + Math.random().toString(36).substr(2, 9);
const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

function saveArchive() {
  localStorage.setItem(STORE_KEY, JSON.stringify(archive));
}

function savePrefs() {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}

function load() {
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) {
    try {
      archive = JSON.parse(raw);
    } catch (e) {
      console.error('Could not parse archive from storage', e);
    }
  } else {
    // default categories if first time
    archive.categories = [
      { id: uid('cat'), name: '🏎️ Super Cars', description: 'Hypercars and supercars collection', items: [] },
      { id: uid('cat'), name: '🚗 Sports Sedans', description: 'High-performance luxury sedans', items: [] },
      { id: uid('cat'), name: '🏁 Race Cars', description: 'Track monsters and racing legends', items: [] }
    ];
    saveArchive();
  }

  const pr = localStorage.getItem(PREF_KEY);
  if (pr) {
    try {
      prefs = JSON.parse(pr);
    } catch (e) {
      console.error('Could not parse prefs from storage', e);
    }
  }

  const pin = localStorage.getItem(PIN_KEY);
  if (pin) {
    prefs.locked = true;
  } else {
    prefs.locked = false;
  }

  applyPrefs();
}

function applyPrefs() {
  document.body.className = ''; // clear
  document.body.classList.add(prefs.theme);
}

// Rendering Categories
const categoryList = qs('#categoryList');
const emptyState = qs('#emptyState');
const categoryView = qs('#categoryView');
const categoryTitle = qs('#categoryTitle');
const categoryDesc = qs('#categoryDesc');
const itemsGrid = qs('#itemsGrid');

function renderCategories(filtered = null) {
  categoryList.innerHTML = '';
  const cats = filtered ?? archive.categories;

  cats.forEach(cat => {
    const tpl = qs('#categoryTemplate').content.cloneNode(true);
    tpl.querySelector('.cat-name').textContent = cat.name;
    tpl.querySelector('.cat-count').textContent = `${cat.items.length} item${cat.items.length !== 1 ? 's' : ''}`;
    tpl.querySelector('.openBtn').onclick = () => openCategory(cat.id);
    tpl.querySelector('.cat-card').onclick = (e) => {
      if (e.target.tagName.toLowerCase() !== 'button') {
        openCategory(cat.id);
      }
    };
    categoryList.appendChild(tpl);
  });
  showEmptyOrView();
}

function showEmptyOrView() {
  if (!archive.categories || archive.categories.length === 0) {
    emptyState.classList.remove('hidden');
    categoryView.classList.add('hidden');
  } else if (activeCatId === null) {
    emptyState.classList.remove('hidden');
    categoryView.classList.add('hidden');
  } else {
    emptyState.classList.add('hidden');
    categoryView.classList.remove('hidden');
  }
}

function openCategory(catId) {
  activeCatId = catId;
  const cat = archive.categories.find(c => c.id === catId);
  if (!cat) return;
  categoryTitle.textContent = cat.name;
  categoryDesc.textContent = cat.description || '';
  renderItems();
  showEmptyOrView();
}

// Rendering Items
function renderItems() {
  itemsGrid.innerHTML = '';
  const cat = archive.categories.find(c => c.id === activeCatId);
  if (!cat) return;

  let items = cat.items.slice();

  // filter by search
  const q = (qs('#itemSearch').value || '').trim().toLowerCase();
  if (q) {
    items = items.filter(it => {
      const hay = (it.title + ' ' + (it.desc || '') + ' ' + (it.tags || []).join(' ')).toLowerCase();
      return hay.includes(q);
    });
  }

  // filter favorites
  if (qs('#filterSelect').value === 'favorites') {
    items = items.filter(it => it.favorite);
  }

  items.forEach(it => {
    const tpl = qs('#itemCardTpl').content.cloneNode(true);

    const imgEl = tpl.querySelector('.item-image');
    if (it.image) {
      imgEl.src = it.image;
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
    }

    tpl.querySelector('.item-title').textContent = it.title;
    tpl.querySelector('.item-desc').textContent = it.desc || '';

    const link = tpl.querySelector('.item-link');
    if (it.url) {
      link.href = it.url;
      link.style.display = 'block';
    } else {
      link.style.display = 'none';
    }

    const tagsEl = tpl.querySelector('.tags');
    (it.tags || []).forEach(t => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.textContent = t;
      tagsEl.appendChild(span);
    });

    const favBtn = tpl.querySelector('.favBtn');
    favBtn.textContent = it.favorite ? '❤️' : '🤍';
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      it.favorite = !it.favorite;
      saveArchive();
      renderItems();
      renderCategories();
    });

    tpl.querySelector('.editBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      openItemModal('edit', it);
    });

    tpl.querySelector('.delBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this item?')) {
        cat.items = cat.items.filter(x => x.id !== it.id);
        saveArchive();
        renderItems();
        renderCategories();
      }
    });

    tpl.querySelector('.item-card').addEventListener('click', () => {
      // maybe open detail view later
    });

    itemsGrid.appendChild(tpl);
  });
}

// Prompt category details
function askCategoryDetails(existing) {
  const name = prompt('Category name:', existing ? existing.name : '');
  if (!name) return null;
  const desc = prompt('Short description (optional):', existing ? existing.description : '') || '';
  return { name, description: desc };
}

// Ask item details via a modal (custom)
function askItemDetails(existing) {
  return new Promise(resolve => {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width:100%; height:100%;
      background: rgba(0,0,0,0.9); display:flex; justify-content:center;
      align-items:center; z-index:10000; backdrop-filter: blur(10px);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
      padding: 30px; border-radius: 20px; min-width: 450px; color: white;
      border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(20px);
    `;

    content.innerHTML = `
      <h3>${existing ? '✏️ Edit Item' : '➕ Add New Item'}</h3>
      <div style="display:flex; flex-direction:column; gap:15px; margin:20px 0;">
        <input type="text" id="itemTitle" placeholder="🏷️ Item title" value="${existing ? existing.title : ''}" />
        <textarea id="itemDesc" placeholder="📝 Description">${existing ? existing.desc : ''}</textarea>
        <input type="url" id="itemUrl" placeholder="🌐 URL" value="${existing ? existing.url : ''}" />
        <input type="text" id="itemTags" placeholder="🏷️ Tags (comma separated)" value="${existing ? (existing.tags || []).join(', ') : ''}" />
        <div class="image-upload">📸 Upload Image (optional)</div>
        <input type="file" id="imageInput" accept="image/*" />
        ${existing && existing.image ? `<img src="${existing.image}" style="max-width:150px;max-height:150px;border-radius:10px;border:2px solid rgba(255,255,255,0.3);" />` : ''}
      </div>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="saveItem">💾 Save</button>
        <button id="cancelItem">❌ Cancel</button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    const imageInput = content.querySelector('#imageInput');
    const imageUpload = content.querySelector('.image-upload');
    let imageData = existing ? existing.image : null;

    imageUpload.addEventListener('click', () => {
      imageInput.click();
    });

    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        imageData = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    content.querySelector('#saveItem').addEventListener('click', () => {
      const title = content.querySelector('#itemTitle').value.trim();
      if (!title) {
        alert('Item title is required');
        return;
      }
      const desc = content.querySelector('#itemDesc').value.trim();
      const url = content.querySelector('#itemUrl').value.trim();
      const tags = content.querySelector('#itemTags').value
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      resolve({
        title,
        desc,
        url,
        tags,
        image: imageData,
        id: existing ? existing.id : uid('it'),
        favorite: existing ? existing.favorite : false
      });

      document.body.removeChild(modal);
    });

    content.querySelector('#cancelItem').addEventListener('click', () => {
      resolve(null);
      document.body.removeChild(modal);
    });
  });
}

// Button handlers
qs('#newCategoryBtn').addEventListener('click', () => {
  const data = askCategoryDetails();
  if (!data) return;
  const cat = { id: uid('cat'), name: data.name, description: data.description, items: [] };
  archive.categories.push(cat);
  saveArchive();
  renderCategories();
  openCategory(cat.id);
});

qs('#createFirst').addEventListener('click', () => {
  qs('#newCategoryBtn').click();
});

qs('#addItemBtn').addEventListener('click', async () => {
  if (!activeCatId) return alert('Select a category first');
  const newItem = await askItemDetails(null);
  if (!newItem) return;
  const cat = archive.categories.find(c => c.id === activeCatId);
  cat.items.push(newItem);
  saveArchive();
  renderItems();
  renderCategories();
});

qs('#editCategoryBtn').addEventListener('click', () => {
  const cat = archive.categories.find(c => c.id === activeCatId);
  if (!cat) return;
  const data = askCategoryDetails(cat);
  if (!data) return;
  cat.name = data.name;
  cat.description = data.description;
  saveArchive();
  renderCategories();
  openCategory(cat.id);
});

qs('#deleteCategoryBtn').addEventListener('click', () => {
  if (!activeCatId) return;
  const cat = archive.categories.find(c => c.id === activeCatId);
  if (!cat) return;
  if (confirm(`Delete category "${cat.name}"?`)) {
    archive.categories = archive.categories.filter(c => c.id !== activeCatId);
    activeCatId = null;
    saveArchive();
    renderCategories();
    showEmptyOrView();
  }
});

// Search categories globally
qs('#globalSearch').addEventListener('input', (e) => {
  const q = (e.target.value || '').trim().toLowerCase();
  if (!q) {
    renderCategories();
    return;
  }
  const matches = archive.categories.filter(cat => {
    if (cat.name.toLowerCase().includes(q) || (cat.description || '').toLowerCase().includes(q)) {
      return true;
    }
    return cat.items.some(it => {
      const hay = (it.title + ' ' + (it.desc || '') + ' ' + (it.tags || []).join(' ')).toLowerCase();
      return hay.includes(q);
    });
  });
  renderCategories(matches);
});

// Filter items when search or filter changes
qs('#itemSearch').addEventListener('input', () => renderItems());
qs('#filterSelect').addEventListener('change', () => renderItems());

// Settings modal
const settingsBtn = qs('#settingsBtn');
const settingsModal = qs('#settingsModal');
const closeSettings = qs('#closeSettings');
const themeSelect = qs('#themeSelect');
const animSelect = qs('#animSelect');
const changePinBtn = qs('#changePinBtn');
const exportAll = qs('#exportAll');
const importAll = qs('#importAll');

settingsBtn.addEventListener('click', () => {
  settingsModal.classList.remove('hidden');
  themeSelect.value = prefs.theme;
  animSelect.value = prefs.anim;
});

closeSettings.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

themeSelect.addEventListener('change', () => {
  prefs.theme = themeSelect.value;
  applyPrefs();
  savePrefs();
});

animSelect.addEventListener('change', () => {
  prefs.anim = animSelect.value;
  savePrefs();
});

changePinBtn.addEventListener('click', () => {
  const newPin = prompt('Enter new PIN (will overwrite existing):');
  if (newPin !== null) {
    localStorage.setItem(PIN_KEY, newPin);
    prefs.locked = true;
    savePrefs();
    alert('PIN changed!');
  }
});

exportAll.addEventListener('click', () => {
  const data = JSON.stringify(archive, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'archive.json';
  a.click();
  URL.revokeObjectURL(url);
});

importAll.addEventListener('click', () => {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json';
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const obj = JSON.parse(e.target.result);
        archive = obj;
        saveArchive();
        renderCategories();
        if (archive.categories.length > 0) {
          openCategory(archive.categories[0].id);
        }
        settingsModal.classList.add('hidden');
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };
  fileInput.click();
});

// Lock / PIN logic
const lockOverlay = qs('#lockOverlay');
const pinInput = qs('#pinInput');
const unlockBtn = qs('#unlockBtn');
const setPinBtn = qs('#setPinBtn');

unlockBtn.addEventListener('click', () => {
  const pin = localStorage.getItem(PIN_KEY);
  const val = pinInput.value.trim();
  if (pin && val === pin) {
    lockOverlay.classList.add('hidden');
  } else {
    alert('Wrong PIN');
  }
});

setPinBtn.addEventListener('click', () => {
  const newPin = prompt('Set a new PIN:');
  if (newPin) {
    localStorage.setItem(PIN_KEY, newPin);
    prefs.locked = true;
    savePrefs();
    alert('PIN saved!');
    lockOverlay.classList.add('hidden');
  }
});

// Initialization
load();
renderCategories();
if (archive.categories.length > 0) {
  openCategory(archive.categories[0].id);
}
