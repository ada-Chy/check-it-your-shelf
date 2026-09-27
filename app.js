// State & Local Storage Initialization
let items = JSON.parse(localStorage.getItem('items')) || [];

// Main Category -> Array of Sub-categories Mapping
let categories = JSON.parse(localStorage.getItem('categories')) || {
  "Skincare / 護膚": ["Sunscreen / 防曬", "Serum / 精華", "Cleanser / 潔面", "Moisturizer / 面霜"],
  "Laundry / 洗衣": ["Detergent / 洗衣液", "Softener / 柔順劑"],
  "Toilet Paper / 廁紙": ["Roll Paper / 卷紙", "Tissues / 紙巾"],
  "Cleaning / 清潔": ["Kitchen / 廚房清潔", "Bathroom / 浴室清潔"],
  "Personal Care / 個人護理": ["Shampoo / 洗髮水", "Body Wash / 沐浴露"]
};

// Migration check if older storage format was a simple Array
if (Array.isArray(categories)) {
  const migrated = {};
  categories.forEach(cat => { migrated[cat] = []; });
  categories = migrated;
}

let editingId = null;
let currentTab = 'ALL';

// DOM Elements
const form = document.getElementById('item-form');
const itemsList = document.getElementById('items-list');
const categoriesList = document.getElementById('categories-list');
const categorySelect = document.getElementById('category');
const subCategorySelect = document.getElementById('sub-category');
const filterCategorySelect = document.getElementById('filter-category');
const filterSubCategorySelect = document.getElementById('filter-sub-category');
const customCategoryInput = document.getElementById('custom-category');
const customSubCategoryInput = document.getElementById('custom-sub-category');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formHeading = document.getElementById('form-heading');
const productNameInput = document.getElementById('name');
const productSuggestions = document.getElementById('product-suggestions');

// Category & Sub-Category Dropdown Setup
function renderCategories() {
  categorySelect.innerHTML = '<option value="">-- Select Category --</option>';
  filterCategorySelect.innerHTML = '<option value="ALL">All Categories / 所有分類</option>';

  Object.keys(categories).forEach(cat => {
    const opt1 = document.createElement('option');
    opt1.value = cat;
    opt1.textContent = cat;
    categorySelect.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = cat;
    opt2.textContent = cat;
    filterCategorySelect.appendChild(opt2);
  });

  const otherOption = document.createElement('option');
  otherOption.value = "Other";
  otherOption.textContent = "Other / 其他 (Add new)";
  categorySelect.appendChild(otherOption);

  onCategoryChange();
  onFilterCategoryChange();
}

function onCategoryChange() {
  const selectedCat = categorySelect.value;
  subCategorySelect.innerHTML = '<option value="">-- Select Sub-category --</option>';

  if (selectedCat === 'Other') {
    customCategoryInput.style.display = 'block';
    customCategoryInput.required = true;
    customSubCategoryInput.style.display = 'block';
  } else {
    customCategoryInput.style.display = 'none';
    customCategoryInput.required = false;

    if (selectedCat && categories[selectedCat]) {
      categories[selectedCat].forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub;
        opt.textContent = sub;
        subCategorySelect.appendChild(opt);
      });

      const otherSub = document.createElement('option');
      otherSub.value = 'Other';
      otherSub.textContent = 'Other / 其他 (Add new)';
      subCategorySelect.appendChild(otherSub);
    }
  }
  onSubCategoryChange();
}

function onSubCategoryChange() {
  if (subCategorySelect.value === 'Other') {
    customSubCategoryInput.style.display = 'block';
  } else {
    customSubCategoryInput.style.display = 'none';
    customSubCategoryInput.value = '';
  }
}

function onFilterCategoryChange() {
  const filterCat = filterCategorySelect.value;
  filterSubCategorySelect.innerHTML = '<option value="ALL">All Sub-categories</option>';

  if (filterCat !== 'ALL' && categories[filterCat]) {
    categories[filterCat].forEach(sub => {
      const opt = document.createElement('option');
      opt.value = sub;
      opt.textContent = sub;
      filterSubCategorySelect.appendChild(opt);
    });
  }
  renderItems();
}

// Autocomplete Suggestions for Item Names
function updateProductSuggestions() {
  productSuggestions.innerHTML = '';
  const uniqueNames = [...new Set(items.map(i => i.name).filter(Boolean))];
  
  uniqueNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    productSuggestions.appendChild(option);
  });
}

// Auto-fill existing Product details when choosing a suggestion
productNameInput.addEventListener('input', function() {
  const enteredName = this.value.trim().toLowerCase();
  if (!enteredName || editingId) return;

  const existing = items.find(i => i.name.toLowerCase() === enteredName);
  if (existing) {
    if (existing.brand) document.getElementById('brand').value = existing.brand;
    if (existing.pao) document.getElementById('pao').value = existing.pao;
    if (existing.lowThreshold) document.getElementById('low-threshold').value = existing.lowThreshold;

    if (categories[existing.category]) {
      categorySelect.value = existing.category;
      onCategoryChange();
      if (existing.subCategory) {
        subCategorySelect.value = existing.subCategory;
        onSubCategoryChange();
      }
    }
  }
});

// Category Tree Management
function renderCategoriesList() {
  categoriesList.innerHTML = '';
  const catKeys = Object.keys(categories);

  if (catKeys.length === 0) {
    categoriesList.innerHTML = '<p style="color:#6e6e73;">No categories available.</p>';
    return;
  }

  catKeys.forEach(cat => {
    const div = document.createElement('div');
    div.className = 'category-group';

    const subList = categories[cat] || [];
    const subBadges = subList.map(s => `<span class="sub-cat-pill">${escapeHtml(s)}</span>`).join(' ');

    div.innerHTML = `
      <div class="category-item">
        <div>
          <strong>${escapeHtml(cat)}</strong>
          <div class="sub-category-pills">${subBadges || '<em style="color:#8e8e93; font-size:11px;">No sub-categories</em>'}</div>
        </div>
        <div class="category-actions">
          <button type="button" class="btn-edit-cat" onclick="promptAddSubCategory('${escapeJsStr(cat)}')">+ Sub-category</button>
          <button type="button" class="btn-delete-cat" onclick="deleteMainCategory('${escapeJsStr(cat)}')">Delete</button>
        </div>
      </div>
    `;
    categoriesList.appendChild(div);
  });
}

function promptAddSubCategory(catName) {
  const subName = prompt(`Add new sub-category under "${catName}":`);
  if (!subName || !subName.trim()) return;

  const trimmed = subName.trim();
  if (!categories[catName].includes(trimmed)) {
    categories[catName].push(trimmed);
    saveState();
    renderCategories();
    renderCategoriesList();
  } else {
    alert('Sub-category already exists!');
  }
}

function deleteMainCategory(catName) {
  if (confirm(`Delete main category "${catName}" and all associated sub-category mappings?`)) {
    delete categories[catName];
    saveState();
    renderCategories();
    renderCategoriesList();
  }
}

// Helper Calculations
function calculatePaoExpiry(openedDateStr, paoMonths) {
  if (!openedDateStr || !paoMonths) return null;
  const openedDate = new Date(openedDateStr);
  if (isNaN(openedDate.getTime())) return null;

  const result = new Date(openedDate);
  result.setMonth(result.getMonth() + parseInt(paoMonths, 10));
  return result.toISOString().split('T')[0];
}

function getDaysRemaining(dateString) {
  if (!dateString) return null;
  const target = new Date(dateString);
  const now = new Date();
  const diffTime = target - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function setTab(tab, element) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  element.classList.add('active');
  renderItems();
}

function searchBatchOnline(brand, name, batchCode) {
  const query = `${brand} ${name} batch code ${batchCode}`.trim();
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  window.open(url, '_blank');
}

// Main Render Logic Grouped by Product Name + Brand
function renderItems() {
  itemsList.innerHTML = '';
  const searchInput = document.getElementById('search-input');
  const search = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const categoryFilter = filterCategorySelect.value;
  const subCategoryFilter = filterSubCategorySelect.value;

  const groupedMap = new Map();

  items.forEach(item => {
    const nameMatch = (item.name || '').toLowerCase().includes(search);
    const brandMatch = (item.brand || '').toLowerCase().includes(search);
    const batchMatch = (item.batchCode || '').toLowerCase().includes(search);
    const notesMatch = (item.worthRemark || '').toLowerCase().includes(search);
    const locationMatch = (item.location || '').toLowerCase().includes(search);

    const matchSearch = !search || nameMatch || brandMatch || batchMatch || notesMatch || locationMatch;
    const matchCat = (categoryFilter === 'ALL' || item.category === categoryFilter);
    const matchSubCat = (subCategoryFilter === 'ALL' || item.subCategory === subCategoryFilter);

    if (!matchSearch || !matchCat || !matchSubCat) return;

    const paoExpiry = calculatePaoExpiry(item.openedDate, item.pao);
    const effectiveExpiry = item.expiryDate || paoExpiry;
    const daysLeft = effectiveExpiry ? getDaysRemaining(effectiveExpiry) : null;

    if (currentTab === 'EXPIRING' && (daysLeft === null || daysLeft > 30 || item.status === 'Finished')) return;
    if (currentTab === 'FINISHED' && item.status !== 'Finished') return;

    const groupKey = `${(item.name || '').trim().toLowerCase()}|||${(item.brand || '').trim().toLowerCase()}`;
    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, []);
    }
    groupedMap.get(groupKey).push(item);
  });

  if (groupedMap.size === 0) {
    itemsList.innerHTML = '<p class="empty-msg">No matching products or batches found. / 沒有找到符合的物品</p>';
    return;
  }

  groupedMap.forEach((batchList) => {
    const firstItem = batchList[0];
    
    const totalActiveQty = batchList
      .filter(b => b.status !== 'Finished')
      .reduce((acc, cur) => acc + (parseInt(cur.quantity, 10) || 0), 0);

    const lowThreshold = parseInt(firstItem.lowThreshold, 10) || 1;
    const isLowStock = totalActiveQty <= lowThreshold;

    if (currentTab === 'LOW_STOCK' && !isLowStock) return;

    const groupCard = document.createElement('div');
    groupCard.className = `product-card ${isLowStock ? 'card-low-stock' : ''}`;

    let batchRowsHtml = '';

    batchList.forEach(batch => {
      const paoExpiry = calculatePaoExpiry(batch.openedDate, batch.pao);
      const effectiveExpiry = batch.expiryDate || paoExpiry;
      const daysLeft = effectiveExpiry ? getDaysRemaining(effectiveExpiry) : null;

      let statusClass = 'status-in-stock';
      if (batch.status === 'Using') statusClass = 'status-using';
      if (batch.status === 'Finished') statusClass = 'status-finished';

      let expiryBadge = '';
      if (daysLeft !== null) {
        if (daysLeft < 0) {
          expiryBadge = `<span class="badge badge-expired">Expired ${Math.abs(daysLeft)}d ago</span>`;
        } else if (daysLeft <= 30) {
          expiryBadge = `<span class="badge badge-warning">Expires in ${daysLeft}d</span>`;
        } else {
          expiryBadge = `<span class="badge badge-ok">${daysLeft}d left</span>`;
        }
      }

      const searchBtn = batch.batchCode 
        ? `<button type="button" class="btn-search-batch" onclick="searchBatchOnline('${escapeJsStr(batch.brand)}', '${escapeJsStr(batch.name)}', '${escapeJsStr(batch.batchCode)}')">🔎 Check Batch</button>`
        : '';

      batchRowsHtml += `
        <div class="batch-row">
          <div class="batch-main-info">
            <div class="batch-pills">
              <span class="status-badge ${statusClass}">${escapeHtml(batch.status || 'In Stock')}</span>
              <span class="qty-pill">Qty: <strong>${batch.quantity ?? 1}</strong></span>
              ${batch.batchCode ? `<span class="batch-pill">Batch: <strong>${escapeHtml(batch.batchCode)}</strong></span>` : '<span class="batch-pill muted">No Batch #</span>'}
              ${searchBtn}
              ${expiryBadge}
            </div>

            <div class="batch-dates">
              ${batch.purchaseDate ? `<span>🛒 Bought: ${batch.purchaseDate}</span>` : ''}
              ${batch.openedDate ? `<span>🗓️ Opened: ${batch.openedDate}${batch.pao ? `(PAO: ${batch.pao}M)` : ''}</span>` : ''}
              ${effectiveExpiry ? `<span>⏳ Exp: ${effectiveExpiry}</span>` : ''}
              ${batch.location ? `<span>📍 ${escapeHtml(batch.location)}</span>` : ''}
            </div>

            ${batch.worth ? `<div class="worth-tag worth-${batch.worth.toLowerCase()}">Repurchase: ${escapeHtml(batch.worth)}${batch.worthRemark ? ' — ' + escapeHtml(batch.worthRemark) : ''}</div>` : ''}
          </div>

          <div class="batch-actions">
            <button type="button" class="btn-edit" onclick="editItem(${batch.id})">Edit</button>
            <button type="button" class="btn-delete" onclick="deleteItem(${batch.id})">Delete</button>
          </div>
        </div>
      `;
    });

    const categoryHierarchyLabel = firstItem.subCategory 
      ? `${escapeHtml(firstItem.category)} › ${escapeHtml(firstItem.subCategory)}`
      : escapeHtml(firstItem.category);

    groupCard.innerHTML = `
      <div class="product-header">
        <div>
          <h3>${escapeHtml(firstItem.name)}</h3>
          <p class="product-sub">${firstItem.brand ? escapeHtml(firstItem.brand) + ' · ' : ''}${categoryHierarchyLabel}</p>
        </div>
        <div class="product-header-right">
          <span class="total-qty-badge ${isLowStock ? 'badge-danger' : 'badge-ok'}">Total Active Stock: ${totalActiveQty}</span>
          ${isLowStock ? '<span class="badge badge-warning">Low Stock Alert</span>' : ''}
        </div>
      </div>
      <div class="batch-list">
        ${batchRowsHtml}
      </div>
    `;

    itemsList.appendChild(groupCard);
  });
}

// Form Submission
form.addEventListener('submit', function(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const brand = document.getElementById('brand').value.trim();
  const status = document.getElementById('status').value;
  const quantity = parseInt(document.getElementById('quantity').value, 10) || 1;
  const lowThreshold = parseInt(document.getElementById('low-threshold').value, 10) || 1;
  const purchaseDate = document.getElementById('purchase-date').value;
  const expiryDate = document.getElementById('expiry-date').value;
  const openedDate = document.getElementById('opened-date').value;
  const pao = document.getElementById('pao').value;
  const batchCode = document.getElementById('batch-code').value.trim();
  const location = document.getElementById('location').value.trim();
  const worth = document.getElementById('worth').value;
  const worthRemark = document.getElementById('worth-remark').value.trim();

  let category = categorySelect.value;
  let subCategory = subCategorySelect.value;

  if (category === 'Other') {
    category = customCategoryInput.value.trim();
    const customSub = customSubCategoryInput.value.trim();

    if (!category) return alert('Please enter a custom category name');
    if (!categories[category]) {
      categories[category] = customSub ? [customSub] : [];
    }
    subCategory = customSub;
  } else if (subCategory === 'Other') {
    subCategory = customSubCategoryInput.value.trim();
    if (subCategory && !categories[category].includes(subCategory)) {
      categories[category].push(subCategory);
    }
  }

  if (!name || !category) return alert('Please provide name and category');

  const itemPayload = {
    name, brand, category, subCategory, status, quantity, lowThreshold,
    purchaseDate, expiryDate, openedDate, pao, batchCode, location, worth, worthRemark,
    updatedAt: Date.now()
  };

  if (editingId) {
    const idx = items.findIndex(i => i.id === editingId);
    if (idx !== -1) items[idx] = { ...items[idx], ...itemPayload };
  } else {
    items.push({ id: Date.now(), ...itemPayload });
  }

  saveState();
  resetForm();
  renderCategories();
  renderCategoriesList();
  updateProductSuggestions();
  renderItems();
});

function editItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  editingId = id;
  document.getElementById('name').value = item.name;
  document.getElementById('brand').value = item.brand || '';
  document.getElementById('status').value = item.status || 'In Stock';
  document.getElementById('quantity').value = item.quantity ?? 1;
  document.getElementById('low-threshold').value = item.lowThreshold ?? 1;
  document.getElementById('purchase-date').value = item.purchaseDate || '';
  document.getElementById('expiry-date').value = item.expiryDate || '';
  document.getElementById('opened-date').value = item.openedDate || '';
  document.getElementById('pao').value = item.pao || '';
  document.getElementById('batch-code').value = item.batchCode || '';
  document.getElementById('location').value = item.location || '';
  document.getElementById('worth').value = item.worth || '';
  document.getElementById('worth-remark').value = item.worthRemark || '';

  if (categories[item.category]) {
    categorySelect.value = item.category;
    onCategoryChange();

    if (item.subCategory && categories[item.category].includes(item.subCategory)) {
      subCategorySelect.value = item.subCategory;
      onSubCategoryChange();
    } else if (item.subCategory) {
      subCategorySelect.value = 'Other';
      onSubCategoryChange();
      customSubCategoryInput.value = item.subCategory;
    }
  } else {
    categorySelect.value = 'Other';
    onCategoryChange();
    customCategoryInput.value = item.category || '';
    customSubCategoryInput.value = item.subCategory || '';
  }

  submitBtn.textContent = 'Update Batch / 更新批號';
  cancelBtn.style.display = 'inline-block';
  formHeading.textContent = 'Edit Batch / 編輯批號';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  editingId = null;
  form.reset();
  customCategoryInput.style.display = 'none';
  customSubCategoryInput.style.display = 'none';
  onCategoryChange();
  submitBtn.textContent = 'Add Batch / 新增批號';
  cancelBtn.style.display = 'none';
  formHeading.textContent = 'Add Product Batch / 新增產品批號';
}

function deleteItem(id) {
  if (confirm('Delete this batch entry?')) {
    items = items.filter(i => i.id !== id);
    saveState();
    updateProductSuggestions();
    renderItems();
  }
}

function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ items, categories }, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `CheckItYourShelf_Backup_${new Date().toISOString().split('T')[0]}.json`);
  dlAnchor.click();
}

function importData(e) {
  const fileReader = new FileReader();
  fileReader.onload = function (event) {
    try {
      const parsed = JSON.parse(event.target.result);
      if (parsed.items && parsed.categories) {
        items = parsed.items;
        categories = parsed.categories;
        saveState();
        renderCategories();
        renderCategoriesList();
        updateProductSuggestions();
        renderItems();
        alert('Data imported successfully!');
      }
    } catch (err) {
      alert('Invalid backup file format');
    }
  };
  fileReader.readAsText(e.target.files[0]);
}

function saveState() {
  localStorage.setItem('items', JSON.stringify(items));
  localStorage.setItem('categories', JSON.stringify(categories));
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
}

function escapeJsStr(str) {
  return String(str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Web Notifications Logic
function updateNotificationButtonUI() {
  const btn = document.getElementById('notify-toggle-btn');
  if (!btn) return;

  if (!('Notification' in window)) {
    btn.textContent = '🔔 Notifications Not Supported';
    btn.disabled = true;
    return;
  }

  if (Notification.permission === 'granted') {
    btn.textContent = '🔔 Notifications Active';
    btn.style.backgroundColor = '#e5f9e5';
    btn.style.color = '#248a3d';
  } else if (Notification.permission === 'denied') {
    btn.textContent = '🔕 Notifications Blocked in Settings';
    btn.style.backgroundColor = '#ffe5e5';
    btn.style.color = '#c02b21';
  } else {
    btn.textContent = '🔔 Enable Notifications';
    btn.style.backgroundColor = '#e5e5ea';
    btn.style.color = '#1c1c1e';
  }
}

function toggleNotificationPermission() {
  if (!('Notification' in window)) {
    alert('This browser does not support web notifications.');
    return;
  }

  if (Notification.permission === 'granted') {
    alert('Notifications are already active!');
    return;
  }

  if (Notification.permission === 'denied') {
    alert('Notifications are blocked by your browser settings.');
    return;
  }

  Notification.requestPermission().then(permission => {
    updateNotificationButtonUI();
    if (permission === 'granted') {
      checkAndSendExpiryNotifications();
    }
  });
}

function checkAndSendExpiryNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const lastCheck = localStorage.getItem('lastNotificationCheck');
  const now = Date.now();
  if (lastCheck && now - parseInt(lastCheck, 10) < 12 * 60 * 60 * 1000) {
    return;
  }

  const thresholdDays = 30;
  const expiringItems = [];

  items.forEach(item => {
    if (item.status === 'Finished') return;

    const paoExpiry = calculatePaoExpiry(item.openedDate, item.pao);
    const effectiveExpiry = item.expiryDate || paoExpiry;
    const daysLeft = effectiveExpiry ? getDaysRemaining(effectiveExpiry) : null;

    if (daysLeft !== null && daysLeft <= thresholdDays) {
      expiringItems.push({
        name: item.name,
        brand: item.brand,
        daysLeft: daysLeft,
        expiryDate: effectiveExpiry
      });
    }
  });

  if (expiringItems.length > 0) {
    localStorage.setItem('lastNotificationCheck', now.toString());
    expiringItems.sort((a, b) => a.daysLeft - b.daysLeft);

    const title = `⚠️ ${expiringItems.length} Product(s) Expiring Soon!`;
    const bodyLines = expiringItems.slice(0, 3).map(i => {
      const brandStr = i.brand ? `${i.brand} ` : '';
      const statusText = i.daysLeft < 0 ? `Expired ${Math.abs(i.daysLeft)}d ago` : `Expires in ${i.daysLeft}d`;
      return `• ${brandStr}${i.name}: ${statusText}`;
    });

    if (expiringItems.length > 3) {
      bodyLines.push(`...and ${expiringItems.length - 3} more item(s).`);
    }

    const notification = new Notification(title, {
      body: bodyLines.join('\n'),
      icon: 'https://cdn-icons-png.flaticon.com/512/3602/3602123.png',
      tag: 'expiry-alert'
    });

    notification.onclick = function() {
      window.focus();
      this.close();
    };
  }
}

// Startup Initialization
renderCategories();
renderCategoriesList();
updateProductSuggestions();
renderItems();
updateNotificationButtonUI();

if (Notification.permission === 'granted') {
  checkAndSendExpiryNotifications();
}