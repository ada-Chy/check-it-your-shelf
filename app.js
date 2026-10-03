/* Language Dictionary */
const i18n = {
  en: {
    appTitle: "Check It YourShelf",
    appSubtitle: "Smart Household & Skincare Tracker",
    dash: "Dashboard",
    inventory: "Inventory",
    add: "+ Add",
    categories: "Categories",
    locations: "Locations",
    shopping: "Shopping",
    settings: "Settings",
    totalItems: "Total Products",
    lowStock: "Low Stock (≤1)",
    expiringSoon: "Expiring Soon",
    expired: "Expired",
    searchPlaceholder: "Search by name or brand...",
    filterCat: "All Categories",
    filterLoc: "All Rooms",
    all: "All",
    addTitle: "Add New Product",
    editTitle: "Edit Product",
    nameLabel: "Product Name *",
    brandLabel: "Brand / Maker",
    catLabel: "Category *",
    subCatLabel: "Sub-Category",
    mainLocLabel: "Main Room *",
    subLocLabel: "Storage Spot",
    qtyLabel: "Quantity",
    statusLabel: "Status",
    openedDateLabel: "Date Opened",
    paoLabel: "Period After Opening (Months)",
    expiryDateLabel: "Expiration Date",
    worthItLabel: "Worth Repurchasing?",
    saveBtn: "Save Product",
    cancelBtn: "Cancel",
    manageCats: "Category Manager",
    addCatBtn: "+ Add Category",
    addSubCatBtn: "+ Sub-Cat",
    manageLocs: "Location Manager",
    addMainLocBtn: "+ Add Room",
    addSubLocBtn: "+ Spot",
    shoppingList: "Shopping List",
    addShopPlaceholder: "Add item to buy...",
    inStock: "In Stock",
    inUse: "In Use",
    finished: "Finished",
    yes: "Worth It",
    no: "Not Worth It",
    maybe: "Maybe",
    exportData: "Export Data (JSON)",
    importData: "Import Data (JSON)",
    clearData: "Reset All Data",
    confirmDelete: "Are you sure you want to delete this item?",
    saved: "Saved successfully!"
  },
  zh: {
    appTitle: "Check It YourShelf",
    appSubtitle: "智能家居與護膚品庫存管理",
    dash: "儀表板",
    inventory: "物品庫存",
    add: "+ 新增",
    categories: "分類管理",
    locations: "位置管理",
    shopping: "購物清單",
    settings: "設定",
    totalItems: "物品總數",
    lowStock: "庫存緊張 (≤1)",
    expiringSoon: "即將過期 (30天)",
    expired: "已過期",
    searchPlaceholder: "搜尋名稱或品牌...",
    filterCat: "所有分類",
    filterLoc: "所有房間",
    all: "全部",
    addTitle: "新增物品",
    editTitle: "編輯物品",
    nameLabel: "物品名稱 *",
    brandLabel: "品牌 / 製造商",
    catLabel: "主要分類 *",
    subCatLabel: "子分類",
    mainLocLabel: "主要房間 *",
    subLocLabel: "具體位置",
    qtyLabel: "數量",
    statusLabel: "狀態",
    openedDateLabel: "開封日期",
    paoLabel: "開架保質期 (PAO 月數)",
    expiryDateLabel: "官方過期日",
    worthItLabel: "值得回購？",
    saveBtn: "儲存物品",
    cancelBtn: "取消",
    manageCats: "目錄管理",
    addCatBtn: "+ 新增主分類",
    addSubCatBtn: "+ 子分類",
    manageLocs: "存放位置管理",
    addMainLocBtn: "+ 新增房間",
    addSubLocBtn: "+ 位置",
    shoppingList: "購物清單",
    addShopPlaceholder: "輸入欲購買物品...",
    inStock: "有存貨",
    inUse: "使用中",
    finished: "已用完",
    yes: "值得回購",
    no: "不回購",
    maybe: "考慮中",
    exportData: "匯出數據 (JSON)",
    importData: "匯入數據 (JSON)",
    clearData: "重置所有數據",
    confirmDelete: "確定要刪除此項目嗎？",
    saved: "成功儲存！"
  }
};

/* State Management */
let currentLang = localStorage.getItem('yourshelf_lang') || 'en';
let activeTab = 'dashboard';
let editingItemId = null;

const defaultCategories = [
  { name: "Skincare", subs: ["Cleansing", "Toner & Essence", "Serums & Ampoules", "Eye Cream", "Moisturizer", "Sunscreen", "Masks"] },
  { name: "Cosmetics & Makeup", subs: ["Face Base", "Eye Makeup", "Lips", "Blush & Contour"] },
  { name: "Personal Care & Hair", subs: ["Hair Care", "Body Wash & Lotion", "Oral Hygiene", "Deodorant & Perfume"] },
  { name: "Household & Cleaning", subs: ["Laundry", "Dish & Surface", "Paper & Disposables", "Trash Bags"] },
  { name: "Health & First Aid", subs: ["Vitamins & Supplements", "Medicine & Ointment", "Plasters & Bandages"] }
];

const defaultLocations = [
  { main: "Toilet / Bathroom", subs: ["Under Sink Cabinet", "Medicine Cabinet", "Shower Caddy", "Countertop"] },
  { main: "Bedroom", subs: ["Drawer #1", "Drawer #2", "Vanity Table", "Closet Shelf"] },
  { main: "Living Room", subs: ["TV Cabinet", "Storage Side Table"] },
  { main: "Kitchen", subs: ["Under Sink Drawer", "Pantry Rack"] },
  { main: "Store Room", subs: ["Top Shelf", "Organizing Box A"] }
];

let items = JSON.parse(localStorage.getItem('yourshelf_items')) || [];
let categories = JSON.parse(localStorage.getItem('yourshelf_cats')) || defaultCategories;
let locations = JSON.parse(localStorage.getItem('yourshelf_locs')) || defaultLocations;
let shoppingList = JSON.parse(localStorage.getItem('yourshelf_shop')) || [];

function saveState() {
  localStorage.setItem('yourshelf_lang', currentLang);
  localStorage.setItem('yourshelf_items', JSON.stringify(items));
  localStorage.setItem('yourshelf_cats', JSON.stringify(categories));
  localStorage.setItem('yourshelf_locs', JSON.stringify(locations));
  localStorage.setItem('yourshelf_shop', JSON.stringify(shoppingList));
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 2200);
}

function t(key) {
  return i18n[currentLang][key] || key;
}

/* App Initialization */
document.addEventListener('DOMContentLoaded', () => {
  setupHeaderAndNav();
  renderView();
});

function setupHeaderAndNav() {
  const langBtn = document.getElementById('lang-toggle-btn');
  langBtn.textContent = currentLang === 'en' ? '繁體中文' : 'English';
  langBtn.onclick = () => {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    saveState();
    setupHeaderAndNav();
    renderView();
  };

  document.getElementById('app-title').textContent = t('appTitle');
  document.getElementById('app-subtitle').textContent = t('appSubtitle');

  document.getElementById('tab-dash').textContent = t('dash');
  document.getElementById('tab-items').textContent = t('inventory');
  document.getElementById('tab-add').textContent = t('add');
  document.getElementById('tab-catalog').textContent = t('categories');
  document.getElementById('tab-locations').textContent = t('locations');
  document.getElementById('tab-shop').textContent = t('shopping');
  document.getElementById('tab-set').textContent = t('settings');

  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.onclick = (e) => {
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      activeTab = e.target.dataset.tab;
      if (activeTab !== 'add') editingItemId = null;
      renderView();
    };
  });
}

function renderView() {
  const main = document.getElementById('main-content');
  if (activeTab === 'dashboard') renderDashboard(main);
  else if (activeTab === 'items') renderInventory(main);
  else if (activeTab === 'add') renderAddEditForm(main);
  else if (activeTab === 'catalog') renderCatalogManager(main);
  else if (activeTab === 'locations') renderLocationManager(main);
  else if (activeTab === 'shopping') renderShoppingView(main);
  else if (activeTab === 'settings') renderSettingsView(main);
}

/* 1. Dashboard View */
function renderDashboard(container) {
  const lowStockCount = items.filter(i => i.quantity <= 1).length;
  
  let expiringCount = 0;
  let expiredCount = 0;
  const now = new Date();

  items.forEach(i => {
    const expDate = getEffectiveExpiry(i);
    if (expDate) {
      const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) expiredCount++;
      else if (diffDays <= 30) expiringCount++;
    }
  });

  container.innerHTML = `
    <div class="dashboard-grid">
      <div class="dash-card" onclick="switchTab('items')">
        <div class="dash-num">${items.length}</div>
        <div class="dash-label">${t('totalItems')}</div>
      </div>
      <div class="dash-card dash-warning" onclick="switchTab('items')">
        <div class="dash-num">${lowStockCount}</div>
        <div class="dash-label">${t('lowStock')}</div>
      </div>
      <div class="dash-card dash-warning" onclick="switchTab('items')">
        <div class="dash-num">${expiringCount}</div>
        <div class="dash-label">${t('expiringSoon')}</div>
      </div>
      <div class="dash-card dash-danger" onclick="switchTab('items')">
        <div class="dash-num">${expiredCount}</div>
        <div class="dash-label">${t('expired')}</div>
      </div>
    </div>
    <div class="card-section">
      <h2>Quick Actions</h2>
      <button class="btn-primary" style="width:100%; height:46px;" onclick="switchTab('add')">${t('addTitle')}</button>
    </div>
  `;
}

function switchTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.nav-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabName);
  });
  renderView();
}

/* Helper Expiry Calculation */
function getEffectiveExpiry(item) {
  let dates = [];
  if (item.expiryDate) dates.push(new Date(item.expiryDate));
  if (item.openedDate && item.paoMonths) {
    let paoExp = new Date(item.openedDate);
    paoExp.setMonth(paoExp.getMonth() + parseInt(item.paoMonths));
    dates.push(paoExp);
  }
  if (dates.length === 0) return null;
  return new Date(Math.min(...dates));
}

/* 2. Inventory View */
function renderInventory(container) {
  let catOptions = categories.map(c => `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`).join('');
  let locOptions = locations.map(l => `<option value="${escapeHTML(l.main)}">${escapeHTML(l.main)}</option>`).join('');

  container.innerHTML = `
    <div class="search-filter-bar">
      <input type="text" id="search-input" placeholder="${t('searchPlaceholder')}" oninput="filterItems()">
      <div style="display:flex; gap:8px;">
        <select id="filter-cat" onchange="filterItems()">
          <option value="">${t('filterCat')}</option>
          ${catOptions}
        </select>
        <select id="filter-loc" onchange="filterItems()">
          <option value="">${t('filterLoc')}</option>
          ${locOptions}
        </select>
      </div>
    </div>
    <div id="item-list-container"></div>
  `;
  filterItems();
}

function filterItems() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase();
  const catFilter = document.getElementById('filter-cat')?.value || '';
  const locFilter = document.getElementById('filter-loc')?.value || '';

  const listContainer = document.getElementById('item-list-container');
  if (!listContainer) return;

  const filtered = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(query) || (item.brand && item.brand.toLowerCase().includes(query));
    const matchesCat = !catFilter || item.category === catFilter;
    const matchesLoc = !locFilter || item.mainLoc === locFilter;
    return matchesSearch && matchesCat && matchesLoc;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = `<div class="empty-msg">No items found.</div>`;
    return;
  }

  const now = new Date();
  listContainer.innerHTML = filtered.map(item => {
    const expDate = getEffectiveExpiry(item);
    let expBadge = '';
    let cardClass = '';

    if (expDate) {
      const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
      const formattedDate = expDate.toISOString().split('T')[0];
      if (diffDays <= 0) {
        expBadge = `<span class="exp-danger">EXPIRED (${formattedDate})</span>`;
        cardClass = 'card-expired';
      } else if (diffDays <= 30) {
        expBadge = `<span class="exp-warn">Expiring in ${diffDays}d (${formattedDate})</span>`;
        cardClass = 'card-low-stock';
      } else {
        expBadge = `<span>Exp: ${formattedDate}</span>`;
      }
    }

    if (item.quantity <= 1 && !cardClass) cardClass = 'card-low-stock';

    let worthClass = item.worthIt === 'yes' ? 'worth-yes' : (item.worthIt === 'no' ? 'worth-no' : 'worth-maybe');
    let worthText = item.worthIt ? t(item.worthIt) : '';

    return `
      <div class="product-card ${cardClass}">
        <div class="product-top">
          <div>
            <div class="product-title">${escapeHTML(item.name)}</div>
            ${item.brand ? `<div class="product-sub">${escapeHTML(item.brand)}</div>` : ''}
            <div class="loc-badge">📍 ${escapeHTML(item.mainLoc)}${item.subLoc ? ' › ' + escapeHTML(item.subLoc) : ''}</div>
          </div>
          <span class="status-badge status-${item.status === 'in_stock' ? 'in-stock' : (item.status === 'in_use' ? 'using' : 'finished')}">
            ${item.status === 'in_stock' ? t('inStock') : (item.status === 'in_use' ? t('inUse') : t('finished'))}
          </span>
        </div>

        <div class="product-meta">
          <span class="sub-pill">${escapeHTML(item.category)}${item.subCategory ? ' / ' + escapeHTML(item.subCategory) : ''}</span>
          ${expBadge}
          ${worthText ? `<span class="worth-tag ${worthClass}">${worthText}</span>` : ''}
        </div>

        <div class="card-actions">
          <div class="qty-controls">
            <button class="btn-qty" onclick="changeQty('${item.id}', -1)">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="btn-qty" onclick="changeQty('${item.id}', 1)">+</button>
          </div>
          <div class="action-btns">
            <button class="btn-sm btn-edit" onclick="editItem('${item.id}')">Edit</button>
            <button class="btn-sm btn-delete" onclick="deleteItem('${item.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function changeQty(id, delta) {
  const item = items.find(i => i.id === id);
  if (item) {
    item.quantity = Math.max(0, item.quantity + delta);
    saveState();
    filterItems();
  }
}

function editItem(id) {
  editingItemId = id;
  activeTab = 'add';
  renderView();
}

function deleteItem(id) {
  if (confirm(t('confirmDelete'))) {
    items = items.filter(i => i.id !== id);
    saveState();
    filterItems();
  }
}

/* 3. Add / Edit Form */
function renderAddEditForm(container) {
  const item = editingItemId ? items.find(i => i.id === editingItemId) : null;

  let catOptions = categories.map(c => `<option value="${escapeHTML(c.name)}" ${item && item.category === c.name ? 'selected' : ''}>${escapeHTML(c.name)}</option>`).join('');
  let mainLocOptions = locations.map(l => `<option value="${escapeHTML(l.main)}" ${item && item.mainLoc === l.main ? 'selected' : ''}>${escapeHTML(l.main)}</option>`).join('');

  container.innerHTML = `
    <div class="card-section">
      <h2>${item ? t('editTitle') : t('addTitle')}</h2>
      <form id="item-form" onsubmit="handleFormSubmit(event)">
        <div class="form-grid">
          <div class="input-group">
            <label>${t('nameLabel')}</label>
            <input type="text" id="form-name" value="${item ? escapeHTML(item.name) : ''}" required>
          </div>
          <div class="input-group">
            <label>${t('brandLabel')}</label>
            <input type="text" id="form-brand" value="${item && item.brand ? escapeHTML(item.brand) : ''}">
          </div>
          
          <div class="form-row">
            <div class="input-group">
              <label>${t('catLabel')}</label>
              <select id="form-cat" onchange="updateSubCatDropdown()">${catOptions}</select>
            </div>
            <div class="input-group">
              <label>${t('subCatLabel')}</label>
              <select id="form-sub-cat"></select>
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label>${t('mainLocLabel')}</label>
              <select id="form-main-loc" onchange="updateSubLocDropdown()">${mainLocOptions}</select>
            </div>
            <div class="input-group">
              <label>${t('subLocLabel')}</label>
              <select id="form-sub-loc"></select>
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label>${t('qtyLabel')}</label>
              <input type="number" id="form-qty" min="0" value="${item ? item.quantity : 1}">
            </div>
            <div class="input-group">
              <label>${t('statusLabel')}</label>
              <select id="form-status">
                <option value="in_stock" ${item && item.status === 'in_stock' ? 'selected' : ''}>${t('inStock')}</option>
                <option value="in_use" ${item && item.status === 'in_use' ? 'selected' : ''}>${t('inUse')}</option>
                <option value="finished" ${item && item.status === 'finished' ? 'selected' : ''}>${t('finished')}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="input-group">
              <label>${t('openedDateLabel')}</label>
              <input type="date" id="form-opened" value="${item && item.openedDate ? item.openedDate : ''}">
            </div>
            <div class="input-group">
              <label>${t('paoLabel')}</label>
              <input type="number" id="form-pao" placeholder="e.g. 6 or 12" value="${item && item.paoMonths ? item.paoMonths : ''}">
            </div>
          </div>

          <div class="input-group">
            <label>${t('expiryDateLabel')}</label>
            <input type="date" id="form-expiry" value="${item && item.expiryDate ? item.expiryDate : ''}">
          </div>

          <div class="input-group">
            <label>${t('worthItLabel')}</label>
            <select id="form-worth">
              <option value="">-- Select --</option>
              <option value="yes" ${item && item.worthIt === 'yes' ? 'selected' : ''}>${t('yes')}</option>
              <option value="no" ${item && item.worthIt === 'no' ? 'selected' : ''}>${t('no')}</option>
              <option value="maybe" ${item && item.worthIt === 'maybe' ? 'selected' : ''}>${t('maybe')}</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary">${t('saveBtn')}</button>
          ${item ? `<button type="button" class="btn-secondary" onclick="cancelEdit()">${t('cancelBtn')}</button>` : ''}
        </div>
      </form>
    </div>
  `;

  updateSubCatDropdown(item ? item.subCategory : null);
  updateSubLocDropdown(item ? item.subLoc : null);
}

function updateSubCatDropdown(selectedSub = null) {
  const catName = document.getElementById('form-cat')?.value;
  const subSelect = document.getElementById('form-sub-cat');
  if (!subSelect) return;

  const targetCat = categories.find(c => c.name === catName);
  if (targetCat && targetCat.subs.length > 0) {
    subSelect.innerHTML = targetCat.subs.map(s => `<option value="${escapeHTML(s)}" ${selectedSub === s ? 'selected' : ''}>${escapeHTML(s)}</option>`).join('');
  } else {
    subSelect.innerHTML = `<option value="">None</option>`;
  }
}

function updateSubLocDropdown(selectedSub = null) {
  const locName = document.getElementById('form-main-loc')?.value;
  const subSelect = document.getElementById('form-sub-loc');
  if (!subSelect) return;

  const targetLoc = locations.find(l => l.main === locName);
  if (targetLoc && targetLoc.subs.length > 0) {
    subSelect.innerHTML = targetLoc.subs.map(s => `<option value="${escapeHTML(s)}" ${selectedSub === s ? 'selected' : ''}>${escapeHTML(s)}</option>`).join('');
  } else {
    subSelect.innerHTML = `<option value="">None</option>`;
  }
}

function cancelEdit() {
  editingItemId = null;
  switchTab('items');
}

function handleFormSubmit(e) {
  e.preventDefault();

  const newItem = {
    id: editingItemId || 'item_' + Date.now(),
    name: document.getElementById('form-name').value.trim(),
    brand: document.getElementById('form-brand').value.trim(),
    category: document.getElementById('form-cat').value,
    subCategory: document.getElementById('form-sub-cat').value,
    mainLoc: document.getElementById('form-main-loc').value,
    subLoc: document.getElementById('form-sub-loc').value,
    quantity: parseInt(document.getElementById('form-qty').value) || 0,
    status: document.getElementById('form-status').value,
    openedDate: document.getElementById('form-opened').value,
    paoMonths: document.getElementById('form-pao').value,
    expiryDate: document.getElementById('form-expiry').value,
    worthIt: document.getElementById('form-worth').value
  };

  if (editingItemId) {
    const idx = items.findIndex(i => i.id === editingItemId);
    if (idx !== -1) items[idx] = newItem;
    editingItemId = null;
  } else {
    items.push(newItem);
  }

  saveState();
  showToast(t('saved'));
  switchTab('items');
}

/* 4. Catalog Manager View */
function renderCatalogManager(container) {
  container.innerHTML = `
    <div class="card-section">
      <h2>${t('manageCats')}</h2>
      <button class="btn-primary" style="width:100%; margin-bottom:12px;" onclick="addCategoryPrompt()">${t('addCatBtn')}</button>
      <div id="cat-list"></div>
    </div>
  `;

  const catList = document.getElementById('cat-list');
  catList.innerHTML = categories.map((cat, idx) => `
    <div class="manage-row">
      <div>
        <div class="manage-title">${escapeHTML(cat.name)}</div>
        <div class="sub-pills">
          ${cat.subs.map(s => `<span class="sub-pill">${escapeHTML(s)}</span>`).join('')}
        </div>
      </div>
      <div>
        <button class="btn-sm btn-edit" onclick="addSubCatPrompt(${idx})">${t('addSubCatBtn')}</button>
        <button class="btn-sm btn-delete" onclick="deleteCategory(${idx})">✕</button>
      </div>
    </div>
  `).join('');
}

function addCategoryPrompt() {
  const name = prompt("Enter new main category name:");
  if (name && name.trim()) {
    categories.push({ name: name.trim(), subs: [] });
    saveState();
    renderCatalogManager(document.getElementById('main-content'));
  }
}

function addSubCatPrompt(catIndex) {
  const subName = prompt(`Enter sub-category for ${categories[catIndex].name}:`);
  if (subName && subName.trim()) {
    categories[catIndex].subs.push(subName.trim());
    saveState();
    renderCatalogManager(document.getElementById('main-content'));
  }
}

function deleteCategory(index) {
  if (confirm("Delete category?")) {
    categories.splice(index, 1);
    saveState();
    renderCatalogManager(document.getElementById('main-content'));
  }
}

/* 5. Location Manager View */
function renderLocationManager(container) {
  container.innerHTML = `
    <div class="card-section">
      <h2>${t('manageLocs')}</h2>
      <button class="btn-primary" style="width:100%; margin-bottom:12px;" onclick="addMainLocationPrompt()">${t('addMainLocBtn')}</button>
      <div id="loc-list"></div>
    </div>
  `;

  const locList = document.getElementById('loc-list');
  locList.innerHTML = locations.map((loc, idx) => `
    <div class="manage-row">
      <div>
        <div class="manage-title">📍 ${escapeHTML(loc.main)}</div>
        <div class="sub-pills">
          ${loc.subs.map(s => `<span class="sub-pill">${escapeHTML(s)}</span>`).join('')}
        </div>
      </div>
      <div>
        <button class="btn-sm btn-edit" onclick="addSubLocPrompt(${idx})">${t('addSubLocBtn')}</button>
        <button class="btn-sm btn-delete" onclick="deleteLocation(${idx})">✕</button>
      </div>
    </div>
  `).join('');
}

function addMainLocationPrompt() {
  const main = prompt("Enter new room/main location:");
  if (main && main.trim()) {
    locations.push({ main: main.trim(), subs: [] });
    saveState();
    renderLocationManager(document.getElementById('main-content'));
  }
}

function addSubLocPrompt(locIndex) {
  const sub = prompt(`Enter storage spot for ${locations[locIndex].main}:`);
  if (sub && sub.trim()) {
    locations[locIndex].subs.push(sub.trim());
    saveState();
    renderLocationManager(document.getElementById('main-content'));
  }
}

function deleteLocation(index) {
  if (confirm("Delete location?")) {
    locations.splice(index, 1);
    saveState();
    renderLocationManager(document.getElementById('main-content'));
  }
}

/* 6. Shopping View */
function renderShoppingView(container) {
  container.innerHTML = `
    <div class="card-section">
      <h2>${t('shoppingList')}</h2>
      <div style="display:flex; gap:8px; margin-bottom:12px;">
        <input type="text" id="shop-input" placeholder="${t('addShopPlaceholder')}">
        <button class="btn-primary" style="flex:none; padding:0 16px;" onclick="addShopItem()">Add</button>
      </div>
      <div id="shop-list"></div>
    </div>
  `;
  renderShopList();
}

function renderShopList() {
  const listEl = document.getElementById('shop-list');
  if (!listEl) return;

  if (shoppingList.length === 0) {
    listEl.innerHTML = `<div class="empty-msg">Shopping list is empty.</div>`;
    return;
  }

  listEl.innerHTML = shoppingList.map((item, idx) => `
    <div class="manage-row">
      <span class="manage-title">${escapeHTML(item)}</span>
      <button class="btn-sm btn-delete" onclick="removeShopItem(${idx})">Done ✓</button>
    </div>
  `).join('');
}

function addShopItem() {
  const input = document.getElementById('shop-input');
  if (input && input.value.trim()) {
    shoppingList.push(input.value.trim());
    input.value = '';
    saveState();
    renderShopList();
  }
}

function removeShopItem(index) {
  shoppingList.splice(index, 1);
  saveState();
  renderShopList();
}

/* 7. Settings View */
function renderSettingsView(container) {
  container.innerHTML = `
    <div class="card-section">
      <h2>${t('settings')}</h2>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="btn-secondary" onclick="exportData()">${t('exportData')}</button>
        <button class="btn-secondary" onclick="importData()">${t('importData')}</button>
        <button class="btn-sm btn-delete" style="height:44px; margin-top:10px;" onclick="clearAllData()">${t('clearData')}</button>
      </div>
    </div>
  `;
}

function exportData() {
  const data = { items, categories, locations, shoppingList };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yourshelf-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.items) items = parsed.items;
        if (parsed.categories) categories = parsed.categories;
        if (parsed.locations) locations = parsed.locations;
        if (parsed.shoppingList) shoppingList = parsed.shoppingList;
        saveState();
        showToast('Data imported successfully!');
        switchTab('items');
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function clearAllData() {
  if (confirm("Are you sure you want to reset all inventory and settings data?")) {
    localStorage.clear();
    location.reload();
  }
}
