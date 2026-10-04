import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  getDocs,
  query,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9-RXk_3Lu-WIcQX3bYszqdAW0KbLqWO0",
  authDomain: "check-it-yourshelf.firebaseapp.com",
  databaseURL: "https://check-it-yourshelf-default-rtdb.firebaseio.com",
  projectId: "check-it-yourshelf",
  storageBucket: "check-it-yourshelf.firebasestorage.app",
  messagingSenderId: "233293179677",
  appId: "1:233293179677:web:3d75068654065ee8938ff4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// HOUSEHOLD SYNC KEY
let HOUSEHOLD_ID = localStorage.getItem('yourshelf_household_id') || 'default_household';

// PRE-DEFINED DEFAULT DATA
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

// STATE
let categoriesData = [];
let locationsData = [];
let productsData = [];
let activeFilterStatus = 'all';
let unsubs = [];

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  renderSettingsTab();
  initFirestoreListeners();
});

// RENDER SETTINGS TAB WITH SYNC KEY
function renderSettingsTab() {
  const settingsTab = document.getElementById('tab-settings');
  if (!settingsTab) return;

  settingsTab.innerHTML = `
    <div class="card" style="background:#fff; padding:20px; border-radius:12px; max-width:600px; margin:0 auto; box-shadow:0 2px 8px rgba(0,0,0,0.05);">
      <h2 style="margin-top:0; margin-bottom:15px; color:#333;">Settings & Cross-Device Sync</h2>
      
      <div style="background:#f0f4f8; padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid #d0d7de;">
        <label style="font-weight:bold; display:block; margin-bottom:8px; color:#1f2937;">Household Sync Key:</label>
        <div style="display:flex; gap:8px;">
          <input type="text" id="sync-code-input" value="${escapeHtml(HOUSEHOLD_ID)}" style="flex:1; padding:10px; border:1px solid #ccc; border-radius:6px; font-size:14px;">
          <button type="button" class="btn-primary" onclick="changeHouseholdKey()" style="padding:10px 16px; background:#1d64d8; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">Update Key</button>
        </div>
        <small style="color:#666; display:block; margin-top:8px; line-height:1.4;">
          Enter the exact same key on all devices (e.g. phones, tablets, PCs) to automatically share and sync all categories, locations, and inventory in real time.
        </small>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px;">
        <button class="btn-secondary" onclick="exportData()" style="padding:12px; border:1px solid #ccc; background:#fff; border-radius:6px; cursor:pointer; font-weight:600;">Export Data (JSON)</button>
        <button class="btn-secondary" onclick="document.getElementById('import-file').click()" style="padding:12px; border:1px solid #ccc; background:#fff; border-radius:6px; cursor:pointer; font-weight:600;">Import Data (JSON)</button>
        <input type="file" id="import-file" style="display:none" onchange="importData(event)">
        <button class="btn-danger" onclick="clearAllData()" style="padding:12px; border:none; background:#fee2e2; color:#dc2626; border-radius:6px; cursor:pointer; font-weight:bold; margin-top:10px;">Reset All Data</button>
      </div>
    </div>
  `;
}

window.changeHouseholdKey = function() {
  const newKey = document.getElementById('sync-code-input').value.trim();
  if (newKey) {
    HOUSEHOLD_ID = newKey;
    localStorage.setItem('yourshelf_household_id', HOUSEHOLD_ID);
    showToast(`Sync Key set to: ${HOUSEHOLD_ID}`);
    initFirestoreListeners();
  } else {
    alert('Please enter a valid Sync Key.');
  }
};

// FIRESTORE LISTENERS
function initFirestoreListeners() {
  unsubs.forEach(unsub => unsub());
  unsubs = [];

  const catQuery = query(collection(db, "categories"), where("householdId", "==", HOUSEHOLD_ID));
  const locQuery = query(collection(db, "locations"), where("householdId", "==", HOUSEHOLD_ID));
  const prodQuery = query(collection(db, "products"), where("householdId", "==", HOUSEHOLD_ID));

  // 1. Categories
  const unsubCat = onSnapshot(catQuery, async (snapshot) => {
    if (snapshot.empty) {
      await seedDefaultCategories();
      return;
    }
    categoriesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAllDropdowns();
    renderCategoryManager();
  });
  unsubs.push(unsubCat);

  // 2. Locations
  const unsubLoc = onSnapshot(locQuery, async (snapshot) => {
    if (snapshot.empty) {
      await seedDefaultLocations();
      return;
    }
    locationsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAllDropdowns();
    renderLocationManager();
  });
  unsubs.push(unsubLoc);

  // 3. Products
  const unsubProd = onSnapshot(prodQuery, (snapshot) => {
    productsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    updateDatalists();
    renderDashboard();
    renderInventory();
    renderShoppingList();
  });
  unsubs.push(unsubProd);
}

// SEED DEFAULTS
async function seedDefaultCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    await addDoc(collection(db, "categories"), { ...cat, householdId: HOUSEHOLD_ID });
  }
}

async function seedDefaultLocations() {
  for (const loc of DEFAULT_LOCATIONS) {
    await addDoc(collection(db, "locations"), { ...loc, householdId: HOUSEHOLD_ID });
  }
}

// DATALISTS
function updateDatalists() {
  const names = [...new Set(productsData.map(p => p.name).filter(Boolean))];
  const brands = [...new Set(productsData.map(p => p.brand).filter(Boolean))];
  const sizes = [...new Set(productsData.map(p => p.size).filter(Boolean))];

  populateDatalist('prod-name-list', names);
  populateDatalist('prod-brand-list', brands);
  populateDatalist('prod-size-list', sizes);
}

function populateDatalist(elementId, items) {
  const listElement = document.getElementById(elementId);
  if (!listElement) return;
  listElement.innerHTML = items.map(item => `<option value="${escapeHtml(item)}">`).join('');
}

// DROPDOWN RENDERERS
function renderAllDropdowns() {
  renderCategoryDropdown();
  renderRoomDropdown();
}

function renderCategoryDropdown(selectedCat = '') {
  const select = document.getElementById('prod-cat');
  if (!select) return;
  
  let html = '<option value="">-- Select Category --</option>';
  categoriesData.forEach(c => {
    const sel = c.name === selectedCat ? 'selected' : '';
    html += `<option value="${escapeHtml(c.name)}" ${sel}>${escapeHtml(c.name)}</option>`;
  });
  select.innerHTML = html;
  
  renderSubCategoryDropdown(selectedCat || select.value);
}

function renderSubCategoryDropdown(categoryName, selectedSub = '') {
  const select = document.getElementById('prod-subcat');
  if (!select) return;
  
  const catObj = categoriesData.find(c => c.name === categoryName);
  
  let html = '<option value="">-- Select Sub-Category --</option>';
  if (catObj && catObj.subs) {
    catObj.subs.forEach(s => {
      const sel = s === selectedSub ? 'selected' : '';
      html += `<option value="${escapeHtml(s)}" ${sel}>${escapeHtml(s)}</option>`;
    });
  }
  select.innerHTML = html;
}

function renderRoomDropdown(selectedRoom = '') {
  const select = document.getElementById('prod-room');
  if (!select) return;

  let html = '<option value="">-- Select Main Room --</option>';
  locationsData.forEach(l => {
    const sel = l.name === selectedRoom ? 'selected' : '';
    html += `<option value="${escapeHtml(l.name)}" ${sel}>${escapeHtml(l.name)}</option>`;
  });
  select.innerHTML = html;
  
  renderSpotDropdown(selectedRoom || select.value);
}

function renderSpotDropdown(roomName, selectedSpot = '') {
  const select = document.getElementById('prod-spot');
  if (!select) return;

  const roomObj = locationsData.find(l => l.name === roomName);
  
  let html = '<option value="">-- Select Storage Spot --</option>';
  if (roomObj && roomObj.spots) {
    roomObj.spots.forEach(s => {
      const sel = s === selectedSpot ? 'selected' : '';
      html += `<option value="${escapeHtml(s)}" ${sel}>${escapeHtml(s)}</option>`;
    });
  }
  select.innerHTML = html;
}

// SELECT CHANGE HANDLERS
window.handleCategoryChange = function(select) {
  renderSubCategoryDropdown(select.value);
};

window.handleRoomChange = function(select) {
  renderSpotDropdown(select.value);
};

// CATEGORY & LOCATION MANAGERS (WITH INLINE ADDERS)
function renderCategoryManager() {
  const container = document.getElementById('category-manager-list');
  if (!container) return;

  let html = `
    <div style="margin-bottom:15px; display:flex; gap:8px;">
      <input type="text" id="new-cat-input" placeholder="New Category Name..." style="flex:1; padding:8px; border:1px solid #ccc; border-radius:6px;">
      <button type="button" class="btn-primary" onclick="addCategoryFromInput()" style="padding:8px 14px; background:#1d64d8; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">+ Add Category</button>
    </div>
  `;

  if (categoriesData.length === 0) {
    html += `<div class="empty-msg">No categories available.</div>`;
  } else {
    html += categoriesData.map((cat) => `
      <div class="cat-card" style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:8px; margin-bottom:12px;">
        <div class="cat-card-header" style="display:flex; justify-content:space-between; align-items:center; font-weight:bold; margin-bottom:8px;">
          <span class="cat-card-title">${escapeHtml(cat.name)}</span>
          <button class="btn-icon btn-del-cat" onclick="deleteCategory('${cat.id}')" title="Delete Category" style="background:none; border:none; color:#dc2626; cursor:pointer;">
            &times; Delete
          </button>
        </div>
        <div class="cat-card-body">
          <div class="sub-pill-list" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
            ${(cat.subs || []).map((sub, subIdx) => `
              <span class="sub-pill" style="background:#e2e8f0; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-flex; align-items:center; gap:4px;">
                ${escapeHtml(sub)}
                <button class="pill-remove" onclick="deleteSubCategory('${cat.id}',${subIdx})" style="background:none; border:none; cursor:pointer;">&times;</button>
              </span>
            `).join('')}
          </div>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <input type="text" id="new-sub-input-${cat.id}" placeholder="New Sub-Category..." style="flex:1; padding:6px; border:1px solid #ccc; border-radius:4px; font-size:12px;">
            <button type="button" onclick="addSubCategoryFromInput('${cat.id}')" style="padding:6px 10px; background:#059669; color:#fff; border:none; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;">+ Add Sub</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  container.innerHTML = html;
}

function renderLocationManager() {
  const container = document.getElementById('location-manager-list');
  if (!container) return;

  let html = `
    <div style="margin-bottom:15px; display:flex; gap:8px;">
      <input type="text" id="new-room-input" placeholder="New Room Name..." style="flex:1; padding:8px; border:1px solid #ccc; border-radius:6px;">
      <button type="button" class="btn-primary" onclick="addRoomFromInput()" style="padding:8px 14px; background:#1d64d8; color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">+ Add Room</button>
    </div>
  `;

  if (locationsData.length === 0) {
    html += `<div class="empty-msg">No locations available.</div>`;
  } else {
    html += locationsData.map((loc) => `
      <div class="cat-card" style="background:#f8fafc; border:1px solid #e2e8f0; padding:12px; border-radius:8px; margin-bottom:12px;">
        <div class="cat-card-header" style="display:flex; justify-content:space-between; align-items:center; font-weight:bold; margin-bottom:8px;">
          <span class="cat-card-title">${escapeHtml(loc.name)}</span>
          <button class="btn-icon btn-del-cat" onclick="deleteRoom('${loc.id}')" title="Delete Room" style="background:none; border:none; color:#dc2626; cursor:pointer;">
            &times; Delete
          </button>
        </div>
        <div class="cat-card-body">
          <div class="sub-pill-list" style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
            ${(loc.spots || []).map((spot, spotIdx) => `
              <span class="sub-pill" style="background:#e2e8f0; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-flex; align-items:center; gap:4px;">
                ${escapeHtml(spot)}
                <button class="pill-remove" onclick="deleteSpot('${loc.id}',${spotIdx})" style="background:none; border:none; cursor:pointer;">&times;</button>
              </span>
            `).join('')}
          </div>
          <div style="display:flex; gap:6px; margin-top:8px;">
            <input type="text" id="new-spot-input-${loc.id}" placeholder="New Storage Spot..." style="flex:1; padding:6px; border:1px solid #ccc; border-radius:4px; font-size:12px;">
            <button type="button" onclick="addSpotFromInput('${loc.id}')" style="padding:6px 10px; background:#059669; color:#fff; border:none; border-radius:4px; font-size:12px; font-weight:bold; cursor:pointer;">+ Add Spot</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  container.innerHTML = html;
}

// INLINE ADD MUTATIONS
window.addCategoryFromInput = async function() {
  const input = document.getElementById('new-cat-input');
  if (!input) return;
  const val = input.value.trim();
  if (val) {
    if (!categoriesData.some(c => c.name.toLowerCase() === val.toLowerCase())) {
      await addDoc(collection(db, "categories"), { name: val, subs: [], householdId: HOUSEHOLD_ID });
      showToast('Category added!');
    }
  }
};

window.addSubCategoryFromInput = async function(catId) {
  const input = document.getElementById(`new-sub-input-${catId}`);
  if (!input) return;
  const val = input.value.trim();
  if (val) {
    const cat = categoriesData.find(c => c.id === catId);
    if (cat) {
      const updatedSubs = cat.subs ? [...cat.subs] : [];
      if (!updatedSubs.some(s => s.toLowerCase() === val.toLowerCase())) {
        updatedSubs.push(val);
        await updateDoc(doc(db, "categories", catId), { subs: updatedSubs });
        showToast('Sub-category added!');
      }
    }
  }
};

window.addRoomFromInput = async function() {
  const input = document.getElementById('new-room-input');
  if (!input) return;
  const val = input.value.trim();
  if (val) {
    if (!locationsData.some(l => l.name.toLowerCase() === val.toLowerCase())) {
      await addDoc(collection(db, "locations"), { name: val, spots: [], householdId: HOUSEHOLD_ID });
      showToast('Room added!');
    }
  }
};

window.addSpotFromInput = async function(locId) {
  const input = document.getElementById(`new-spot-input-${locId}`);
  if (!input) return;
  const val = input.value.trim();
  if (val) {
    const loc = locationsData.find(l => l.id === locId);
    if (loc) {
      const updatedSpots = loc.spots ? [...loc.spots] : [];
      if (!updatedSpots.some(s => s.toLowerCase() === val.toLowerCase())) {
        updatedSpots.push(val);
        await updateDoc(doc(db, "locations", locId), { spots: updatedSpots });
        showToast('Storage spot added!');
      }
    }
  }
};

// DELETE MUTATIONS
window.deleteCategory = async function(catId) {
  if (confirm('Delete this main category and all its sub-categories?')) {
    await deleteDoc(doc(db, "categories", catId));
    showToast('Category deleted');
  }
};

window.deleteSubCategory = async function(catId, subIdx) {
  const cat = categoriesData.find(c => c.id === catId);
  if (cat && cat.subs) {
    const updatedSubs = [...cat.subs];
    updatedSubs.splice(subIdx, 1);
    await updateDoc(doc(db, "categories", catId), { subs: updatedSubs });
    showToast('Sub-category removed');
  }
};

window.deleteRoom = async function(locId) {
  if (confirm('Delete this main room and all its storage spots?')) {
    await deleteDoc(doc(db, "locations", locId));
    showToast('Room deleted');
  }
};

window.deleteSpot = async function(locId, spotIdx) {
  const loc = locationsData.find(l => l.id === locId);
  if (loc && loc.spots) {
    const updatedSpots = [...loc.spots];
    updatedSpots.splice(spotIdx, 1);
    await updateDoc(doc(db, "locations", locId), { spots: updatedSpots });
    showToast('Storage spot removed');
  }
};

// PRODUCT FORM & INVENTORY
window.handleFormSubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById('prod-id').value;
  
  const productData = {
    householdId: HOUSEHOLD_ID,
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

  if (id) {
    await updateDoc(doc(db, "products", id), productData);
  } else {
    await addDoc(collection(db, "products"), productData);
  }

  resetForm();
  switchTab('inventory');
  showToast('Product saved!');
};

window.resetForm = function() {
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('form-title').innerText = 'Add New Product';
  document.getElementById('save-btn').innerText = 'Save Product';
  renderAllDropdowns();
};

window.editProduct = function(id) {
  const p = productsData.find(prod => prod.id === id);
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
};

window.deleteProduct = async function(id) {
  if (confirm('Delete this product?')) {
    await deleteDoc(doc(db, "products", id));
    showToast('Product deleted');
  }
};

window.changeQty = async function(id, delta) {
  const p = productsData.find(prod => prod.id === id);
  if (p) {
    const newQty = Math.max(0, (p.qty || 0) + delta);
    await updateDoc(doc(db, "products", id), { qty: newQty });
  }
};

// DASHBOARD & INVENTORY RENDERING
function renderDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const total = productsData.length;
  const low = productsData.filter(p => p.qty <= 1 && p.status !== 'Finished').length;
  const expired = productsData.filter(p => p.expDate && p.expDate < today).length;
  const expiring = productsData.filter(p => p.expDate && p.expDate >= today && p.expDate <= thirtyDaysOut).length;

  if (document.getElementById('dash-total')) document.getElementById('dash-total').innerText = total;
  if (document.getElementById('dash-low')) document.getElementById('dash-low').innerText = low;
  if (document.getElementById('dash-expiring')) document.getElementById('dash-expiring').innerText = expiring;
  if (document.getElementById('dash-expired')) document.getElementById('dash-expired').innerText = expired;
}

window.renderInventory = function() {
  const container = document.getElementById('inventory-list');
  if (!container) return;
  const search = (document.getElementById('search-input')?.value || '').toLowerCase();

  let filtered = productsData.filter(p => {
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
};

window.setFilter = function(status, btn) {
  activeFilterStatus = status;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderInventory();
};

function renderShoppingList() {
  const container = document.getElementById('shopping-list');
  if (!container) return;

  const reorderItems = productsData.filter(p => p.qty <= 1 || p.repurchase === 'Yes');

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

window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.style.display = 'block';

  if (tabId === 'settings') renderSettingsTab();
  if (tabId === 'shopping') renderShoppingList();
};

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
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

// IMPORT / EXPORT / CLEAR
window.exportData = function() {
  const data = { categories: categoriesData, locations: locationsData, products: productsData };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `check_it_yourshelf_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
};

window.importData = async function(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.categories) {
        for (const cat of data.categories) {
          const { id, ...item } = cat;
          await addDoc(collection(db, "categories"), { ...item, householdId: HOUSEHOLD_ID });
        }
      }
      if (data.locations) {
        for (const loc of data.locations) {
          const { id, ...item } = loc;
          await addDoc(collection(db, "locations"), { ...item, householdId: HOUSEHOLD_ID });
        }
      }
      if (data.products) {
        for (const prod of data.products) {
          const { id, ...item } = prod;
          await addDoc(collection(db, "products"), { ...item, householdId: HOUSEHOLD_ID });
        }
      }
      showToast('Data imported successfully!');
    } catch (err) {
      alert('Invalid JSON File Format.');
    }
  };
  reader.readAsText(file);
};

window.clearAllData = async function() {
  if (confirm('Are you sure you want to reset all data for this Household Sync Key?')) {
    const deleteByQuery = async (collName) => {
      const q = query(collection(db, collName), where("householdId", "==", HOUSEHOLD_ID));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    };

    await deleteByQuery("categories");
    await deleteByQuery("locations");
    await deleteByQuery("products");

    showToast('All data cleared.');
  }
};
