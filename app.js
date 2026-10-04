// INITIAL DEFAULT DATA
const DEFAULT_CATEGORIES = [
  { name: 'Skincare', subs: ['Cleansing', 'Toner & Essence', 'Serums & Ampoules', 'Eye Cream', 'Moisturizer', 'Sunscreen', 'Masks'] },
  { name: 'Cosmetics & Makeup', subs: ['Face Base', 'Eye Makeup', 'Lips', 'Blush & Contour'] },
  { name: 'Personal Care & Hair', subs: ['Hair Care', 'Body Wash & Lotion', 'Oral Hygiene', 'Deodorant & Perfume'] },
  { name: 'Household & Cleaning', subs: ['Laundry', 'Dish & Surface', 'Paper & Disposables', 'Trash Bags'] },
  { name: 'Health & First Aid', subs: ['Vitamins & Supplements', 'Medicine & Ointment', 'Plasters & Bandages'] }
];

const DEFAULT_LOCATIONS = [
  { name: 'Toilet / Bathroom', spots: ['Under Sink Cabinet', 'Mirror Cabinet', 'Shower Shelf'] },
  { name: 'Bedroom', spots: ['Vanity Table', 'Drawer #1', 'Wardrobe'] },
  { name: 'Kitchen', spots: ['Pantry', 'Cabinet Above Sink', 'Fridge'] }
];

let activeFilterStatus = 'all';

// Firebase configuration (Firestore)
const firebaseConfig = {
  apiKey: "AIzaSyD9-RXk_3Lu-WIcQX3bYszqdAW0KbLqWO0",
  authDomain: "check-it-yourshelf.firebaseapp.com",
  databaseURL: "https://check-it-yourshelf-default-rtdb.firebaseio.com",
  projectId: "check-it-yourshelf",
  storageBucket: "check-it-yourshelf.firebasestorage.app",
  messagingSenderId: "233293179677",
  appId: "1:233293179677:web:3d75068654065ee8938ff4"
};

let db = null;
let isSyncing = false; // prevent feedback loops

// APPLICATION INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  initFirebase();
  initStorage();
  loadSyncCodeUI();
  updateDatalists();
  renderAllDropdowns();
  renderDashboard();
  renderInventory();
  renderCategoryManager();
  renderLocationManager();
  // Auto-pull from cloud if sync code is set
  if (getSyncCode()) {
    pullFromCloud(true); // silent
  }
});

function initFirebase() {
  try {
    if (typeof firebase !== 'undefined') {
      firebase.initializeApp(firebaseConfig);
      db = firebase.firestore();
      // Enable offline persistence for better UX
      db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('Persistence failed: multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('Persistence not available in this browser');
        }
      });
    } else {
      console.warn('Firebase SDK not loaded');
    }
  } catch (e) {
    console.error('Firebase init error:', e);
  }
}

function initStorage() {
  if (!localStorage.getItem('categories')) {
    localStorage.setItem('categories', JSON.stringify(DEFAULT_CATEGORIES));
  }
  if (!localStorage.getItem('locations')) {
    localStorage.setItem('locations', JSON.stringify(DEFAULT_LOCATIONS));
  }
  if (!localStorage.getItem('products')) {
    localStorage.setItem('products', JSON.stringify([]));
  }
}

// ===== CLOUD SYNC HELPERS =====
function getSyncCode() {
  return (localStorage.getItem('syncCode') || '').trim();
}

function loadSyncCodeUI() {
  const input = document.getElementById('sync-code');
  if (input) input.value = getSyncCode();
}

function saveSyncCode() {
  const input = document.getElementById('sync-code');
  if (!input) return;
  const code = input.value.trim();
  if (code) {
    localStorage.setItem('syncCode', code);
    showToast('Sync code saved!');
    setSyncStatus('Sync code saved. Use Push/Pull or data will auto-sync on changes.');
    // Optional: auto push after saving code
    pushToCloud();
  } else {
    localStorage.removeItem('syncCode');
    showToast('Cloud sync disabled (local only)');
    setSyncStatus('Cloud sync disabled.');
  }
}

function setSyncStatus(msg) {
  const el = document.getElementById('sync-status');
  if (el) el.textContent = msg || '';
}

function getLocalData() {
  return {
    categories: JSON.parse(localStorage.getItem('categories') || '[]'),
    locations: JSON.parse(localStorage.getItem('locations') || '[]'),
    products: JSON.parse(localStorage.getItem('products') || '[]'),
    updatedAt: Date.now()
  };
}

function applyCloudData(data) {
  if (!data) return;
  if (data.categories) localStorage.setItem('categories', JSON.stringify(data.categories));
  if (data.locations) localStorage.setItem('locations', JSON.stringify(data.locations));
  if (data.products) localStorage.setItem('products', JSON.stringify(data.products));
  // Refresh UI
  updateDatalists();
  renderAllDropdowns();
  renderDashboard();
  renderInventory();
  renderCategoryManager();
  renderLocationManager();
  renderShoppingList();
}

async function pushToCloud() {
  const code = getSyncCode();
  if (!code) {
    showToast('Please set a Sync Code first');
    setSyncStatus('No sync code set.');
    return;
  }
  if (!db) {
    showToast('Firebase not ready');
    return;
  }
  setSyncStatus('Pushing...');
  try {
    isSyncing = true;
    const data = getLocalData();
    await db.collection('sync').doc(code).set(data);
    showToast('Data pushed to cloud!');
    setSyncStatus('Last push: ' + new Date().toLocaleString());
  } catch (err) {
    console.error(err);
    showToast('Push failed: ' + (err.message || 'unknown error'));
    setSyncStatus('Push failed. Check console / Firebase rules.');
  } finally {
    isSyncing = false;
  }
}

async function pullFromCloud(silent = false) {
  const code = getSyncCode();
  if (!code) {
    if (!silent) {
      showToast('Please set a Sync Code first');
      setSyncStatus('No sync code set.');
    }
    return;
  }
  if (!db) {
    if (!silent) showToast('Firebase not ready');
    return;
  }
  if (!silent) setSyncStatus('Pulling...');
  try {
    isSyncing = true;
    const snap = await db.collection('sync').doc(code).get();
    if (snap.exists) {
      const data = snap.data();
      applyCloudData(data);
      if (!silent) {
        showToast('Data pulled from cloud!');
        setSyncStatus('Last pull: ' + new Date().toLocaleString());
      } else {
        setSyncStatus('Synced from cloud on load.');
      }
    } else {
      if (!silent) {
        showToast('No cloud data found for this code. Push first.');
        setSyncStatus('No cloud data yet for this code.');
      }
    }
  } catch (err) {
    console.error(err);
    if (!silent) {
      showToast('Pull failed: ' + (err.message || 'unknown error'));
      setSyncStatus('Pull failed. Check console / Firebase rules.');
    }
  } finally {
    isSyncing = false;
  }
}

// Auto-push after local data mutations (debounced)
function scheduleCloudPush() {
  if (isSyncing || !getSyncCode() || !db) return;
  clearTimeout(window._pushTimer);
  window._pushTimer = setTimeout(() => {
    pushToCloud().catch(() => {});
  }, 800);
}

// 1. AUTO-PREDICTION DATALIST POPULATION
function updateDatalists() {
  const products = JSON.parse(localStorage.getItem('products') || '[]');
  
  const names = [...new Set(products.map(p => p.name).filter(Boolean))];
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  const sizes = [...new Set(products.map(p => p.size).filter(Boolean))];

  populateDatalist('prod-name-list', names);
  populateDatalist('prod-brand-list', brands);
  populateDatalist('prod-size-list', sizes);
}

function populateDatalist(elementId, items) {
  const listElement = document.getElementById(elementId);
  if (!listElement) return;
  listElement.innerHTML = items
    .map(item => `<option value="${escapeHtml(item)}">`)
    .join('');
}

// 2. DROPDOWNS & INLINE +ADD NEW LOGIC
function renderAllDropdowns() {
  renderCategoryDropdown();
  renderRoomDropdown();
}

function renderCategoryDropdown(selectedCat = '') {
  const select = document.getElementById('prod-cat');
  const categories = JSON.parse(localStorage.getItem('categories') || '[]');
  
  let html = '<option value="">-- Select Category --</option>';
  categories.forEach(c => {
    const sel = c.name === selectedCat ? 'selected' : '';
    html += `<option value="${escapeHtml(c.name)}" ${sel}>${escapeHtml(c.name)}</option>`;
  });
  html += `<option value="__ADD_NEW_CAT__" style="font-weight: bold; color: #1d64d8;">+ Add New Category...</option>`;
  select.innerHTML = html;
  
  renderSubCategoryDropdown(selectedCat || select.value);
}

function renderSubCategoryDropdown(categoryName, selectedSub = '') {
  const select = document.getElementById('prod-subcat');
  const categories = JSON.parse(localStorage.getItem('categories') || '[]');
  const catObj = categories.find(c => c.name === categoryName);
  
  let html = '<option value="">-- Select Sub-Category --</option>';
  if (catObj && catObj.subs) {
    catObj.subs.forEach(s => {
      const sel = s === selectedSub ? 'selected' : '';
      html += `<option value="${escapeHtml(s)}" ${sel}>${escapeHtml(s)}</option>`;
    });
  }
  html += `<option value="__ADD_NEW_SUBCAT__" style="font-weight: bold; color: #1d64d8;">+ Add New Sub-Category...</option>`;
  select.innerHTML = html;
}

function renderRoomDropdown(selectedRoom = '') {
  const select = document.getElementById('prod-room');
  const locations = JSON.parse(localStorage.getItem('locations') || '[]');
  
  let html = '<option value="">-- Select Main Room --</option>';
  locations.forEach(l => {
    const sel = l.name === selectedRoom ? 'selected' : '';
    html += `<option value="${escapeHtml(l.name)}" ${sel}>${escapeHtml(l.name)}</option>`;
  });
  html += `<option value="__ADD_NEW_ROOM__" style="font-weight: bold; color: #1d64d8;">+ Add New Room...</option>`;
  select.innerHTML = html;
  
  renderSpotDropdown(selectedRoom || select.value);
}

function renderSpotDropdown(roomName, selectedSpot = '') {
  const select = document.getElementById('prod-spot');
  const locations = JSON.parse(localStorage.getItem('locations') || '[]');
  const roomObj = locations.find(l => l.name === roomName);
  
  let html = '<option value="">-- Select Storage Spot --</option>';
  if (roomObj && roomObj.spots) {
    roomObj.spots.forEach(s => {
      const sel = s === selectedSpot ? 'selected' : '';
      html += `<option value="${escapeHtml(s)}" ${sel}>${escapeHtml(s)}</option>`;
    });
  }
  html += `<option value="__ADD_NEW_SPOT__" style="font-weight: bold; color: #1d64d8;">+ Add New Storage Spot...</option>`;
  select.innerHTML = html;
}

// DROPDOWN CHANGE EVENT HANDLERS
function handleCategoryChange(select) {
  if (select.value === '__ADD_NEW_CAT__') {
    promptAddCategory();
  } else {
    renderSubCategoryDropdown(select.value);
  }
}

function handleSubCategoryChange(select) {
  const parentCat = document.getElementById('prod-cat').value;
  if (select.value === '__ADD_NEW_SUBCAT__') {
    if (!parentCat || parentCat === '__ADD_NEW_CAT__') {
      alert('Please select a Main Category first.');
      select.value = '';
      return;
    }
    promptAddSubCategory(parentCat);
  }
}

function handleRoomChange(select) {
  if (select.value === '__ADD_NEW_ROOM__') {
    promptAddRoom();
  } else {
    renderSpotDropdown(select.value);
  }
}

function handleSpotChange(select) {
  const parentRoom = document.getElementById('prod-room').value;
  if (select.value === '__ADD_NEW_SPOT__') {
    if (!parentRoom || parentRoom === '__ADD_NEW_ROOM__') {
      alert('Please select a Main Room first.');
      select.value = '';
      return;
    }
    promptAddSpot(parentRoom);
  }
}

// 3. CATEGORY MANAGER & LOCATION MANAGER INTERACTIVE LOGIC
function renderCategoryManager() {
  const container = document.getElementById('category-manager-list');
  const categories = JSON.parse(localStorage.getItem('categories') || '[]');
  
  if (categories.length === 0) {
    container.innerHTML = `<div class="empty-msg">No categories created yet.</div>`;
    return;
  }

  container.innerHTML = categories.map((cat, catIdx) => `
    <div class="cat-card">
      <div class="cat-card-header">
        <span class="cat-card-title">${escapeHtml(cat.name)}</span>
        <div class="cat-card-actions">
          <button class="btn-icon btn-add-sub" onclick="promptAddSubCategory('${escapeHtml(cat.name)}')" title="Add Sub-Category">+</button>
          <button class="btn-icon btn-del-cat" onclick="deleteCategory(${catIdx})" title="Delete Category">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
      <div class="cat-card-body">
        <div class="sub-pill-list">
          ${(cat.subs || []).map((sub, subIdx) => `
            <span class="sub-pill">
              ${escapeHtml(sub)}
              <button class="pill-remove" onclick="deleteSubCategory(${catIdx},${subIdx})">&times;</button>
            </span>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function renderLocationManager() {
  const container = document.getElementById('location-manager-list');
  const locations = JSON.parse(localStorage.getItem('locations') || '[]');
  
  if (locations.length === 0) {
    container.innerHTML = `<div class="empty-msg">No locations created yet.</div>`;
    return;
  }

  container.innerHTML = locations.map((loc, locIdx) => `
    <div class="cat-card">
      <div class="cat-card-header">
        <span class="cat-card-title">${escapeHtml(loc.name)}</span>
        <div class="cat-card-actions">
          <button class="btn-icon btn-add-sub" onclick="promptAddSpot('${escapeHtml(loc.name)}')" title="Add Storage Spot">+</button>
          <button class="btn-icon btn-del-cat" onclick="deleteRoom(${locIdx})" title="Delete Room">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
      <div class="cat-card-body">
        <div class="sub-pill-list">
          ${(loc.spots || []).map((spot, spotIdx) => `
            <span class="sub-pill">
              ${escapeHtml(spot)}
              <button class="pill-remove" onclick="deleteSpot(${locIdx},${spotIdx})">&times;</button>
            </span>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

// PROMPT HELPER FUNCTIONS
function promptAddCategory() {
  const name = prompt('Enter new Category Name:');
  if (name && name.trim()) {
    const trimmed = name.trim();
    let categories = JSON.parse(localStorage.getItem('categories') || '[]');
    if (!categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      categories.push({ name: trimmed, subs: [] });
      localStorage.setItem('categories', JSON.stringify(categories));
      showToast('Category added!');
      scheduleCloudPush();
    }
    renderCategoryDropdown(trimmed);
    renderCategoryManager();
  } else {
    renderCategoryDropdown();
  }
}

function promptAddSubCategory(catName) {
  const name = prompt(`Enter new Sub-Category for "${catName}":`);
  if (name && name.trim()) {
    const trimmed = name.trim();
    let categories = JSON.parse(localStorage.getItem('categories') || '[]');
    const cat = categories.find(c => c.name === catName);
    if (cat) {
      if (!cat.subs) cat.subs = [];
      if (!cat.subs.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
        cat.subs.push(trimmed);
        localStorage.setItem('categories', JSON.stringify(categories));
        showToast('Sub-category added!');
        scheduleCloudPush();
      }
    }
    renderCategoryDropdown(catName);
    renderSubCategoryDropdown(catName, trimmed);
    renderCategoryManager();
  } else {
    renderSubCategoryDropdown(catName);
  }
}

function promptAddRoom() {
  const name = prompt('Enter new Room Name:');
  if (name && name.trim()) {
    const trimmed = name.trim();
    let locations = JSON.parse(localStorage.getItem('locations') || '[]');
    if (!locations.some(l => l.name.toLowerCase() === trimmed.toLowerCase())) {
      locations.push({ name: trimmed, spots: [] });
      localStorage.setItem('locations', JSON.stringify(locations));
      showToast('Room added!');
      scheduleCloudPush();
    }
    renderRoomDropdown(trimmed);
    renderLocationManager();
  } else {
    renderRoomDropdown();
  }
}

function promptAddSpot(roomName) {
  const name = prompt(`Enter new Storage Spot for "${roomName}":`);
  if (name && name.trim()) {
    const trimmed = name.trim();
    let locations = JSON.parse(localStorage.getItem('locations') || '[]');
    const loc = locations.find(l => l.name === roomName);
    if (loc) {
      if (!loc.spots) loc.spots = [];
      if (!loc.spots.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
        loc.spots.push(trimmed);
        localStorage.setItem('locations', JSON.stringify(locations));
        showToast('Storage spot added!');
        scheduleCloudPush();
      }
    }
    renderRoomDropdown(roomName);
    renderSpotDropdown(roomName, trimmed);
    renderLocationManager();
  } else {
    renderSpotDropdown(roomName);
  }
}

function deleteCategory(idx) {
  if (confirm('Delete this main category and all its sub-categories?')) {
    let categories = JSON.parse(localStorage.getItem('categories') || '[]');
    categories.splice(idx, 1);
    localStorage.setItem('categories', JSON.stringify(categories));
    renderAllDropdowns();
    renderCategoryManager();
    showToast('Category deleted');
    scheduleCloudPush();
  }
}

function deleteSubCategory(catIdx, subIdx) {
  let categories = JSON.parse(localStorage.getItem('categories') || '[]');
  if (categories[catIdx] && categories[catIdx].subs) {
    categories[catIdx].subs.splice(subIdx, 1);
    localStorage.setItem('categories', JSON.stringify(categories));
    renderAllDropdowns();
    renderCategoryManager();
    showToast('Sub-category removed');
    scheduleCloudPush();
  }
}

function deleteRoom(idx) {
  if (confirm('Delete this main room and all its storage spots?')) {
    let locations = JSON.parse(localStorage.getItem('locations') || '[]');
    locations.splice(idx, 1);
    localStorage.setItem('locations', JSON.stringify(locations));
    renderAllDropdowns();
    renderLocationManager();
    showToast('Room deleted');
    scheduleCloudPush();
  }
}

function deleteSpot(locIdx, spotIdx) {
  let locations = JSON.parse(localStorage.getItem('locations') || '[]');
  if (locations[locIdx] && locations[locIdx].spots) {
    locations[locIdx].spots.splice(spotIdx, 1);
    localStorage.setItem('locations', JSON.stringify(locations));
    renderAllDropdowns();
    renderLocationManager();
    showToast('Storage spot removed');
    scheduleCloudPush();
  }
}

// 4. INVENTORY FORM HANDLERS
function handleFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('prod-id').value || Date.now().toString();
  
  const productData = {
    id,
    name: document.getElementById('prod-name').value.trim(),
    brand: document.getElementById('prod-brand').value.trim(),
    category: document.getElementById('prod-cat').value,
    subCategory: document.getElementById('prod-subcat').value,
    room: document.getElementById('prod-room').value,
    spot: document.getElementById('prod-spot').value,
    size: document.getElementById('prod-size').value.trim(),
    price: document.getElementById('prod-price').value,
    qty: parseInt(document.getElementById('prod-qty').value, 10) || 0,
    status: document.getElementById('prod-status').value,
    dateOpened: document.getElementById('prod-opened').value,
    pao: document.getElementById('prod-pao').value,
    expDate: document.getElementById('prod-exp').value,
    repurchase: document.getElementById('prod-repurch').value
  };

  let products = JSON.parse(localStorage.getItem('products') || '[]');
  const existingIdx = products.findIndex(p => p.id === id);
  if (existingIdx > -1) {
    products[existingIdx] = productData;
  } else {
    products.push(productData);
  }

  localStorage.setItem('products', JSON.stringify(products));
  updateDatalists();
  resetForm();
  renderDashboard();
  renderInventory();
  renderShoppingList();
  switchTab('inventory');
  showToast('Product saved!');
  scheduleCloudPush();
}

function resetForm() {
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('form-title').innerText = 'Add New Product';
  document.getElementById('save-btn').innerText = 'Save Product';
  renderAllDropdowns();
}

function editProduct(id) {
  const products = JSON.parse(localStorage.getItem('products') || '[]');
  const p = products.find(prod => prod.id === id);
  if (!p) return;

  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name || '';
  document.getElementById('prod-brand').value = p.brand || '';
  
  renderCategoryDropdown(p.category || '');
  renderSubCategoryDropdown(p.category || '', p.subCategory || '');
  renderRoomDropdown(p.room || '');
  renderSpotDropdown(p.room || '', p.spot || '');

  document.getElementById('prod-size').value = p.size || '';
  document.getElementById('prod-price').value = p.price || '';
  document.getElementById('prod-qty').value = p.qty ?? 1;
  document.getElementById('prod-status').value = p.status || 'In Stock';
  document.getElementById('prod-opened').value = p.dateOpened || '';
  document.getElementById('prod-pao').value = p.pao || '';
  document.getElementById('prod-exp').value = p.expDate || '';
  document.getElementById('prod-repurch').value = p.repurchase || '';

  document.getElementById('form-title').innerText = 'Edit Product';
  document.getElementById('save-btn').innerText = 'Update Product';
  switchTab('add');
}

function deleteProduct(id) {
  if (confirm('Delete this product?')) {
    let products = JSON.parse(localStorage.getItem('products') || '[]');
    products = products.filter(p => p.id !== id);
    localStorage.setItem('products', JSON.stringify(products));
    renderDashboard();
    renderInventory();
    renderShoppingList();
    showToast('Product deleted');
    scheduleCloudPush();
  }
}

function changeQty(id, delta) {
  let products = JSON.parse(localStorage.getItem('products') || '[]');
  const p = products.find(prod => prod.id === id);
  if (p) {
    p.qty = Math.max(0, (p.qty || 0) + delta);
    localStorage.setItem('products', JSON.stringify(products));
    renderDashboard();
    renderInventory();
    renderShoppingList();
    scheduleCloudPush();
  }
}

// 5. INVENTORY & DASHBOARD RENDERING
function renderDashboard() {
  const products = JSON.parse(localStorage.getItem('products') || '[]');
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const total = products.length;
  const low = products.filter(p => p.qty <= 1 && p.status !== 'Finished').length;
  const expired = products.filter(p => p.expDate && p.expDate < today).length;
  const expiring = products.filter(p => p.expDate && p.expDate >= today && p.expDate <= thirtyDaysOut).length;

  document.getElementById('dash-total').innerText = total;
  document.getElementById('dash-low').innerText = low;
  document.getElementById('dash-expiring').innerText = expiring;
  document.getElementById('dash-expired').innerText = expired;
}

function renderInventory() {
  const container = document.getElementById('inventory-list');
  const products = JSON.parse(localStorage.getItem('products') || '[]');
  const search = document.getElementById('search-input').value.toLowerCase();

  let filtered = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(search) || 
                          (p.brand || '').toLowerCase().includes(search);
    const matchesStatus = activeFilterStatus === 'all' || p.status === activeFilterStatus;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-msg">No products found.</div>`;
    return;
  }

  container.innerHTML = filtered.map(p => `
    <div class="product-card ${p.qty <= 1 ? 'card-low-stock' : ''}">
      <div class="product-top">
        <div>
          <div class="product-title">${escapeHtml(p.name)}</div>
          <div class="product-sub">${escapeHtml(p.brand || 'No Brand')} ${p.size ? '&bull; ' + escapeHtml(p.size) : ''}</div>
          <div class="loc-badge">${escapeHtml(p.room || '')} ${p.spot ? ' &rsaquo; ' + escapeHtml(p.spot) : ''}</div>
        </div>
        <span class="status-badge status-${(p.status || 'in-stock').toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(p.status)}</span>
      </div>

      <div class="card-actions">
        <div class="qty-controls">
          <button class="btn-qty" onclick="changeQty('${p.id}', -1)">&minus;</button>
          <span class="qty-val">${p.qty}</span>
          <button class="btn-qty" onclick="changeQty('${p.id}', 1)">+</button>
        </div>
        <div class="action-btns">
          <button class="btn-sm btn-edit" onclick="editProduct('${p.id}')">Edit</button>
          <button class="btn-sm btn-delete" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function setFilter(status, btn) {
  activeFilterStatus = status;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderInventory();
}

function renderShoppingList() {
  const container = document.getElementById('shopping-list');
  const products = JSON.parse(localStorage.getItem('products') || '[]');
  const reorderItems = products.filter(p => p.qty <= 1 || p.repurchase === 'Yes');

  if (reorderItems.length === 0) {
    container.innerHTML = `<div class="empty-msg">Your shopping list is clear!</div>`;
    return;
  }

  container.innerHTML = reorderItems.map(p => `
    <div class="product-card">
      <div class="product-top">
        <div>
          <div class="product-title">${escapeHtml(p.name)}</div>
          <div class="product-sub">${escapeHtml(p.brand || '')} ${p.price ? ' &bull; $' + escapeHtml(p.price) : ''}</div>
        </div>
        <span class="status-badge status-using">Qty: ${p.qty}</span>
      </div>
    </div>
  `).join('');
}

// 6. GENERAL NAVIGATION & UTILITIES
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.style.display = 'block';

  const navBtns = document.querySelectorAll('.nav-tab');
  const tabsOrder = ['dashboard', 'inventory', 'add', 'categories', 'locations', 'shopping', 'settings'];
  const idx = tabsOrder.indexOf(tabId);
  if (idx > -1 && navBtns[idx]) navBtns[idx].classList.add('active');

  if (tabId === 'shopping') renderShoppingList();
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 2200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// SETTINGS & DATA PORTABILITY
function exportData() {
  const data = {
    categories: JSON.parse(localStorage.getItem('categories') || '[]'),
    locations: JSON.parse(localStorage.getItem('locations') || '[]'),
    products: JSON.parse(localStorage.getItem('products') || '[]')
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `check_it_yourshelf_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.categories) localStorage.setItem('categories', JSON.stringify(data.categories));
      if (data.locations) localStorage.setItem('locations', JSON.stringify(data.locations));
      if (data.products) localStorage.setItem('products', JSON.stringify(data.products));
      // If cloud sync is enabled, push the imported data
      if (getSyncCode() && db) {
        await pushToCloud();
      }
      location.reload();
    } catch (err) {
      alert('Invalid JSON File Format.');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
    localStorage.clear();
    location.reload();
  }
}
