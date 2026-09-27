// State Management
let items = JSON.parse(localStorage.getItem('shelf_items')) || [];
let categories = JSON.parse(localStorage.getItem('shelf_categories')) || [
  { name: 'Skincare / 護膚', subCategories: ['Sunscreen / 防曬', 'Serum / 精華', 'Cleanser / 潔面', 'Moisturizer / 面霜'] },
  { name: 'Laundry / 洗衣', subCategories: ['Detergent / 洗衣液', 'Softener / 柔順劑'] }
];

let editingItemId = null;
let currentTab = 'ALL';
let currentLocationFilter = 'ALL';
let activeBrowseMain = null;
let activeBrowseSub = 'ALL';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  populateCategoriesUI();
  renderCategoryList();
  renderProductSuggestions();
  renderItems();
  updateDashboard();

  showView('home');

  document.getElementById('item-form').addEventListener('submit', handleFormSubmit);
});

// View Navigation Router
function showView(viewName) {
  document.getElementById('view-home').style.display = 'none';
  document.getElementById('view-add').style.display = 'none';
  document.getElementById('view-browse').style.display = 'none';
  document.getElementById('view-catalog').style.display = 'none';

  document.getElementById('subpage-nav').style.display = (viewName === 'home') ? 'none' : 'block';

  if (viewName === 'home') {
    document.getElementById('view-home').style.display = 'block';
    updateDashboard();
  } else if (viewName === 'add') {
    document.getElementById('view-add').style.display = 'block';
  } else if (viewName === 'browse') {
    document.getElementById('view-browse').style.display = 'block';
    renderCategoryBrowser();
  } else if (viewName === 'catalog') {
    document.getElementById('view-catalog').style.display = 'block';
    renderLocationChips();
    renderItems();
  }
}

function showCatalogWithFilter(filterTab) {
  showView('catalog');
  currentTab = filterTab;
  const targetBtn = Array.from(document.querySelectorAll('.tabs .tab-btn')).find(b => b.innerText.includes(filterTab) || (filterTab === 'ALL' && b.innerText.includes('All Products')));
  if (targetBtn) {
    document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
    targetBtn.classList.add('active');
  }
  renderItems();
}

// 1. Visual Dashboard Calculator
function updateDashboard() {
  const activeItems = items.filter(i => i.status !== 'Finished');
  const lowStock = items.filter(i => i.quantity < i.lowThreshold && i.status !== 'Finished');
  
  const expiringSoon = items.filter(i => {
    if (!i.expiryDate || i.status === 'Finished') return false;
    const days = (new Date(i.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return days <= 60;
  });

  const finished = items.filter(i => i.status === 'Finished');

  document.getElementById('dash-total').innerText = activeItems.length;
  document.getElementById('dash-low').innerText = lowStock.length;
  document.getElementById('dash-expiring').innerText = expiringSoon.length;
  document.getElementById('dash-finished').innerText = finished.length;
}

// 2. Storage Location Filter Chips
function renderLocationChips() {
  const chipsContainer = document.getElementById('location-chips');
  chipsContainer.innerHTML = '';

  const locations = ['ALL', ...new Set(items.map(i => i.location).filter(Boolean))];

  locations.forEach(loc => {
    const btn = document.createElement('button');
    btn.className = `tab-btn ${currentLocationFilter === loc ? 'active' : ''}`;
    btn.innerText = loc === 'ALL' ? 'All Locations' : loc;
    btn.onclick = () => {
      currentLocationFilter = loc;
      renderLocationChips();
      renderItems();
    };
    chipsContainer.appendChild(btn);
  });
}

// 3. Quick Action Buttons Logic
function markOpenedToday(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  
  const today = new Date().toISOString().slice(0, 10);
  item.openedDate = today;
  item.status = 'Using';

  // Auto-calculate PAO expiry if PAO months present
  if (item.pao && !item.expiryDate) {
    const exp = new Date();
    exp.setMonth(exp.getMonth() + parseInt(item.pao));
    item.expiryDate = exp.toISOString().slice(0, 10);
  }

  saveItems();
  renderItems();
}

function decrementQuantity(id) {
  const item = items.find(i => i.id === id);
  if (!item || item.quantity <= 0) return;
  
  item.quantity -= 1;
  if (item.quantity === 0) {
    item.status = 'Finished';
  }
  
  saveItems();
  renderItems();
}

function markFinished(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  
  item.status = 'Finished';
  item.quantity = 0;
  
  saveItems();
  renderItems();
}

// Guided Category Browser Logic
function renderCategoryBrowser() {
  const mainGrid = document.getElementById('main-cat-buttons');
  const subStep = document.getElementById('browse-step-2');
  const resultsDiv = document.getElementById('browse-results');

  mainGrid.innerHTML = '';
  subStep.style.display = 'none';
  resultsDiv.innerHTML = '<p class="empty-msg">Select a main category above to view items.</p>';

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.innerText = cat.name;
    btn.onclick = () => {
      document.querySelectorAll('#main-cat-buttons .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectMainCategory(cat);
    };
    mainGrid.appendChild(btn);
  });
}

function selectMainCategory(catObj) {
  activeBrowseMain = catObj.name;
  activeBrowseSub = 'ALL';

  const subGrid = document.getElementById('sub-cat-buttons');
  const subStep = document.getElementById('browse-step-2');
  subGrid.innerHTML = '';
  subStep.style.display = 'block';

  const allBtn = document.createElement('button');
  allBtn.className = 'tab-btn active';
  allBtn.innerText = 'All Sub-categories';
  allBtn.onclick = () => {
    document.querySelectorAll('#sub-cat-buttons .tab-btn').forEach(b => b.classList.remove('active'));
    allBtn.classList.add('active');
    activeBrowseSub = 'ALL';
    renderBrowseResults();
  };
  subGrid.appendChild(allBtn);

  catObj.subCategories.forEach(sub => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.innerText = sub;
    btn.onclick = () => {
      document.querySelectorAll('#sub-cat-buttons .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeBrowseSub = sub;
      renderBrowseResults();
    };
    subGrid.appendChild(btn);
  });

  renderBrowseResults();
}

function renderBrowseResults() {
  const resultsDiv = document.getElementById('browse-results');
  resultsDiv.innerHTML = '';

  const filtered = items.filter(item => {
    const matchMain = item.category === activeBrowseMain;
    const matchSub = activeBrowseSub === 'ALL' || item.subCategory === activeBrowseSub;
    return matchMain && matchSub;
  });

  if (filtered.length === 0) {
    resultsDiv.innerHTML = '<p class="empty-msg">No items found in this category.</p>';
    return;
  }

  const grouped = groupItemsByProduct(filtered);
  Object.keys(grouped).forEach(key => {
    const card = createProductCard(grouped[key]);
    resultsDiv.appendChild(card);
  });
}

// Category Management UI
function populateCategoriesUI() {
  const catSelect = document.getElementById('category');
  const filterCatSelect = document.getElementById('filter-category');

  catSelect.innerHTML = '<option value="">-- Select Category --</option><option value="NEW">+ Add New Category</option>';
  filterCatSelect.innerHTML = '<option value="ALL">All Categories</option>';

  categories.forEach(c => {
    catSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    filterCatSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
  });
}

function onCategoryChange() {
  const catVal = document.getElementById('category').value;
  const customCatInput = document.getElementById('custom-category');
  const subCatSelect = document.getElementById('sub-category');

  if (catVal === 'NEW') {
    customCatInput.style.display = 'block';
    customCatInput.required = true;
    subCatSelect.innerHTML = '<option value="">-- Select Sub-category --</option><option value="NEW">+ Add New Sub-category</option>';
  } else {
    customCatInput.style.display = 'none';
    customCatInput.required = false;
    
    const catObj = categories.find(c => c.name === catVal);
    subCatSelect.innerHTML = '<option value="">-- Select Sub-category --</option><option value="NEW">+ Add New Sub-category</option>';
    if (catObj && catObj.subCategories) {
      catObj.subCategories.forEach(sub => {
        subCatSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
      });
    }
  }
}

function onSubCategoryChange() {
  const subVal = document.getElementById('sub-category').value;
  const customSubInput = document.getElementById('custom-sub-category');
  customSubInput.style.display = subVal === 'NEW' ? 'block' : 'none';
}

function onFilterCategoryChange() {
  const catVal = document.getElementById('filter-category').value;
  const filterSubSelect = document.getElementById('filter-sub-category');
  filterSubSelect.innerHTML = '<option value="ALL">All Sub-categories</option>';

  if (catVal !== 'ALL') {
    const catObj = categories.find(c => c.name === catVal);
    if (catObj && catObj.subCategories) {
      catObj.subCategories.forEach(sub => {
        filterSubSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
      });
    }
  }
  renderItems();
}

function renderCategoryList() {
  const container = document.getElementById('categories-list');
  container.innerHTML = '';

  categories.forEach((c, index) => {
    const div = document.createElement('div');
    div.className = 'category-group';
    div.innerHTML = `
      <div class="category-item">
        <div>
          <strong>${c.name}</strong>
          <div class="sub-category-pills">
            ${c.subCategories.map(s => `<span class="sub-cat-pill">${s}</span>`).join('')}
          </div>
        </div>
        <div class="category-actions">
          <button type="button" class="btn-delete-cat" onclick="deleteCategory(${index})">Delete</button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

function deleteCategory(index) {
  if (confirm('Are you sure you want to delete this category?')) {
    categories.splice(index, 1);
    saveCategories();
    populateCategoriesUI();
    renderCategoryList();
  }
}

function saveCategories() {
  localStorage.setItem('shelf_categories', JSON.stringify(categories));
}

function renderProductSuggestions() {
  const datalist = document.getElementById('product-suggestions');
  datalist.innerHTML = '';
  const names = [...new Set(items.map(i => i.name))];
  names.forEach(n => datalist.innerHTML += `<option value="${n}">`);
}

// Form Handlers
function handleFormSubmit(e) {
  e.preventDefault();

  let categoryVal = document.getElementById('category').value;
  if (categoryVal === 'NEW') categoryVal = document.getElementById('custom-category').value.trim();

  let subCategoryVal = document.getElementById('sub-category').value;
  if (subCategoryVal === 'NEW') subCategoryVal = document.getElementById('custom-sub-category').value.trim();

  if (categoryVal) {
    let catObj = categories.find(c => c.name === categoryVal);
    if (!catObj) {
      catObj = { name: categoryVal, subCategories: [] };
      categories.push(catObj);
    }
    if (subCategoryVal && !catObj.subCategories.includes(subCategoryVal)) {
      catObj.subCategories.push(subCategoryVal);
    }
    saveCategories();
    populateCategoriesUI();
    renderCategoryList();
  }

  const newItem = {
    id: editingItemId || Date.now().toString(),
    name: document.getElementById('name').value.trim(),
    brand: document.getElementById('brand').value.trim(),
    category: categoryVal,
    subCategory: subCategoryVal,
    lowThreshold: parseInt(document.getElementById('low-threshold').value) || 1,
    batchCode: document.getElementById('batch-code').value.trim(),
    quantity: parseInt(document.getElementById('quantity').value) || 0,
    status: document.getElementById('status').value,
    purchaseDate: document.getElementById('purchase-date').value,
    openedDate: document.getElementById('opened-date').value,
    expiryDate: document.getElementById('expiry-date').value,
    pao: parseInt(document.getElementById('pao').value) || null,
    location: document.getElementById('location').value.trim(),
    worth: document.getElementById('worth').value,
    worthRemark: document.getElementById('worth-remark').value.trim()
  };

  if (editingItemId) {
    const idx = items.findIndex(i => i.id === editingItemId);
    if (idx !== -1) items[idx] = newItem;
  } else {
    items.push(newItem);
  }

  saveItems();
  resetForm();
  renderItems();
  renderProductSuggestions();
  showView('catalog');
}

function resetForm() {
  editingItemId = null;
  document.getElementById('item-form').reset();
  document.getElementById('form-heading').innerText = 'Add Product Batch / 新增產品批號';
  document.getElementById('submit-btn').innerText = 'Add Batch / 新增批號';
  document.getElementById('cancel-btn').style.display = 'none';
  document.getElementById('custom-category').style.display = 'none';
  document.getElementById('custom-sub-category').style.display = 'none';
}

function editItem(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  editingItemId = item.id;
  document.getElementById('form-heading').innerText = 'Edit Product Batch / 編輯批號';
  document.getElementById('submit-btn').innerText = 'Update Batch / 更新批號';
  document.getElementById('cancel-btn').style.display = 'block';

  document.getElementById('name').value = item.name || '';
  document.getElementById('brand').value = item.brand || '';
  document.getElementById('category').value = item.category || '';
  onCategoryChange();
  document.getElementById('sub-category').value = item.subCategory || '';

  document.getElementById('low-threshold').value = item.lowThreshold || 1;
  document.getElementById('batch-code').value = item.batchCode || '';
  document.getElementById('quantity').value = item.quantity || 0;
  document.getElementById('status').value = item.status || 'In Stock';
  document.getElementById('purchase-date').value = item.purchaseDate || '';
  document.getElementById('opened-date').value = item.openedDate || '';
  document.getElementById('expiry-date').value = item.expiryDate || '';
  document.getElementById('pao').value = item.pao || '';
  document.getElementById('location').value = item.location || '';
  document.getElementById('worth').value = item.worth || '';
  document.getElementById('worth-remark').value = item.worthRemark || '';

  showView('add');
}

function deleteItem(id) {
  if (confirm('Are you sure you want to delete this batch item?')) {
    items = items.filter(i => i.id !== id);
    saveItems();
    renderItems();
  }
}

function saveItems() {
  localStorage.setItem('shelf_items', JSON.stringify(items));
}

// Catalog Rendering with Quick Buttons
function setTab(tab, btnElement) {
  currentTab = tab;
  document.querySelectorAll('.tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
  renderItems();
}

function groupItemsByProduct(itemList) {
  const groups = {};
  itemList.forEach(item => {
    const key = `${item.name.toLowerCase()}_${(item.brand || '').toLowerCase()}`;
    if (!groups[key]) {
      groups[key] = {
        name: item.name,
        brand: item.brand,
        category: item.category,
        subCategory: item.subCategory,
        lowThreshold: item.lowThreshold,
        batches: []
      };
    }
    groups[key].batches.push(item);
  });
  return groups;
}

function createProductCard(group) {
  const totalQty = group.batches.reduce((sum, b) => sum + (b.status !== 'Finished' ? b.quantity : 0), 0);
  const isLowStock = totalQty < group.lowThreshold;

  const card = document.createElement('div');
  card.className = `product-card ${isLowStock ? 'card-low-stock' : ''}`;

  let batchRowsHtml = '';
  group.batches.forEach(b => {
    const statusClass = b.status === 'In Stock' ? 'status-in-stock' : (b.status === 'Using' ? 'status-using' : 'status-finished');
    
    batchRowsHtml += `
      <div class="batch-row">
        <div class="batch-main-info">
          <div class="batch-pills">
            <span class="status-badge ${statusClass}">${b.status}</span>
            <span class="qty-pill">Qty: ${b.quantity}</span>
            <span class="batch-pill ${!b.batchCode ? 'muted' : ''}">Batch: ${b.batchCode || 'N/A'}</span>
            ${b.batchCode ? `<button type="button" class="btn-search-batch" onclick="searchBatchOnline('${b.batchCode}', '${group.brand}')">🔍 Check</button>` : ''}
          </div>
          
          <div class="batch-dates">
            ${b.openedDate ? `<span>Opened: ${b.openedDate}</span>` : ''}
            ${b.expiryDate ? `<span>Exp: ${b.expiryDate}</span>` : ''}
            ${b.location ? `<span>📍 ${b.location}</span>` : ''}
          </div>

          <!-- Batch Quick Actions -->
          <div class="quick-btn-group">
            ${!b.openedDate ? `<button type="button" class="btn-quick" onclick="markOpenedToday('${b.id}')">✨ Mark Opened Today</button>` : ''}
            <button type="button" class="btn-quick" onclick="decrementQuantity('${b.id}')">➖ Consume 1 Qty</button>
            <button type="button" class="btn-quick" onclick="markFinished('${b.id}')">✔️ Mark Finished</button>
          </div>

          ${b.worth ? `<div class="worth-tag worth-${b.worth.toLowerCase()}">Worth Repurchasing: ${b.worth}${b.worthRemark ? `(${b.worthRemark})` : ''}</div>` : ''}
        </div>
        <div class="batch-actions">
          <button type="button" class="btn-edit" onclick="editItem('${b.id}')">Edit</button>
          <button type="button" class="btn-delete" onclick="deleteItem('${b.id}')">Delete</button>
        </div>
      </div>
    `;
  });

  card.innerHTML = `
    <div class="product-header">
      <div>
        <h3>${group.name}</h3>
        <div class="product-sub">${group.brand ? group.brand + ' • ' : ''}${group.category || ''} ${group.subCategory ? '> ' + group.subCategory : ''}</div>
      </div>
      <div class="product-header-right">
        <span class="total-qty-badge" style="background:${isLowStock ? '#ffe5e5' : '#e5f9e5'}; color:${isLowStock ? '#ff3b30' : '#248a3d'};">
          ${isLowStock ? '⚠️ Low Stock: ' : 'In Stock: '}${totalQty}
        </span>
      </div>
    </div>
    <div class="batch-list">
      ${batchRowsHtml}
    </div>
  `;

  return card;
}

function renderItems() {
  const container = document.getElementById('items-list');
  if (!container) return;
  
  container.innerHTML = '';

  const searchVal = document.getElementById('search-input').value.toLowerCase();
  const catFilter = document.getElementById('filter-category').value;
  const subCatFilter = document.getElementById('filter-sub-category').value;

  const filtered = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchVal) ||
                          (item.brand && item.brand.toLowerCase().includes(searchVal)) ||
                          (item.batchCode && item.batchCode.toLowerCase().includes(searchVal)) ||
                          (item.location && item.location.toLowerCase().includes(searchVal)) ||
                          (item.worthRemark && item.worthRemark.toLowerCase().includes(searchVal));

    const matchesCat = catFilter === 'ALL' || item.category === catFilter;
    const matchesSubCat = subCatFilter === 'ALL' || item.subCategory === subCatFilter;
    const matchesLoc = currentLocationFilter === 'ALL' || item.location === currentLocationFilter;

    let matchesTab = true;
    if (currentTab === 'LOW_STOCK') {
      matchesTab = item.quantity < item.lowThreshold && item.status !== 'Finished';
    } else if (currentTab === 'EXPIRING') {
      if (!item.expiryDate) return false;
      const days = (new Date(item.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
      matchesTab = days <= 60 && item.status !== 'Finished';
    } else if (currentTab === 'FINISHED') {
      matchesTab = item.status === 'Finished';
    }

    return matchesSearch && matchesCat && matchesSubCat && matchesLoc && matchesTab;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-msg">No matching items found.</p>';
    return;
  }

  const grouped = groupItemsByProduct(filtered);
  Object.keys(grouped).forEach(key => {
    const card = createProductCard(grouped[key]);
    container.appendChild(card);
  });
}

function searchBatchOnline(batchCode, brand) {
  const query = encodeURIComponent(`${brand} batch code ${batchCode} checkfresh checkcosmetic`);
  window.open(`https://www.google.com/search?q=${query}`, '_blank');
}

function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ items, categories }, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `shelf_backup_${new Date().toISOString().slice(0,10)}.json`);
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
        if (parsed.categories) categories = parsed.categories;
        saveItems();
        saveCategories();
        populateCategoriesUI();
        renderCategoryList();
        renderItems();
        alert('Data imported successfully!');
      } else {
        alert('Invalid file format.');
      }
    } catch (err) {
      alert('Error parsing JSON file.');
    }
  };
  fileReader.readAsText(event.target.files[0]);
}

function toggleNotificationPermission() {
  if (!("Notification" in window)) {
    alert("This browser does not support web notifications.");
    return;
  }
  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      alert("Notifications enabled!");
    }
  });
}