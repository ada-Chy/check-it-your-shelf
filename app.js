/* ==========================================================================
   State & Local Storage Initialization
   ========================================================================== */
let products = JSON.parse(localStorage.getItem('products')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || [
  { id: 'c1', name: 'Skincare', subcategories: ['Cleanser', 'Moisturizer', 'Sunscreen'] },
  { id: 'c2', name: 'Supplements', subcategories: ['Vitamins', 'Protein'] }
];
let rooms = JSON.parse(localStorage.getItem('rooms')) || [
  { id: 'r1', name: 'Bathroom', spots: ['Cabinet', 'Counter'] },
  { id: 'r2', name: 'Bedroom', spots: ['Vanity', 'Closet'] }
];

let currentLang = localStorage.getItem('appLang') || 'en';
let activeStatusFilter = 'all';
const HOUSEHOLD_DOC_ID = "main_household_data"; // Fixed Firestore document ID for shared household sync

/* ==========================================================================
   Firebase Firestore Cloud Syncing
   ========================================================================== */

// Real-Time Cloud Listener (Receives changes from iPhone, iPad, MacBook instantly)
function listenToCloudChanges() {
  if (!window.db) {
    setTimeout(listenToCloudChanges, 500); // Retry until Firebase loads
    return;
  }

  const docRef = window.firestoreDoc(window.db, "inventories", HOUSEHOLD_DOC_ID);

  window.firestoreOnSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const cloudData = docSnap.data();

      // Synchronize cloud data to memory
      products = cloudData.products || [];
      categories = cloudData.categories || [];
      rooms = cloudData.rooms || [];

      // Save local offline backups
      saveToLocal();

      // Refresh current UI view
      renderAllViews();
    }
  }, (error) => {
    console.error("Firestore Listen Error:", error);
  });
}

// Push local modifications up to Firestore
async function saveToCloud() {
  saveToLocal();

  if (!window.db) return;

  try {
    const docRef = window.firestoreDoc(window.db, "inventories", HOUSEHOLD_DOC_ID);
    await window.firestoreSetDoc(docRef, {
      products: products,
      categories: categories,
      rooms: rooms,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Cloud push failed:", error);
  }
}

// Save backup to browser LocalStorage
function saveToLocal() {
  localStorage.setItem('products', JSON.stringify(products));
  localStorage.setItem('categories', JSON.stringify(categories));
  localStorage.setItem('rooms', JSON.stringify(rooms));
}

/* ==========================================================================
   Navigation & UI State Handlers
   ========================================================================== */
function switchTab(tabId) {
  document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

  const targetView = document.getElementById(`view-${tabId}`);
  if (targetView) targetView.classList.add('active');

  const navButtons = document.querySelectorAll('.tab-btn');
  const tabs = ['dashboard', 'inventory', 'add-product', 'categories', 'locations', 'reorder', 'settings'];
  const index = tabs.indexOf(tabId);
  if (index !== -1 && navButtons[index]) navButtons[index].classList.add('active');

  renderAllViews();
}

function filterAndNavigate(filterType) {
  switchTab('inventory');
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';

  if (filterType === 'all') setStatusFilter('all');
  else setStatusFilter(filterType);
}

function setStatusFilter(status, element) {
  activeStatusFilter = status;
  if (element) {
    document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
    element.classList.add('active');
  }
  renderInventory();
}

function renderAllViews() {
  renderDashboard();
  renderInventory();
  renderCategoryManager();
  renderLocationManager();
  renderReorderList();
  populateDropdowns();
  updateDatalists();
}

/* ==========================================================================
   Dashboard Metrics
   ========================================================================== */
function renderDashboard() {
  const total = products.length;
  const low = products.filter(p => Number(p.quantity) <= 1).length;

  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(now.getDate() + 30);

  let expiring = 0;
  let expired = 0;

  products.forEach(p => {
    if (p.expiryDate) {
      const exp = new Date(p.expiryDate);
      if (exp < now) expired++;
      else if (exp <= thirtyDaysLater) expiring++;
    }
  });

  document.getElementById('metric-total').textContent = total;
  document.getElementById('metric-low').textContent = low;
  document.getElementById('metric-expiring').textContent = expiring;
  document.getElementById('metric-expired').textContent = expired;
}

/* ==========================================================================
   Inventory List & Product Cards
   ========================================================================== */
function renderInventory() {
  const container = document.getElementById('product-list-container');
  if (!container) return;

  const searchTerm = (document.getElementById('search-input')?.value || '').toLowerCase();
  const now = new Date();
  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(now.getDate() + 30);

  const filtered = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm) || 
                          (p.brand || '').toLowerCase().includes(searchTerm);
    
    let matchesStatus = true;
    if (activeStatusFilter === 'low') matchesStatus = Number(p.quantity) <= 1;
    else if (activeStatusFilter === 'expiring') {
      if (!p.expiryDate) matchesStatus = false;
      else {
        const exp = new Date(p.expiryDate);
        matchesStatus = exp >= now && exp <= thirtyDaysLater;
      }
    } else if (activeStatusFilter === 'expired') {
      if (!p.expiryDate) matchesStatus = false;
      else matchesStatus = new Date(p.expiryDate) < now;
    } else if (activeStatusFilter !== 'all') {
      matchesStatus = p.status === activeStatusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  container.innerHTML = filtered.map(p => {
    const isLow = Number(p.quantity) <= 1;
    const catObj = categories.find(c => c.id === p.categoryId);
    const roomObj = rooms.find(r => r.id === p.roomId);

    return `
      <div class="product-card ${isLow ? 'low-stock-border' : ''}">
        <div class="card-header">
          <h3>${escapeHtml(p.name)}</h3>
          <span class="status-pill status-${(p.status || 'instock').toLowerCase().replace(' ', '')}">${escapeHtml(p.status)}</span>
        </div>
        <p class="card-sub">${escapeHtml(p.brand || 'No Brand')} ${p.size ? '• ' + escapeHtml(p.size) : ''}</p>
        <div class="card-details">
          <p><strong>Category:</strong> ${escapeHtml(catObj ? catObj.name : 'Unassigned')} ${p.subCategory ? '(' + escapeHtml(p.subCategory) + ')' : ''}</p>
          <p><strong>Location:</strong> ${escapeHtml(roomObj ? roomObj.name : 'Unassigned')} ${p.spot ? '(' + escapeHtml(p.spot) + ')' : ''}</p>
          <p><strong>Price:</strong> $${p.price ? Number(p.price).toFixed(2) : '0.00'}</p>
          <p><strong>Expires:</strong> ${p.expiryDate || 'N/A'}</p>
        </div>
        <div class="card-actions">
          <div class="qty-adjuster">
            <button onclick="adjustQty('${p.id}', -1)">−</button>
            <span>${p.quantity}</span>
            <button onclick="adjustQty('${p.id}', 1)">+</button>
          </div>
          <div>
            <button class="btn-sm" onclick="editProduct('${p.id}')">Edit</button>
            <button class="btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function adjustQty(id, delta) {
  const prod = products.find(p => p.id === id);
  if (prod) {
    prod.quantity = Math.max(0, Number(prod.quantity) + delta);
    saveToCloud(); // Auto push to Firebase
  }
}

/* ==========================================================================
   Product Form Management
   ========================================================================== */
function handleFormSubmit(event) {
  event.preventDefault();

  const id = document.getElementById('prod-id').value;
  const productData = {
    id: id || 'prod_' + Date.now(),
    name: document.getElementById('prod-name').value.trim(),
    brand: document.getElementById('prod-brand').value.trim(),
    categoryId: document.getElementById('prod-cat').value,
    subCategory: document.getElementById('prod-subcat').value,
    roomId: document.getElementById('prod-room').value,
    spot: document.getElementById('prod-spot').value,
    size: document.getElementById('prod-size').value.trim(),
    price: document.getElementById('prod-price').value,
    quantity: Number(document.getElementById('prod-qty').value) || 0,
    status: document.getElementById('prod-status').value,
    openedDate: document.getElementById('prod-opened').value,
    pao: document.getElementById('prod-pao').value,
    expiryDate: document.getElementById('prod-expiry').value,
    repurchase: document.getElementById('prod-repurchase').value
  };

  if (id) {
    const idx = products.findIndex(p => p.id === id);
    if (idx !== -1) products[idx] = productData;
  } else {
    products.push(productData);
  }

  saveToCloud(); // Push updated state to Firebase
  showToast(id ? 'Product updated successfully' : 'Product added successfully');
  resetForm();
  switchTab('inventory');
}

function editProduct(id) {
  const p = products.find(prod => prod.id === id);
  if (!p) return;

  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name || '';
  document.getElementById('prod-brand').value = p.brand || '';
  document.getElementById('prod-size').value = p.size || '';
  document.getElementById('prod-price').value = p.price || '';
  document.getElementById('prod-qty').value = p.quantity ?? 1;
  document.getElementById('prod-status').value = p.status || 'In Stock';
  document.getElementById('prod-opened').value = p.openedDate || '';
  document.getElementById('prod-pao').value = p.pao || '';
  document.getElementById('prod-expiry').value = p.expiryDate || '';
  document.getElementById('prod-repurchase').value = p.repurchase || 'Maybe';

  populateDropdowns();
  document.getElementById('prod-cat').value = p.categoryId || '';
  handleCategoryChange();
  document.getElementById('prod-subcat').value = p.subCategory || '';

  document.getElementById('prod-room').value = p.roomId || '';
  handleRoomChange();
  document.getElementById('prod-spot').value = p.spot || '';

  document.getElementById('form-title').textContent = 'Edit Product';
  switchTab('add-product');
}

function deleteProduct(id) {
  if (confirm('Are you sure you want to delete this product?')) {
    products = products.filter(p => p.id !== id);
    saveToCloud(); // Auto push deletion to Firebase
    showToast('Product deleted');
  }
}

function resetForm() {
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('form-title').textContent = 'Add New Product';
}

/* ==========================================================================
   Dropdowns & Dynamic Inline Creation
   ========================================================================== */
function populateDropdowns() {
  const catSelect = document.getElementById('prod-cat');
  if (catSelect) {
    catSelect.innerHTML = '<option value="">Select Category</option>' +
      categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('') +
      '<option value="__NEW__">+ Add New Category...</option>';
  }

  const roomSelect = document.getElementById('prod-room');
  if (roomSelect) {
    roomSelect.innerHTML = '<option value="">Select Room</option>' +
      rooms.map(r => `<option value="${r.id}">${escapeHtml(r.name)}</option>`).join('') +
      '<option value="__NEW__">+ Add New Room...</option>';
  }
}

function handleCategoryChange() {
  const catSelect = document.getElementById('prod-cat');
  const subSelect = document.getElementById('prod-subcat');
  if (!catSelect || !subSelect) return;

  if (catSelect.value === '__NEW__') {
    const newName = prompt('Enter new category name:');
    if (newName) {
      const newCat = { id: 'c_' + Date.now(), name: newName.trim(), subcategories: [] };
      categories.push(newCat);
      saveToCloud();
      populateDropdowns();
      catSelect.value = newCat.id;
    } else {
      catSelect.value = '';
    }
  }

  const selectedCat = categories.find(c => c.id === catSelect.value);
  if (selectedCat) {
    subSelect.innerHTML = '<option value="">Select Sub-Category</option>' +
      selectedCat.subcategories.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('') +
      '<option value="__NEW__">+ Add New Sub-Category...</option>';
  } else {
    subSelect.innerHTML = '<option value="">Select Sub-Category</option>';
  }
}

function handleSubCategoryChange() {
  const catSelect = document.getElementById('prod-cat');
  const subSelect = document.getElementById('prod-subcat');
  if (subSelect.value === '__NEW__') {
    const selectedCat = categories.find(c => c.id === catSelect.value);
    if (!selectedCat) {
      alert('Please select a main category first.');
      subSelect.value = '';
      return;
    }
    const newSubName = prompt('Enter new sub-category name:');
    if (newSubName) {
      selectedCat.subcategories.push(newSubName.trim());
      saveToCloud();
      handleCategoryChange();
      subSelect.value = newSubName.trim();
    } else {
      subSelect.value = '';
    }
  }
}

function handleRoomChange() {
  const roomSelect = document.getElementById('prod-room');
  const spotSelect = document.getElementById('prod-spot');
  if (!roomSelect || !spotSelect) return;

  if (roomSelect.value === '__NEW__') {
    const newRoomName = prompt('Enter new room name:');
    if (newRoomName) {
      const newRoom = { id: 'r_' + Date.now(), name: newRoomName.trim(), spots: [] };
      rooms.push(newRoom);
      saveToCloud();
      populateDropdowns();
      roomSelect.value = newRoom.id;
    } else {
      roomSelect.value = '';
    }
  }

  const selectedRoom = rooms.find(r => r.id === roomSelect.value);
  if (selectedRoom) {
    spotSelect.innerHTML = '<option value="">Select Storage Spot</option>' +
      selectedRoom.spots.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('') +
      '<option value="__NEW__">+ Add New Storage Spot...</option>';
  } else {
    spotSelect.innerHTML = '<option value="">Select Storage Spot</option>';
  }
}

function handleSpotChange() {
  const roomSelect = document.getElementById('prod-room');
  const spotSelect = document.getElementById('prod-spot');
  if (spotSelect.value === '__NEW__') {
    const selectedRoom = rooms.find(r => r.id === roomSelect.value);
    if (!selectedRoom) {
      alert('Please select a main room first.');
      spotSelect.value = '';
      return;
    }
    const newSpotName = prompt('Enter new storage spot name:');
    if (newSpotName) {
      selectedRoom.spots.push(newSpotName.trim());
      saveToCloud();
      handleRoomChange();
      spotSelect.value = newSpotName.trim();
    } else {
      spotSelect.value = '';
    }
  }
}

function updateDatalists() {
  const names = [...new Set(products.map(p => p.name).filter(Boolean))];
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  const sizes = [...new Set(products.map(p => p.size).filter(Boolean))];

  fillDatalist('dl-name', names);
  fillDatalist('dl-brand', brands);
  fillDatalist('dl-size', sizes);
}

function fillDatalist(id, items) {
  const dl = document.getElementById(id);
  if (dl) {
    dl.innerHTML = items.map(item => `<option value="${escapeHtml(item)}"></option>`).join('');
  }
}

/* ==========================================================================
   Category & Location Management Views
   ========================================================================== */
function renderCategoryManager() {
  const container = document.getElementById('category-list-container');
  if (!container) return;

  container.innerHTML = categories.map(cat => `
    <div class="management-card">
      <div class="card-header">
        <h3>${escapeHtml(cat.name)}</h3>
        <button class="btn-sm btn-danger" onclick="deleteCategory('${cat.id}')">Delete Category</button>
      </div>
      <div class="pill-container">
        ${cat.subcategories.map(sub => `
          <span class="tag-pill">
            ${escapeHtml(sub)}
            <button onclick="deleteSubCategory('${cat.id}', '${escapeHtml(sub)}')">×</button>
          </span>
        `).join('')}
        <button class="btn-sm" onclick="promptAddSubCategory('${cat.id}')">+ Sub-Category</button>
      </div>
    </div>
  `).join('');
}

function promptAddCategory() {
  const name = prompt('Enter new category name:');
  if (name) {
    categories.push({ id: 'c_' + Date.now(), name: name.trim(), subcategories: [] });
    saveToCloud();
  }
}

function deleteCategory(id) {
  if (confirm('Delete this category and all its sub-categories?')) {
    categories = categories.filter(c => c.id !== id);
    saveToCloud();
  }
}

function promptAddSubCategory(catId) {
  const name = prompt('Enter sub-category name:');
  const cat = categories.find(c => c.id === catId);
  if (name && cat) {
    cat.subcategories.push(name.trim());
    saveToCloud();
  }
}

function deleteSubCategory(catId, subName) {
  const cat = categories.find(c => c.id === catId);
  if (cat) {
    cat.subcategories = cat.subcategories.filter(s => s !== subName);
    saveToCloud();
  }
}

function renderLocationManager() {
  const container = document.getElementById('location-list-container');
  if (!container) return;

  container.innerHTML = rooms.map(room => `
    <div class="management-card">
      <div class="card-header">
        <h3>${escapeHtml(room.name)}</h3>
        <button class="btn-sm btn-danger" onclick="deleteRoom('${room.id}')">Delete Room</button>
      </div>
      <div class="pill-container">
        ${room.spots.map(spot => `
          <span class="tag-pill">
            ${escapeHtml(spot)}
            <button onclick="deleteSpot('${room.id}', '${escapeHtml(spot)}')">×</button>
          </span>
        `).join('')}
        <button class="btn-sm" onclick="promptAddSpot('${room.id}')">+ Storage Spot</button>
      </div>
    </div>
  `).join('');
}

function promptAddRoom() {
  const name = prompt('Enter new room name:');
  if (name) {
    rooms.push({ id: 'r_' + Date.now(), name: name.trim(), spots: [] });
    saveToCloud();
  }
}

function deleteRoom(id) {
  if (confirm('Delete this room and all its storage spots?')) {
    rooms = rooms.filter(r => r.id !== id);
    saveToCloud();
  }
}

function promptAddSpot(roomId) {
  const name = prompt('Enter storage spot name:');
  const room = rooms.find(r => r.id === roomId);
  if (name && room) {
    room.spots.push(name.trim());
    saveToCloud();
  }
}

function deleteSpot(roomId, spotName) {
  const room = rooms.find(r => r.id === roomId);
  if (room) {
    room.spots = room.spots.filter(s => s !== spotName);
    saveToCloud();
  }
}

/* ==========================================================================
   Reorder List Logic
   ========================================================================== */
function renderReorderList() {
  const container = document.getElementById('reorder-list-container');
  if (!container) return;

  const reorderItems = products.filter(p => Number(p.quantity) <= 1 || p.repurchase === 'Yes');

  if (reorderItems.length === 0) {
    container.innerHTML = '<p class="empty-msg">No items need reordering right now.</p>';
    return;
  }

  container.innerHTML = reorderItems.map(p => `
    <div class="reorder-card">
      <div>
        <h3>${escapeHtml(p.name)}</h3>
        <p class="card-sub">${escapeHtml(p.brand || 'No Brand')} • Current Stock: <strong>${p.quantity}</strong></p>
      </div>
      <div class="reorder-meta">
        <span>$${p.price ? Number(p.price).toFixed(2) : '0.00'}</span>
        <span class="status-pill">${p.repurchase === 'Yes' ? 'Worth Repurchasing' : 'Low Stock'}</span>
      </div>
    </div>
  `).join('');
}

/* ==========================================================================
   Data Import, Export, & Reset (Settings)
   ========================================================================== */
function exportJSON() {
  const data = { products, categories, rooms, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.products && parsed.categories && parsed.rooms) {
        products = parsed.products;
        categories = parsed.categories;
        rooms = parsed.rooms;
        saveToCloud(); // Auto push imported JSON backup to Firebase
        showToast('Database imported & synced to cloud!');
      } else {
        alert('Invalid JSON file format.');
      }
    } catch (err) {
      alert('Error parsing JSON backup file.');
    }
  };
  reader.readAsText(file);
}

function resetAllData() {
  if (confirm('Are you sure you want to permanently clear all data across devices?')) {
    products = [];
    categories = [];
    rooms = [];
    saveToCloud();
    showToast('Database cleared');
  }
}

/* ==========================================================================
   Language Switcher & Utilities
   ========================================================================== */
function toggleLanguage() {
  currentLang = currentLang === 'en' ? 'zh' : 'en';
  localStorage.setItem('appLang', currentLang);
  document.getElementById('lang-toggle-btn').textContent = currentLang === 'en' ? '繁體中文' : 'English';
  showToast(currentLang === 'en' ? 'Switched to English' : '已切換至繁體中文');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   App Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  renderAllViews();
  listenToCloudChanges(); // Start watching for cross-device updates
});
