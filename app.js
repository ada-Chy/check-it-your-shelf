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
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9-RXk_3Lu-WIcQX3bYszqdAW0KbLqWO0",
  authDomain: "check-it-yourshelf.firebaseapp.com",
  databaseURL: "https://check-it-yourshelf-default-rtdb.firebaseio.com",
  projectId: "check-it-yourshelf",
  storageBucket: "check-it-yourshelf.firebasestorage.app",
  messagingSenderId: "233293179677",
  appId: "1:233293179677:web:3d75068654065ee8938ff4"
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

// STATE STORE
let categoriesData = [];
let locationsData = [];
let productsData = [];
let activeFilterStatus = 'all';

// APPLICATION INITIALIZATION & FIRESTORE REALTIME LISTENERS
document.addEventListener('DOMContentLoaded', () => {
  initFirestoreListeners();
});

function initFirestoreListeners() {
  // 1. Categories Listener
  onSnapshot(collection(db, "categories"), async (snapshot) => {
    if (snapshot.empty) {
      await seedDefaultCategories();
      return;
    }
    categoriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAllDropdowns();
    renderCategoryManager();
  });

  // 2. Locations Listener
  onSnapshot(collection(db, "locations"), async (snapshot) => {
    if (snapshot.empty) {
      await seedDefaultLocations();
      return;
    }
    locationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderAllDropdowns();
    renderLocationManager();
  });

  // 3. Products Listener
  onSnapshot(collection(db, "products"), (snapshot) => {
    productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateDatalists();
    renderDashboard();
    renderInventory();
    renderShoppingList();
  });
}

// SEED INITIAL DEFAULT DATA TO FIRESTORE IF EMPTY
async function seedDefaultCategories() {
  for (const cat of DEFAULT_CATEGORIES) {
    await addDoc(collection(db, "categories"), cat);
  }
}

async function seedDefaultLocations() {
  for (const loc of DEFAULT_LOCATIONS) {
    await addDoc(collection(db, "locations"), loc);
  }
}

// 1. AUTO-PREDICTION DATALIST POPULATION
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
  if (!select) return;
  
  let html = '<option value="">-- Select Category --</option>';
  categoriesData.forEach(c => {
    const sel = c.name === selectedCat ? 'selected' : '';
    html += `<option value="${escapeHtml(c.name)}" ${sel}>${escapeHtml(c.name)}</option>`;
  });
  html += `<option value="__ADD_NEW_CAT__" style="font-weight: bold; color: #1d64d8;">+ Add New Category...</option>`;
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
  html += `<option value="__ADD_NEW_SUBCAT__" style="font-weight: bold; color: #1d64d8;">+ Add New Sub-Category...</option>`;
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
  html += `<option value="__ADD_NEW_ROOM__" style="font-weight: bold; color: #1d64d8;">+ Add New Room...</option>`;
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
  html += `<option value="__ADD_NEW_SPOT__" style="font-weight: bold; color: #1d64d8;">+ Add New Storage Spot...</option>`;
  select.innerHTML = html;
}

// DROPDOWN CHANGE EVENT HANDLERS
window.handleCategoryChange = function(select) {
  if (select.value === '__ADD_NEW_CAT__') {
    promptAddCategory();
  } else {
    renderSubCategoryDropdown(select.value);
  }
};

window.handleSubCategoryChange = function(select) {
  const parentCat = document.getElementById('prod-cat').value;
  if (select.value === '__ADD_NEW_SUBCAT__') {
    if (!parentCat || parentCat === '__ADD_NEW_CAT__') {
      alert('Please select a Main Category first.');
      select.value = '';
      return;
    }
    promptAddSubCategory(parentCat);
  }
};

window.handleRoomChange = function(select) {
  if (select.value === '__ADD_NEW_ROOM__') {
    promptAddRoom();
  } else {
    renderSpotDropdown(select.value);
  }
};

window.handleSpotChange = function(select) {
  const parentRoom = document.getElementById('prod-room').value;
  if (select.value === '__ADD_NEW_SPOT__') {
    if (!parentRoom || parentRoom === '__ADD_NEW_ROOM__') {
      alert('Please select a Main Room first.');
      select.value = '';
      return;
    }
    promptAddSpot(parentRoom);
  }
};

// 3. CATEGORY MANAGER & LOCATION MANAGER INTERACTIVE LOGIC
function renderCategoryManager() {
  const container = document.getElementById('category-manager-list');
  if (!container) return;

  if (categoriesData.length === 0) {
    container.innerHTML = `<div class="empty-msg">No categories created yet.</div>`;
    return;
  }

  container.innerHTML = categoriesData.map((cat) => `
    <div class="cat-card">
      <div class="cat-card-header">
        <span class="cat-card-title">${escapeHtml(cat.name)}</span>
        <div class="cat-card-actions">
          <button class="btn-icon btn-add-sub" onclick="promptAddSubCategory('${escapeHtml(cat.name)}')" title="Add Sub-Category">+</button>
          <button class="btn-icon btn-del-cat" onclick="deleteCategory('${cat.id}')" title="Delete Category">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
      <div class="cat-card-body">
        <div class="sub-pill-list">
          ${(cat.subs || []).map((sub, subIdx) => `
            <span class="sub-pill">
              ${escapeHtml(sub)}
              <button class="pill-remove" onclick="deleteSubCategory('${cat.id}',${subIdx})">&times;</button>
            </span>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

function renderLocationManager() {
  const container = document.getElementById('location-manager-list');
  if (!container) return;

  if (locationsData.length === 0) {
    container.innerHTML = `<div class="empty-msg">No locations created yet.</div>`;
    return;
  }

  container.innerHTML = locationsData.map((loc) => `
    <div class="cat-card">
      <div class="cat-card-header">
        <span class="cat-card-title">${escapeHtml(loc.name)}</span>
        <div class="cat-card-actions">
          <button class="btn-icon btn-add-sub" onclick="promptAddSpot('${escapeHtml(loc.name)}')" title="Add Storage Spot">+</button>
          <button class="btn-icon btn-del-cat" onclick="deleteRoom('${loc.id}')" title="Delete Room">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
      <div class="cat-card-body">
        <div class="sub-pill-list">
          ${(loc.spots || []).map((spot, spotIdx) => `
            <span class="sub-pill">
              ${escapeHtml(spot)}
              <button class="pill-remove" onclick="deleteSpot('${loc.id}',${spotIdx})">&times;</button>
            </span>
          `).join('')}
        </div>
      </div>
    </div>
  `).join('');
}

// PROMPT HELPER FUNCTIONS (FIRESTORE MUTATIONS)
window.promptAddCategory = async function() {
  const name = prompt('Enter new Category Name:');
  if (name && name.trim()) {
    const trimmed = name.trim();
    if (!categoriesData.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      await addDoc(collection(db, "categories"), { name: trimmed, subs: [] });
      showToast('Category added!');
    }
  }
};

window.promptAddSubCategory = async function(catName) {
  const name = prompt(`Enter new Sub-Category for "${catName}":`);
  if (name && name.trim()) {
    const trimmed = name.trim();
    const cat = categoriesData.find(c => c.name === catName);
    if (cat) {
      const updatedSubs = cat.subs || [];
      if (!updatedSubs.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
        updatedSubs.push(trimmed);
        await updateDoc(doc(db, "categories", cat.id), { subs: updatedSubs });
        showToast('Sub-category added!');
      }
    }
  }
};

window.promptAddRoom = async function() {
  const name = prompt('Enter new Room Name:');
  if (name && name.trim()) {
    const trimmed = name.trim();
    if (!locationsData.some(l => l.name.toLowerCase() === trimmed.toLowerCase())) {
      await addDoc(collection(db, "locations"), { name: trimmed, spots: [] });
      showToast('Room added!');
    }
  }
};

window.promptAddSpot = async function(roomName) {
  const name = prompt(`Enter new Storage Spot for "${roomName}":`);
  if (name && name.trim()) {
    const trimmed = name.trim();
    const loc = locationsData.find(l => l.name === roomName);
    if (loc) {
      const updatedSpots = loc.spots || [];
      if (!updatedSpots.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
        updatedSpots.push(trimmed);
        await updateDoc(doc(db, "locations", loc.id), { spots: updatedSpots });
        showToast('Storage spot added!');
      }
    }
  }
};

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

// 4. INVENTORY FORM HANDLERS
window.handleFormSubmit = async function(e) {
  e.preventDefault();
  const id = document.getElementById('prod-id').value;
  
  const productData = {
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

// 5. INVENTORY & DASHBOARD RENDERING
function renderDashboard() {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const total = productsData.length;
  const low = productsData.filter(p => p.qty <= 1 && p.status !== 'Finished').length;
  const expired = productsData.filter(p => p.expDate && p.expDate < today).length;
  const expiring = productsData.filter(p => p.expDate && p.expDate >= today && p.expDate <= thirtyDaysOut).length;

  const totalEl = document.getElementById('dash-total');
  const lowEl = document.getElementById('dash-low');
  const expiringEl = document.getElementById('dash-expiring');
  const expiredEl = document.getElementById('dash-expired');

  if (totalEl) totalEl.innerText = total;
  if (lowEl) lowEl.innerText = low;
  if (expiringEl) expiringEl.innerText = expiring;
  if (expiredEl) expiredEl.innerText = expired;
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

// 6. GENERAL NAVIGATION & UTILITIES
window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.style.display = 'block';

  const navBtns = document.querySelectorAll('.nav-tab');
  const tabsOrder = ['dashboard', 'inventory', 'add', 'categories', 'locations', 'shopping', 'settings'];
  const idx = tabsOrder.indexOf(tabId);
  if (idx > -1 && navBtns[idx]) navBtns[idx].classList.add('active');

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

// SETTINGS & DATA PORTABILITY (FIRESTORE BASED)
window.exportData = function() {
  const data = {
    categories: categoriesData,
    locations: locationsData,
    products: productsData
  };
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
          await addDoc(collection(db, "categories"), item);
        }
      }
      if (data.locations) {
        for (const loc of data.locations) {
          const { id, ...item } = loc;
          await addDoc(collection(db, "locations"), item);
        }
      }
      if (data.products) {
        for (const prod of data.products) {
          const { id, ...item } = prod;
          await addDoc(collection(db, "products"), item);
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
  if (confirm('Are you sure you want to reset all data in Firestore? This action cannot be undone.')) {
    const deleteCollection = async (collName) => {
      const snapshot = await getDocs(collection(db, collName));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    };

    await deleteCollection("categories");
    await deleteCollection("locations");
    await deleteCollection("products");

    showToast('All data cleared.');
  }
};
