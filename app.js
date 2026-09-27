// LocalStorage Keys
const STORAGE_KEY_ITEMS = 'shelflife_items';
const STORAGE_KEY_CATEGORIES = 'shelflife_categories';

// Initial Default Categories
const defaultCategories = {
  "Skincare / 護膚": ["Sunscreen / 防曬", "Serum / 精華", "Cleanser / 潔面", "Moisturizer / 面霜"],
  "Laundry / 洗衣": ["Detergent / 洗衣液", "Softener / 柔順劑"]
};

let items = JSON.parse(localStorage.getItem(STORAGE_KEY_ITEMS)) || [];
let categoriesData = JSON.parse(localStorage.getItem(STORAGE_KEY_CATEGORIES)) || defaultCategories;

let activeTab = 'ALL';
let activeLocationFilter = 'ALL';
let editItemId = null;
let editBatchId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initCategories();
  renderCategoryManager();
  renderItems();
  updateDashboard();
  updateDatalist();
  
  document.getElementById('item-form').addEventListener('submit', handleFormSubmit);
});

// View Navigation System
function showView(viewName) {
  const views = ['home', 'add', 'browse', 'catalog'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = (v === viewName) ? 'block' : 'none';
  });

  const subNav = document.getElementById('subpage-nav');
  if (subNav) {
    subNav.style.display = (viewName === 'home') ? 'none' : 'block';
  }

  if (viewName === 'browse') {
    initBrowseView();
  } else if (viewName === 'catalog') {
    renderItems();
  }
}

function showCatalogWithFilter(filterType) {
  showView('catalog');
  const buttons = document.querySelectorAll('.tabs .tab-btn');
  buttons.forEach(btn => {
    if ((filterType === 'ALL' && btn.innerText.includes('All')) ||
        (filterType === 'LOW_STOCK' && btn.innerText.includes('Low')) ||
        (filterType === 'EXPIRING' && btn.innerText.includes('Expiring')) ||
        (filterType === 'FINISHED' && btn.innerText.includes('Finished'))) {
      setTab(filterType, btn);
    }
  });
}

/* Category Management Functions */
function initCategories() {
  const catSelect = document.getElementById('category');
  const filterCatSelect = document.getElementById('filter-category');
  
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

  if (subCatSelect.value === 'NEW') {
    customSubCatInput.style.display = 'block';
  } else {
    customSubCatInput.style.display = 'none';
  }
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
            <button class="btn-delete-cat" onclick="deleteCategory('${cat}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html || '<p class="empty-msg">No custom categories added.</p>';
}

function deleteCategory(catName) {
  if (confirm(`Are you sure you want to delete category "${catName}"?`)) {
    delete categoriesData[catName];
    saveCategories();
    initCategories();
    renderCategoryManager();
  }
}

function saveCategories() {
  localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categoriesData));
}

/* Save / Edit Item & Batch Handle */
function handleFormSubmit(e) {
  e.preventDefault();

  let category = document.getElementById('category').value;
  let subCategory = document.getElementById('sub-category').value;

  if (category === 'NEW') {
    category = document.getElementById('custom-category').value.trim();
    if (!category) return alert('Please enter a custom category name');
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
    id: editBatchId || Date.now().toString(),
    batchCode: document.getElementById('batch-code').value.trim(),
    quantity: parseInt(document.getElementById('quantity').value) || 0,
    status: document.getElementById('status').value,
    purchaseDate: document.getElementById('purchase-date').value,
    openedDate: document.getElementById('opened-date').value,
    expiryDate: document.getElementById('expiry-date').value,
    pao: document.getElementById('pao').value,
    location: document.getElementById('location').value.trim(),
    worth: document.getElementById('worth').value,
    worthRemark: document.getElementById('worth-remark').value.trim()
  };

  let product = items.find(i => i.id === editItemId || (i.name.toLowerCase() === name.toLowerCase() && i.brand.toLowerCase() === brand.toLowerCase()));

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
      id: Date.now().toString(),
      name,
      brand,
      size,
      category,
      subCategory,
      lowThreshold,
      batches: [batchData]
    };
    items.push(product);
  }

  saveItems();
  resetForm();
  showView('catalog');
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
  updateDashboard();
  updateDatalist();
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

function updateDatalist() {
  const datalist = document.getElementById('product-suggestions');
  if (!datalist) return;
  
  const names = [...new Set(items.map(i => i.name))];
  datalist.innerHTML = names.map(n => `<option value="${n}">`).join('');
}

function updateDashboard() {
  let totalActive = 0;
  let lowStockCount = 0;
  let expiringSoonCount = 0;
  let finishedCount = 0;

  const today = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(today.getDate() + 30);

  items.forEach(product => {
    const activeBatches = product.batches.filter(b => b.status !== 'Finished');
    const productActiveQty = activeBatches.reduce((acc, b) => acc + (b.quantity || 0), 0);
    
    totalActive += productActiveQty;

    if (productActiveQty <= product.lowThreshold && activeBatches.length > 0) {
      lowStockCount++;
    }

    product.batches.forEach(b => {
      if (b.status === 'Finished') {
        finishedCount++;
      } else if (b.expiryDate) {
        const exp = new Date(b.expiryDate);
        if (exp <= thirtyDaysLater) {
          expiringSoonCount++;
        }
      }
    });
  });

  if (document.getElementById('dash-total')) document.getElementById('dash-total').innerText = totalActive;
  if (document.getElementById('dash-low')) document.getElementById('dash-low').innerText = lowStockCount;
  if (document.getElementById('dash-expiring')) document.getElementById('dash-expiring').innerText = expiringSoonCount;
  if (document.getElementById('dash-finished')) document.getElementById('dash-finished').innerText = finishedCount;
}

/* Category Browser Navigation Logic */
function initBrowseView() {
  const container1 = document.getElementById('main-cat-buttons');
  const container2 = document.getElementById('sub-cat-buttons');
  const step2 = document.getElementById('browse-step-2');
  const results = document.getElementById('browse-results');

  step2.style.display = 'none';
  results.innerHTML = '';

  let html = '';
  Object.keys(categoriesData).forEach(cat => {
    html += `<button type="button" class="tab-btn" onclick="selectBrowseMain('${cat}', this)">${cat}</button>`;
  });

  container1.innerHTML = html || '<p class="empty-msg">No categories set up.</p>';
}

function selectBrowseMain(mainCat, btn) {
  document.querySelectorAll('#main-cat-buttons .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const container2 = document.getElementById('sub-cat-buttons');
  const step2 = document.getElementById('browse-step-2');

  const subs = categoriesData[mainCat] || [];
  let html = `<button type="button" class="tab-btn" onclick="filterBrowseResults('${mainCat}', 'ALL', this)">All ${mainCat}</button>`;
  
  subs.forEach(sub => {
    html += `<button type="button" class="tab-btn" onclick="filterBrowseResults('${mainCat}', '${sub}', this)">${sub}</button>`;
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

  if (filtered.length === 0) {
    results.innerHTML = '<p class="empty-msg">No products found in this category.</p>';
    return;
  }

  results.innerHTML = renderProductListHTML(filtered);
}

/* Inventory Catalog Render & Filter Logic */
function setTab(tab, btn) {
  activeTab = tab;
  document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
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

  let locations = new Set();
  items.forEach(p => {
    p.batches.forEach(b => {
      if (b.location) locations.add(b.location);
    });
  });

  let locArray = Array.from(locations);
  let html = `<button type="button" class="tab-btn ${activeLocationFilter === 'ALL' ? 'active' : ''}" onclick="setLocationFilter('ALL')">All Locations</button>`;

  locArray.forEach(loc => {
    const isActive = activeLocationFilter === loc ? 'active' : '';
    html += `<button type="button" class="tab-btn ${isActive}" onclick="setLocationFilter('${loc}')">📍 ${loc}</button>`;
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
    // Category filters
    if (filterCat !== 'ALL' && product.category !== filterCat) return false;
    if (filterSub !== 'ALL' && product.subCategory !== filterSub) return false;

    // Search text filter includes name, brand, size, category, and batch info
    const searchableText = `${product.name} ${product.brand} ${product.size || ''} ${product.category} ${product.subCategory} ${product.batches.map(b => `${b.batchCode} ${b.location}${b.worthRemark}`).join(' ')}`.toLowerCase();
    if (search && !searchableText.includes(search)) return false;

    // Location filter
    if (activeLocationFilter !== 'ALL') {
      const hasLoc = product.batches.some(b => b.location === activeLocationFilter);
      if (!hasLoc) return false;
    }

    // Status / Alert Tab Filter
    const activeBatches = product.batches.filter(b => b.status !== 'Finished');
    const totalActiveQty = activeBatches.reduce((acc, b) => acc + (b.quantity || 0), 0);

    if (activeTab === 'LOW_STOCK') {
      return totalActiveQty <= product.lowThreshold && activeBatches.length > 0;
    }

    if (activeTab === 'EXPIRING') {
      return product.batches.some(b => b.status !== 'Finished' && b.expiryDate && new Date(b.expiryDate) <= thirtyDaysLater);
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
    return '<p class="empty-msg">No products matching your search criteria.</p>';
  }

  return productList.map(product => {
    const activeBatches = product.batches.filter(b => b.status !== 'Finished');
    const totalQty = activeBatches.reduce((sum, b) => sum + (b.quantity || 0), 0);
    const isLowStock = totalQty <= product.lowThreshold && activeBatches.length > 0;

    const sizeDisplay = product.size ? `• <strong>${product.size}</strong>` : '';

    const batchesHTML = product.batches.map(batch => {
      let statusClass = 'status-in-stock';
      if (batch.status === 'Using') statusClass = 'status-using';
      if (batch.status === 'Finished') statusClass = 'status-finished';

      let worthClass = 'worth-maybe';
      if (batch.worth === 'Yes') worthClass = 'worth-yes';
      if (batch.worth === 'No') worthClass = 'worth-no';

      return `
        <div class="batch-row">
          <div class="batch-main-info">
            <div class="batch-pills">
              <span class="status-badge ${statusClass}">${batch.status}</span>
              <span class="qty-pill">Qty: <strong>${batch.quantity}</strong></span>
              ${batch.batchCode ? `<span class="batch-pill">Lot: ${batch.batchCode}</span>` : ''}
              ${batch.location ? `<span class="batch-pill muted">📍 ${batch.location}</span>` : ''}
            </div>
            
            <div class="batch-dates">
              ${batch.purchaseDate ? `<span>Bought: ${batch.purchaseDate}</span>` : ''}
              ${batch.openedDate ? `<span>Opened: ${batch.openedDate}</span>` : ''}
              ${batch.expiryDate ? `<span>Expires: <strong>${batch.expiryDate}</strong></span>` : ''}
              ${batch.pao ? `<span>PAO: ${batch.pao}M</span>` : ''}
            </div>

            ${batch.worth ? `
              <div class="worth-tag ${worthClass}">
                Repurchase: <strong>${batch.worth}</strong>${batch.worthRemark ? `(${batch.worthRemark})` : ''}
              </div>
            ` : ''}
          </div>

          <div class="batch-actions">
            ${batch.batchCode ? `<button class="btn-search-batch" onclick="searchBatchOnline('${batch.batchCode}', '${product.brand}')">🔍 Check Batch Code</button>` : ''}
            <button class="btn-edit" onclick="editBatch('${product.id}', '${batch.id}')">Edit</button>
            <button class="btn-delete" onclick="deleteBatch('${product.id}', '${batch.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="product-card ${isLowStock ? 'card-low-stock' : ''}">
        <div class="product-header">
          <div>
            <h3>${product.name}</h3>
            <div class="product-sub">
              ${product.brand ? `<strong>${product.brand}</strong> ` : ''}
              ${sizeDisplay}
              <span style="margin-left: 4px; color: var(--text-muted);">[${product.category}${product.subCategory ? ` / ${product.subCategory}` : ''}]</span>
            </div>
          </div>
          <div class="product-header-right">
            <span class="total-qty-badge" style="background:${isLowStock ? '#ffe8e8' : '#e6f9ed'}; color:${isLowStock ? '#d90429' : '#1e7e34'}">
              Total In Stock: ${totalQty}
            </span>
          </div>
        </div>
        <div class="batch-list">
          ${batchesHTML}
        </div>
      </div>
    `;
  }).join('');
}

/* Edit & Delete Batch Functions */
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
  document.getElementById('status').value = batch.status || 'In Stock';
  document.getElementById('purchase-date').value = batch.purchaseDate || '';
  document.getElementById('opened-date').value = batch.openedDate || '';
  document.getElementById('expiry-date').value = batch.expiryDate || '';
  document.getElementById('pao').value = batch.pao || '';
  document.getElementById('location').value = batch.location || '';
  document.getElementById('worth').value = batch.worth || '';
  document.getElementById('worth-remark').value = batch.worthRemark || '';

  document.getElementById('form-heading').innerText = "Edit Product Batch / 編輯批號資訊";
  document.getElementById('submit-btn').innerText = "Update Batch / 更新批號";
  document.getElementById('cancel-btn').style.display = "inline-block";

  showView('add');
}

function deleteBatch(productId, batchId) {
  if (!confirm('Are you sure you want to delete this batch?')) return;

  const product = items.find(p => p.id === productId);
  if (!product) return;

  product.batches = product.batches.filter(b => b.id !== batchId);

  if (product.batches.length === 0) {
    items = items.filter(p => p.id !== productId);
  }

  saveItems();
  renderItems();
}

function searchBatchOnline(batchCode, brand) {
  const query = encodeURIComponent(`${brand} ${batchCode} batch code calculator`);
  window.open(`https://www.google.com/search?q=${query}`, '_blank');
}

/* Import / Export JSON */
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ items, categoriesData }, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `shelflife_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importData(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.items && Array.isArray(parsed.items)) {
        items = parsed.items;
        if (parsed.categoriesData) categoriesData = parsed.categoriesData;
        saveItems();
        saveCategories();
        initCategories();
        renderCategoryManager();
        renderItems();
        alert('Data imported successfully!');
      } else {
        alert('Invalid data file format.');
      }
    } catch (err) {
      alert('Error parsing JSON file.');
    }
  };
  fileReader.readAsText(event.target.files[0]);
}
