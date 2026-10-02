// ===== Constants & Storage Keys =====
const STORAGE_KEY_ITEMS = 'shelflife_items_v2';
const STORAGE_KEY_CATEGORIES = 'shelflife_categories_v2';
const STORAGE_KEY_ARCHIVE = 'shelflife_archive_v2';
const STORAGE_KEY_BACKUPS = 'shelflife_backups_v2';
const STORAGE_KEY_META = 'shelflife_meta_v2';
const SCHEMA_VERSION = 2;

const defaultCategories = {
  "Skincare / 護膚": ["Sunscreen / 防曬", "Serum / 精華", "Cleanser / 潔面", "Moisturizer / 面霜"],
  "Laundry / 洗衣": ["Detergent / 洗衣液", "Softener / 柔順劑"]
};

let items = [];
let categoriesData = {};
let archived = [];
let activeTab = 'ALL';
let activeLocationFilter = 'ALL';
let editItemId = null;
let editBatchId = null;

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
  initCategories();
  renderCategoryManager();
  renderItems();
  updateDashboard();
  updateDatalists();
  updateNotifyButton();
  checkAutoBackup();
  checkAndNotify(false);

  document.getElementById('item-form').addEventListener('submit', handleFormSubmit);
});

// ===== Data Load / Save =====
function loadAllData() {
  try {
    items = JSON.parse(localStorage.getItem(STORAGE_KEY_ITEMS)) || [];
    categoriesData = JSON.parse(localStorage.getItem(STORAGE_KEY_CATEGORIES)) || defaultCategories;
    archived = JSON.parse(localStorage.getItem(STORAGE_KEY_ARCHIVE)) || [];
  } catch (e) {
    console.error('Load error', e);
    items = [];
    categoriesData = defaultCategories;
    archived = [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
  updateDashboard();
  updateDatalists();
}

function saveCategories() {
  localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categoriesData));
}

function saveArchive() {
  localStorage.setItem(STORAGE_KEY_ARCHIVE, JSON.stringify(archived));
}

function saveMeta(meta) {
  localStorage.setItem(STORAGE_KEY_META, JSON.stringify(meta));
}

function getMeta() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_META)) || {};
  } catch {
    return {};
  }
}

// ===== Navigation =====
function showView(viewName, clickedBtn = null) {
  const views = ['home', 'add', 'browse', 'catalog', 'shopping', 'archive', 'settings'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = (v === viewName) ? 'block' : 'none';
  });

  const navTabs = document.querySelectorAll('.main-nav-bar .nav-tab');
  navTabs.forEach(tab => tab.classList.remove('active'));
  if (clickedBtn) {
    clickedBtn.classList.add('active');
  } else {
    const map = { home: 0, add: 1, browse: 2, catalog: 3, shopping: 4 };
    if (map[viewName] !== undefined && navTabs[map[viewName]]) {
      navTabs[map[viewName]].classList.add('active');
    }
  }

  if (viewName === 'browse') initBrowseView();
  if (viewName === 'catalog') renderItems();
  if (viewName === 'shopping') renderShoppingList();
  if (viewName === 'archive') renderArchive();
  if (viewName === 'settings') updateSettingsView();
}

function showCatalogWithFilter(filterType) {
  showView('catalog');
  const buttons = document.querySelectorAll('#view-catalog .tabs .tab-btn');
  buttons.forEach(btn => {
    const text = btn.innerText;
    if ((filterType === 'ALL' && text.includes('All')) ||
        (filterType === 'LOW_STOCK' && text.includes('Low')) ||
        (filterType === 'EXPIRING' && text.includes('Expiring')) ||
        (filterType === 'FINISHED' && text.includes('Finished'))) {
      setTab(filterType, btn);
    }
  });
}

// ===== Categories =====
function initCategories() {
  const catSelect = document.getElementById('category');
  const filterCatSelect = document.getElementById('filter-category');
  if (!catSelect || !filterCatSelect) return;

  catSelect.innerHTML = '<option value="">-- Select Category --</option>';
  filterCatSelect.innerHTML = '<option value="ALL">All Categories</option>';

  Object.keys(categoriesData).forEach(cat => {
    catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    filterCatSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
  });
  catSelect.innerHTML += `<option value="NEW">+ Add New Category...</option>`;
}

function onCategoryChange() {
  const catSelect = document.getElementById('category');
  const customCatInput = document.getElementById('custom-category');
  const subCatSelect = document.getElementById('sub-category');

  if (catSelect.value === 'NEW') {
    customCatInput.style.display = 'block';
    customCatInput.required = true;
    subCatSelect.innerHTML = '<option value="NEW">+ Add New Sub-category...</option>';
    onSubCategoryChange();
  } else {
    customCatInput.style.display = 'none';
    customCatInput.required = false;
    populateSubCategories(catSelect.value);
  }
}

function populateSubCategories(mainCat) {
  const subCatSelect = document.getElementById('sub-category');
  subCatSelect.innerHTML = '<option value="">-- Select Sub-category --</option>';
  if (categoriesData[mainCat]) {
    categoriesData[mainCat].forEach(sub => {
      subCatSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
  }
  subCatSelect.innerHTML += `<option value="NEW">+ Add New Sub-category...</option>`;
}

function onSubCategoryChange() {
  const subCatSelect = document.getElementById('sub-category');
  const customSubCatInput = document.getElementById('custom-sub-category');
  customSubCatInput.style.display = subCatSelect.value === 'NEW' ? 'block' : 'none';
}

function renderCategoryManager() {
  const container = document.getElementById('categories-list');
  if (!container) return;
  let html = '';
  Object.keys(categoriesData).forEach(cat => {
    const subPills = (categoriesData[cat] || []).map(s => `<span class="sub-cat-pill">${s}</span>`).join(' ');
    html += `
      <div class="category-group">
        <div class="category-item">
          <div>
            <strong>${cat}</strong>
            <div class="sub-category-pills">${subPills}</div>
          </div>
          <div class="category-actions">
            <button class="btn-delete-cat" onclick="deleteCategory('${cat.replace(/'/g, "\\'")}')">Delete</button>
          </div>
        </div>
      </div>`;
  });
  container.innerHTML = html || '<p class="empty-msg">No custom categories.</p>';
}

function deleteCategory(catName) {
  if (!confirm(`Delete category "${catName}"?`)) return;
  delete categoriesData[catName];
  saveCategories();
  initCategories();
  renderCategoryManager();
}

// ===== Form Handling =====
function handleFormSubmit(e) {
  e.preventDefault();

  let category = document.getElementById('category').value;
  let subCategory = document.getElementById('sub-category').value;

  if (category === 'NEW') {
    category = document.getElementById('custom-category').value.trim();
    if (!category) return alert('Please enter a category name');
  }
  if (subCategory === 'NEW') {
    subCategory = document.getElementById('custom-sub-category').value.trim();
  }

  if (category && subCategory) {
    if (!categoriesData[category]) categoriesData[category] = [];
    if (subCategory && !categoriesData[category].includes(subCategory)) {
      categoriesData[category].push(subCategory);
    }
    saveCategories();
    initCategories();
    renderCategoryManager();
  }

  const name = document.getElementById('name').value.trim();
  const brand = document.getElementById('brand').value.trim();
  const size = document.getElementById('size').value.trim();
  const lowThreshold = parseInt(document.getElementById('low-threshold').value) || 1;

  const batchData = {
    id: editBatchId || Date.now().toString() + Math.random().toString(36).slice(2, 6),
    batchCode: document.getElementById('batch-code').value.trim(),
    quantity: parseInt(document.getElementById('quantity').value) || 0,
    price: parseFloat(document.getElementById('price').value) || 0,
    status: document.getElementById('status').value,
    purchaseDate: document.getElementById('purchase-date').value,
    openedDate: document.getElementById('opened-date').value,
    expiryDate: document.getElementById('expiry-date').value,
    pao: document.getElementById('pao').value,
    location: document.getElementById('location').value.trim(),
    worth: document.getElementById('worth').value,
    worthRemark: document.getElementById('worth-remark').value.trim()
  };

  // Compute Use-by if possible
  batchData.useByDate = computeUseBy(batchData.openedDate, batchData.pao);

  let product = items.find(i => i.id === editItemId ||
    (i.name.toLowerCase() === name.toLowerCase() && (i.brand || '').toLowerCase() === brand.toLowerCase()));

  if (product) {
    product.name = name;
    product.brand = brand;
    product.size = size;
    product.category = category;
    product.subCategory = subCategory;
    product.lowThreshold = lowThreshold;

    if (editBatchId) {
      const bIdx = product.batches.findIndex(b => b.id === editBatchId);
      if (bIdx !== -1) product.batches[bIdx] = batchData;
    } else {
      product.batches.push(batchData);
    }
  } else {
    product = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      name, brand, size, category, subCategory, lowThreshold,
      batches: [batchData]
    };
    items.push(product);
  }

  saveItems();
  resetForm();
  showView('catalog');
  showToast('Saved successfully');
}

function computeUseBy(openedDate, paoMonths) {
  if (!openedDate || !paoMonths) return null;
  const d = new Date(openedDate);
  d.setMonth(d.getMonth() + parseInt(paoMonths));
  return d.toISOString().slice(0, 10);
}

function resetForm() {
  document.getElementById('item-form').reset();
  editItemId = null;
  editBatchId = null;
  document.getElementById('form-heading').innerText = "Add Product Batch / 新增產品批號";
  document.getElementById('submit-btn').innerText = "Add Batch / 新增批號";
  document.getElementById('cancel-btn').style.display = "none";
  document.getElementById('custom-category').style.display = "none";
  document.getElementById('custom-sub-category').style.display = "none";
}

// ===== Dashboard & Insights =====
function updateDashboard() {
  let totalActive = 0;
  let lowStockCount = 0;
  let expiringSoonCount = 0;
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);

  items.forEach(product => {
    const activeBatches = product.batches.filter(b => b.status !== 'Finished');
    const productActiveQty = activeBatches.reduce((acc, b) => acc + (b.quantity || 0), 0);
    totalActive += productActiveQty;

    if (productActiveQty <= (product.lowThreshold || 1) && activeBatches.length > 0) {
      lowStockCount++;
    }

    product.batches.forEach(b => {
      if (b.status === 'Finished') return;
      const exp = getEffectiveExpiry(b);
      if (exp && new Date(exp) <= thirtyDaysLater) {
        expiringSoonCount++;
      }
    });
  });

  document.getElementById('dash-total').innerText = totalActive;
  document.getElementById('dash-low').innerText = lowStockCount;
  document.getElementById('dash-expiring').innerText = expiringSoonCount;
  document.getElementById('dash-finished').innerText = archived.length;

  // Simple insight
  const insightBox = document.getElementById('insight-box');
  const insightText = document.getElementById('insight-text');
  if (archived.length > 0) {
    const avgDays = calculateAverageUsageDays();
    if (avgDays) {
      insightBox.style.display = 'block';
      insightText.innerText = `Average product life (from finished items): ~${avgDays} days`;
    }
  } else {
    insightBox.style.display = 'none';
  }
}

function getEffectiveExpiry(batch) {
  if (batch.expiryDate) return batch.expiryDate;
  if (batch.useByDate) return batch.useByDate;
  if (batch.openedDate && batch.pao) {
    return computeUseBy(batch.openedDate, batch.pao);
  }
  return null;
}

function calculateAverageUsageDays() {
  let totalDays = 0;
  let count = 0;
  archived.forEach(p => {
    p.batches.forEach(b => {
      if (b.purchaseDate && b.status === 'Finished') {
        const start = new Date(b.purchaseDate);
        const end = b.openedDate ? new Date(b.openedDate) : new Date();
        const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
        if (days > 0 && days < 2000) {
          totalDays += days;
          count++;
        }
      }
    });
  });
  return count > 0 ? Math.round(totalDays / count) : null;
}

// ===== One-tap Quantity & Status =====
function changeQuantity(productId, batchId, delta) {
  const product = items.find(p => p.id === productId);
  if (!product) return;
  const batch = product.batches.find(b => b.id === batchId);
  if (!batch) return;

  batch.quantity = Math.max(0, (batch.quantity || 0) + delta);
  if (batch.quantity === 0 && batch.status !== 'Finished') {
    batch.status = 'Finished';
  }
  saveItems();
  renderItems();
  showToast(`Quantity → ${batch.quantity}`);
}

function quickStatus(productId, batchId, newStatus) {
  const product = items.find(p => p.id === productId);
  if (!product) return;
  const batch = product.batches.find(b => b.id === batchId);
  if (!batch) return;

  batch.status = newStatus;
  if (newStatus === 'Finished' && batch.quantity > 0) {
    // optional: keep quantity or set to 0
  }
  saveItems();
  renderItems();
  showToast(`Status → ${newStatus}`);
}

// ===== Render Catalog =====
function setTab(tab, btn) {
  activeTab = tab;
  document.querySelectorAll('#view-catalog .tabs .tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderItems();
}

function onFilterCategoryChange() {
  const cat = document.getElementById('filter-category').value;
  const subSelect = document.getElementById('filter-sub-category');
  subSelect.innerHTML = '<option value="ALL">All Sub-categories</option>';
  if (cat !== 'ALL' && categoriesData[cat]) {
    categoriesData[cat].forEach(sub => {
      subSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
    });
  }
  renderItems();
}

function renderLocationChips() {
  const chipContainer = document.getElementById('location-chips');
  if (!chipContainer) return;

  const locations = new Set();
  items.forEach(p => p.batches.forEach(b => { if (b.location) locations.add(b.location); }));

  let html = `<button type="button" class="tab-btn ${activeLocationFilter === 'ALL' ? 'active' : ''}" onclick="setLocationFilter('ALL')">All</button>`;
  Array.from(locations).forEach(loc => {
    const isActive = activeLocationFilter === loc ? 'active' : '';
    html += `<button type="button" class="tab-btn ${isActive}" onclick="setLocationFilter('${loc.replace(/'/g, "\\'")}')">📍 ${loc}</button>`;
  });
  chipContainer.innerHTML = html;
}

function setLocationFilter(loc) {
  activeLocationFilter = loc;
  renderItems();
}

function renderItems() {
  renderLocationChips();
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();
  const filterCat = document.getElementById('filter-category')?.value || 'ALL';
  const filterSub = document.getElementById('filter-sub-category')?.value || 'ALL';
  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);

  const filtered = items.filter(product => {
    if (filterCat !== 'ALL' && product.category !== filterCat) return false;
    if (filterSub !== 'ALL' && product.subCategory !== filterSub) return false;

    const searchable = `${product.name} ${product.brand || ''} ${product.size || ''} ${product.category} ${product.subCategory || ''} ${product.batches.map(b => `${b.batchCode || ''} ${b.location || ''} ${b.worthRemark || ''}`).join(' ')}`.toLowerCase();
    if (search && !searchable.includes(search)) return false;

    if (activeLocationFilter !== 'ALL') {
      if (!product.batches.some(b => b.location === activeLocationFilter)) return false;
    }

    const activeBatches = product.batches.filter(b => b.status !== 'Finished');
    const totalActiveQty = activeBatches.reduce((acc, b) => acc + (b.quantity || 0), 0);

    if (activeTab === 'LOW_STOCK') {
      return totalActiveQty <= (product.lowThreshold || 1) && activeBatches.length > 0;
    }
    if (activeTab === 'EXPIRING') {
      return product.batches.some(b => {
        if (b.status === 'Finished') return false;
        const exp = getEffectiveExpiry(b);
        return exp && new Date(exp) <= thirtyDaysLater;
      });
    }
    if (activeTab === 'FINISHED') {
      return product.batches.some(b => b.status === 'Finished');
    }
    return true;
  });

  const listContainer = document.getElementById('items-list');
  if (listContainer) {
    listContainer.innerHTML = renderProductListHTML(filtered);
  }
}

function renderProductListHTML(productList) {
  if (productList.length === 0) {
    return '<p class="empty-msg">No products matching your criteria.</p>';
  }

  return productList.map(product => {
    const activeBatches = product.batches.filter(b => b.status !== 'Finished');
    const totalQty = activeBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
    const isLowStock = totalQty <= (product.lowThreshold || 1) && activeBatches.length > 0;
    const sizeDisplay = product.size ? ` • <strong>${product.size}</strong>` : '';

    const batchesHTML = product.batches.map(batch => {
      let statusClass = 'status-in-stock';
      if (batch.status === 'Using') statusClass = 'status-using';
      if (batch.status === 'Finished') statusClass = 'status-finished';

      let worthClass = 'worth-maybe';
      if (batch.worth === 'Yes') worthClass = 'worth-yes';
      if (batch.worth === 'No') worthClass = 'worth-no';

      const effectiveExp = getEffectiveExpiry(batch);
      const isExpiringSoon = effectiveExp && (new Date(effectiveExp) - new Date()) < 30 * 24 * 60 * 60 * 1000;

      return `
        <div class="batch-row ${isExpiringSoon ? 'batch-expiring' : ''}">
          <div class="batch-main-info">
            <div class="batch-pills">
              <span class="status-badge ${statusClass}">${batch.status}</span>
              <span class="qty-pill">Qty: <strong>${batch.quantity}</strong></span>
              ${batch.price ? `<span class="qty-pill">💰 ${batch.price}</span>` : ''}
              ${batch.batchCode ? `<span class="batch-pill">Lot: ${batch.batchCode}</span>` : ''}
              ${batch.location ? `<span class="batch-pill muted">📍 ${batch.location}</span>` : ''}
            </div>
            <div class="batch-dates">
              ${batch.purchaseDate ? `<span>Bought: ${batch.purchaseDate}</span>` : ''}
              ${batch.openedDate ? `<span>Opened: ${batch.openedDate}</span>` : ''}
              ${effectiveExp ? `<span class="${isExpiringSoon ? 'exp-warn' : ''}">Use by: <strong>${effectiveExp}</strong></span>` : ''}
              ${batch.pao ? `<span>PAO: ${batch.pao}M</span>` : ''}
            </div>
            ${batch.worth ? `
              <div class="worth-tag ${worthClass}">
                Repurchase: <strong>${batch.worth}</strong> ${batch.worthRemark ? `(${batch.worthRemark})` : ''}
              </div>` : ''}
          </div>

          <div class="quick-actions">
            <button class="btn-qty" onclick="changeQuantity('${product.id}', '${batch.id}', -1)">−</button>
            <button class="btn-qty" onclick="changeQuantity('${product.id}', '${batch.id}', 1)">+</button>
            <button class="btn-status" onclick="quickStatus('${product.id}', '${batch.id}', 'Using')">Using</button>
            <button class="btn-status" onclick="quickStatus('${product.id}', '${batch.id}', 'Finished')">Finish</button>
          </div>

          <div class="batch-actions">
            ${batch.batchCode ? `<button class="btn-search-batch" onclick="searchBatchOnline('${batch.batchCode}', '${(product.brand || '').replace(/'/g, "\\'")}')">🔍 Check</button>` : ''}
            <button class="btn-edit" onclick="editBatch('${product.id}', '${batch.id}')">Edit</button>
            <button class="btn-delete" onclick="deleteBatch('${product.id}', '${batch.id}')">Delete</button>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="product-card ${isLowStock ? 'card-low-stock' : ''}">
        <div class="product-header">
          <div>
            <h3>${product.name}</h3>
            <div class="product-sub">
              ${product.brand ? `<strong>${product.brand}</strong>` : ''}
              ${sizeDisplay}
              <span style="margin-left:4px;color:var(--text-muted);">
                [${product.category}${product.subCategory ? ' / ' + product.subCategory : ''}]
              </span>
            </div>
          </div>
          <div class="product-header-right">
            <span class="total-qty-badge" style="background:${isLowStock ? '#ffe8e8' : '#e6f9ed'};color:${isLowStock ? '#d90429' : '#1e7e34'}">
              Total: ${totalQty}
            </span>
            <button class="btn-quick-add" onclick="quickAddBatch('${product.id}')">➕ Batch</button>
          </div>
        </div>
        <div class="batch-list">${batchesHTML}</div>
      </div>`;
  }).join('');
}

// ===== Quick Add / Edit / Delete =====
function quickAddBatch(productId) {
  const product = items.find(p => p.id === productId);
  if (!product) return;
  resetForm();
  editItemId = productId;
  editBatchId = null;
  document.getElementById('name').value = product.name;
  document.getElementById('brand').value = product.brand || '';
  document.getElementById('size').value = product.size || '';
  document.getElementById('category').value = product.category;
  onCategoryChange();
  document.getElementById('sub-category').value = product.subCategory || '';
  document.getElementById('low-threshold').value = product.lowThreshold || 1;
  document.getElementById('form-heading').innerText = `Add New Batch for "${product.name}"`;
  document.getElementById('submit-btn').innerText = "Add New Batch";
  document.getElementById('cancel-btn').style.display = "inline-block";
  showView('add');
}

function editBatch(productId, batchId) {
  const product = items.find(p => p.id === productId);
  if (!product) return;
  const batch = product.batches.find(b => b.id === batchId);
  if (!batch) return;

  editItemId = productId;
  editBatchId = batchId;

  document.getElementById('name').value = product.name;
  document.getElementById('brand').value = product.brand || '';
  document.getElementById('size').value = product.size || '';
  document.getElementById('category').value = product.category;
  onCategoryChange();
  document.getElementById('sub-category').value = product.subCategory || '';
  document.getElementById('low-threshold').value = product.lowThreshold || 1;
  document.getElementById('batch-code').value = batch.batchCode || '';
  document.getElementById('quantity').value = batch.quantity || 1;
  document.getElementById('price').value = batch.price || '';
  document.getElementById('status').value = batch.status || 'In Stock';
  document.getElementById('purchase-date').value = batch.purchaseDate || '';
  document.getElementById('opened-date').value = batch.openedDate || '';
  document.getElementById('expiry-date').value = batch.expiryDate || '';
  document.getElementById('pao').value = batch.pao || '';
  document.getElementById('location').value = batch.location || '';
  document.getElementById('worth').value = batch.worth || '';
  document.getElementById('worth-remark').value = batch.worthRemark || '';

  document.getElementById('form-heading').innerText = "Edit Product Batch";
  document.getElementById('submit-btn').innerText = "Update Batch";
  document.getElementById('cancel-btn').style.display = "inline-block";
  showView('add');
}

function deleteBatch(productId, batchId) {
  if (!confirm('Delete this batch?')) return;
  const product = items.find(p => p.id === productId);
  if (!product) return;

  product.batches = product.batches.filter(b => b.id !== batchId);
  if (product.batches.length === 0) {
    // Move whole product to archive if desired, or just remove
    items = items.filter(p => p.id !== productId);
  }
  saveItems();
  renderItems();
  showToast('Batch deleted');
}

function searchBatchOnline(batchCode, brand) {
  const query = encodeURIComponent(`${brand} ${batchCode} batch code`);
  window.open(`https://www.google.com/search?q=${query}`, '_blank');
}

// ===== Shopping List =====
function renderShoppingList() {
  const container = document.getElementById('shopping-list');
  const lowItems = items.filter(product => {
    const activeBatches = product.batches.filter(b => b.status !== 'Finished');
    const qty = activeBatches.reduce((a, b) => a + (b.quantity || 0), 0);
    return qty <= (product.lowThreshold || 1) && activeBatches.length > 0;
  });

  if (lowItems.length === 0) {
    container.innerHTML = '<p class="empty-msg">🎉 Nothing low in stock right now!</p>';
    return;
  }

  container.innerHTML = lowItems.map(p => {
    const qty = p.batches.filter(b => b.status !== 'Finished').reduce((a, b) => a + (b.quantity || 0), 0);
    return `
      <div class="shopping-item">
        <div>
          <strong>${p.name}</strong>
          ${p.brand ? ` · ${p.brand}` : ''}
          ${p.size ? ` · ${p.size}` : ''}
        </div>
        <div class="shopping-meta">Current: ${qty} (alert ≤ ${p.lowThreshold || 1})</div>
      </div>`;
  }).join('');
}

function exportShoppingList() {
  const lowItems = items.filter(product => {
    const activeBatches = product.batches.filter(b => b.status !== 'Finished');
    const qty = activeBatches.reduce((a, b) => a + (b.quantity || 0), 0);
    return qty <= (product.lowThreshold || 1) && activeBatches.length > 0;
  });

  let text = "Shopping List - Check It YourShelf\n" + new Date().toLocaleDateString() + "\n\n";
  lowItems.forEach(p => {
    text += `• ${p.name}${p.brand ? ' (' + p.brand + ')' : ''}${p.size ? ' - ' + p.size : ''}\n`;
  });

  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `shopping_list_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
}

// ===== Archive =====
function renderArchive() {
  const container = document.getElementById('archive-list');
  if (archived.length === 0) {
    container.innerHTML = '<p class="empty-msg">No archived items yet.</p>';
    return;
  }
  container.innerHTML = archived.map(p => `
    <div class="product-card">
      <div class="product-header">
        <div>
          <h3>${p.name}</h3>
          <div class="product-sub">${p.brand || ''} ${p.size || ''} · ${p.category}</div>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== Browse =====
function initBrowseView() {
  const container1 = document.getElementById('main-cat-buttons');
  const step2 = document.getElementById('browse-step-2');
  const results = document.getElementById('browse-results');
  step2.style.display = 'none';
  results.innerHTML = '';

  let html = '';
  Object.keys(categoriesData).forEach(cat => {
    html += `<button type="button" class="tab-btn" onclick="selectBrowseMain('${cat.replace(/'/g, "\\'")}', this)">${cat}</button>`;
  });
  container1.innerHTML = html || '<p class="empty-msg">No categories.</p>';
}

function selectBrowseMain(mainCat, btn) {
  document.querySelectorAll('#main-cat-buttons .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const container2 = document.getElementById('sub-cat-buttons');
  const step2 = document.getElementById('browse-step-2');
  const subs = categoriesData[mainCat] || [];

  let html = `<button type="button" class="tab-btn" onclick="filterBrowseResults('${mainCat.replace(/'/g, "\\'")}', 'ALL', this)">All</button>`;
  subs.forEach(sub => {
    html += `<button type="button" class="tab-btn" onclick="filterBrowseResults('${mainCat.replace(/'/g, "\\'")}', '${sub.replace(/'/g, "\\'")}', this)">${sub}</button>`;
  });
  container2.innerHTML = html;
  step2.style.display = 'block';
  filterBrowseResults(mainCat, 'ALL', null);
}

function filterBrowseResults(mainCat, subCat, btn) {
  if (btn) {
    document.querySelectorAll('#sub-cat-buttons .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const results = document.getElementById('browse-results');
  const filtered = items.filter(i => {
    const matchMain = i.category === mainCat;
    const matchSub = (subCat === 'ALL') || (i.subCategory === subCat);
    return matchMain && matchSub;
  });
  results.innerHTML = filtered.length === 0
    ? '<p class="empty-msg">No products in this category.</p>'
    : renderProductListHTML(filtered);
}

// ===== Datalists =====
function updateDatalists() {
  const prodDatalist = document.getElementById('product-suggestions');
  const brandDatalist = document.getElementById('brand-suggestions');
  if (prodDatalist) {
    const names = [...new Set(items.map(i => i.name).filter(Boolean))];
    prodDatalist.innerHTML = names.map(n => `<option value="${n}">`).join('');
  }
  if (brandDatalist) {
    const brands = [...new Set(items.map(i => i.brand).filter(Boolean))];
    brandDatalist.innerHTML = brands.map(b => `<option value="${b}">`).join('');
  }
}

// ===== Export / Import / Backup =====
function exportData(format = 'json') {
  if (format === 'json') {
    const data = {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      items,
      categoriesData,
      archived
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `yourshelf_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  } else if (format === 'csv') {
    let csv = "Name,Brand,Size,Category,SubCategory,BatchCode,Quantity,Status,Price,Location,PurchaseDate,OpenedDate,ExpiryDate,PAO,UseBy,Worth,Notes\n";
    items.forEach(p => {
      p.batches.forEach(b => {
        const useBy = getEffectiveExpiry(b) || '';
        csv += `"${p.name}","${p.brand || ''}","${p.size || ''}","${p.category}","${p.subCategory || ''}","${b.batchCode || ''}",${b.quantity},"${b.status}",${b.price || ''},"${b.location || ''}","${b.purchaseDate || ''}","${b.openedDate || ''}","${b.expiryDate || ''}","${b.pao || ''}","${useBy}","${b.worth || ''}","${b.worthRemark || ''}"\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `yourshelf_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }
  showToast('Exported');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      if (file.name.endsWith('.csv')) {
        alert('CSV import is basic – prefer JSON for full restore.');
        return;
      }
      const parsed = JSON.parse(e.target.result);
      if (parsed.items && Array.isArray(parsed.items)) {
        items = parsed.items;
        if (parsed.categoriesData) categoriesData = parsed.categoriesData;
        if (parsed.archived) archived = parsed.archived;
        saveItems();
        saveCategories();
        saveArchive();
        initCategories();
        renderCategoryManager();
        renderItems();
        updateDashboard();
        alert('Data imported successfully!');
      } else {
        alert('Invalid file format.');
      }
    } catch (err) {
      alert('Error parsing file.');
    }
  };
  reader.readAsText(file);
}

function createBackup() {
  const backups = JSON.parse(localStorage.getItem(STORAGE_KEY_BACKUPS) || '[]');
  const backup = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    items: JSON.parse(JSON.stringify(items)),
    categoriesData: JSON.parse(JSON.stringify(categoriesData)),
    archived: JSON.parse(JSON.stringify(archived))
  };
  backups.unshift(backup);
  if (backups.length > 5) backups.length = 5; // keep last 5
  localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(backups));

  const meta = getMeta();
  meta.lastBackup = backup.date;
  saveMeta(meta);

  showToast('Local backup created');
  updateSettingsView();
}

function checkAutoBackup() {
  const meta = getMeta();
  const last = meta.lastBackup ? new Date(meta.lastBackup) : null;
  const now = new Date();
  if (!last || (now - last) > 14 * 24 * 60 * 60 * 1000) {
    // gently remind after 14 days
    setTimeout(() => {
      if (confirm('It has been a while since your last backup.\nCreate a local backup now?')) {
        createBackup();
      }
    }, 2000);
  }
}

function showBackups() {
  const backups = JSON.parse(localStorage.getItem(STORAGE_KEY_BACKUPS) || '[]');
  if (backups.length === 0) {
    alert('No local backups yet.');
    return;
  }
  let msg = 'Local Backups:\n\n';
  backups.forEach((b, i) => {
    msg += `${i + 1}. ${new Date(b.date).toLocaleString()} (${b.items.length} products)\n`;
  });
  msg += '\nTo restore, use the full JSON export/import for now.';
  alert(msg);
}

function updateSettingsView() {
  const meta = getMeta();
  document.getElementById('last-backup-date').innerText =
    meta.lastBackup ? new Date(meta.lastBackup).toLocaleString() : 'Never';
  updateNotifyButton();
}

// ===== Notifications =====
function updateNotifyButton() {
  const btn = document.getElementById('notify-toggle-btn');
  const statusEl = document.getElementById('notify-status');
  if (!('Notification' in window)) {
    if (btn) btn.innerText = '🔔 Not supported';
    if (statusEl) statusEl.innerText = 'Notifications not supported in this browser';
    return;
  }
  const perm = Notification.permission;
  if (btn) {
    btn.innerText = perm === 'granted' ? '🔔 On' : '🔔 Enable Notifications';
  }
  if (statusEl) {
    statusEl.innerText = `Status: ${perm}`;
  }
}

function toggleNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Notifications not supported');
    return;
  }
  if (Notification.permission === 'granted') {
    alert('Notifications are already enabled. You can manage them in browser settings.');
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(permission => {
      updateNotifyButton();
      if (permission === 'granted') {
        checkAndNotify(true);
      }
    });
  } else {
    alert('Permission denied. Please enable in browser settings.');
  }
}

function checkAndNotify(force = false) {
  if (Notification.permission !== 'granted') return;

  const today = new Date();
  const soon = new Date();
  soon.setDate(today.getDate() + 14);

  let lowCount = 0;
  let expiring = [];

  items.forEach(product => {
    const activeBatches = product.batches.filter(b => b.status !== 'Finished');
    const qty = activeBatches.reduce((a, b) => a + (b.quantity || 0), 0);
    if (qty <= (product.lowThreshold || 1) && activeBatches.length > 0) lowCount++;

    product.batches.forEach(b => {
      if (b.status === 'Finished') return;
      const exp = getEffectiveExpiry(b);
      if (exp && new Date(exp) <= soon) {
        expiring.push(`${product.name} (${exp})`);
      }
    });
  });

  if (force || lowCount > 0 || expiring.length > 0) {
    let body = '';
    if (lowCount > 0) body += `${lowCount} item(s) low in stock. `;
    if (expiring.length > 0) body += `${expiring.length} batch(es) expiring soon.`;
    if (!body) body = 'Inventory looks good!';

    new Notification('Check It YourShelf', {
      body: body,
      icon: 'Picture%201.png'
    });
  }
}

// ===== Toast =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2200);
}
