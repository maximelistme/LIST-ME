// ============================================================
// shopping.js — Courses, Listes partagées
// VERSION CORRIGÉE : fonctions manquantes ajoutées
// ============================================================

// ---- NAVIGATION CATÉGORIES ----
function shoppingNavigateTo(cat) { shoppingSearchQuery = ""; currentShoppingPath.push(cat); renderShoppingCategories(); }
function shoppingNavigateBack() { shoppingSearchQuery = ""; currentShoppingPath.pop(); renderShoppingCategories(); }
function handleShoppingSearch(val) { shoppingSearchQuery = val; renderShoppingCategories(); }

function formatProductDisplay(name) {
    return (name || "").replace(/\(([^)]+)\)/g, '<span style="color:transparent; font-size:0; opacity:0; pointer-events:none;">($1)</span>');
}

// ---- AFFICHAGE CATÉGORIES ----
function renderShoppingCategories() {
    const container = document.getElementById('shopping-categories'), breadcrumb = document.getElementById('shopping-breadcrumb');
    if (!container || !breadcrumb) return;

    if (currentShoppingListId !== 'personal' && typeof mySharedLists !== "undefined") {
        const listObj = mySharedLists.find(l => l.id === currentShoppingListId);
        if (listObj && listObj.type === 'event' && listObj.createdBy !== currentUser.uid) {
            breadcrumb.innerText = "Accès restreint";
            container.innerHTML = `<div style="grid-column: 1 / -1; background: rgba(128,128,128,0.05); border: 2px dashed var(--warning); padding: 25px 15px; border-radius: 12px; text-align: center;"><strong style="color: var(--warning);">Mode Événement : Accès restreint.</strong></div>`;
            return;
        }
    }

    container.innerHTML = '';
    breadcrumb.innerText = currentShoppingPath.length === 0 ? '' : currentShoppingPath[currentShoppingPath.length - 1];

    container.innerHTML += `<div style="grid-column: 1 / -1; display: flex; gap: 10px; width: 100%; align-items: center; margin-bottom: 5px;">
        <div onclick="${currentShoppingPath.length === 0 ? '' : 'shoppingNavigateBack()'}" style="flex: 1; background:rgba(128,128,128,0.1); padding:12px; border-radius:12px; text-align:center; font-weight:bold; cursor:pointer;">⬅️ Retour</div>
        <input type="text" id="shopping-search" placeholder="🔍 Rechercher..." oninput="handleShoppingSearch(this.value)" value="${shoppingSearchQuery}" style="flex: 2; padding: 12px; border-radius: 12px; border: 1px solid rgba(128,128,128,0.3);">
    </div>`;
    container.innerHTML += `<div onclick="openCustomCardModal()" style="grid-column: 1 / -1; background:var(--primary); color:white; padding:10px; border-radius:20px; text-align:center; cursor:pointer; width: 70%; margin: 0 auto 10px auto;">+ Nouveau Produit</div>`;

    // Recherche globale
    if (shoppingSearchQuery.trim().length > 0) {
        const q = shoppingSearchQuery.toLowerCase();
        let results = [];
        function searchObj(obj, path) {
            if (Array.isArray(obj)) { obj.forEach(p => { if (p.toLowerCase().includes(q)) results.push({ name: p, path }); }); }
            else if (typeof obj === 'object') { Object.keys(obj).forEach(k => searchObj(obj[k], [...path, k])); }
        }
        searchObj(foodCategories, []);
        customShoppingCards.forEach(c => { if (c.name.toLowerCase().includes(q)) results.push({ name: c.name, isCustom: true, id: c.id }); });
        if (results.length === 0) { container.innerHTML += `<div style="grid-column:1/-1; text-align:center; opacity:0.5; font-style:italic; padding:20px;">Aucun résultat pour "${shoppingSearchQuery}"</div>`; return; }
        results.forEach(r => {
            if (r.isCustom) container.innerHTML += `<div onclick="openShoppingItemModal('${r.id.replace(/'/g, "\\'")}', true)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; cursor:pointer; border:2px dashed var(--primary);">+ ${r.name}</div>`;
            else container.innerHTML += `<div onclick="openShoppingItemModal('${r.name.replace(/'/g, "\\'")}', false)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; cursor:pointer; border:1px solid rgba(128,128,128,0.2);">+ ${formatProductDisplay(r.name)}</div>`;
        });
        return;
    }

    let currentObj = foodCategories;
    for (let step of currentShoppingPath) { if (currentObj && currentObj[step]) currentObj = currentObj[step]; }
    let defaultFolders = [], defaultProducts = [];
    if (currentObj && !Array.isArray(currentObj)) defaultFolders = Object.keys(currentObj);
    else if (Array.isArray(currentObj)) defaultProducts = currentObj;

    defaultFolders.forEach(cat => {
        container.innerHTML += `<div onclick="shoppingNavigateTo('${cat.replace(/'/g, "\\'")}')" style="background:var(--primary); color:white; padding:15px; border-radius:12px; text-align:center; font-weight:bold; cursor:pointer;">${cat}</div>`;
    });
    defaultProducts.forEach(p => {
        container.innerHTML += `<div onclick="openShoppingItemModal('${p.replace(/'/g, "\\'")}', false)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; cursor:pointer; border:1px solid rgba(128,128,128,0.2);">+ ${formatProductDisplay(p)}</div>`;
    });
    customShoppingCards.filter(c => c.path === currentShoppingPath.join('/')).forEach(p => {
        container.innerHTML += `<div onclick="openShoppingItemModal('${p.id.replace(/'/g, "\\'")}', true)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; cursor:pointer; border:2px dashed var(--primary);">+ ${p.name}</div>`;
    });
}

// ---- MODALE AJOUT PRODUIT ----
let _pendingItemName = "", _pendingIsCustom = false;

function openShoppingItemModal(nameOrId, isCustom) {
    _pendingItemName = nameOrId;
    _pendingIsCustom = isCustom;

    let displayName = nameOrId;
    let allowedUnits = ["", "g", "kg", "L", "cl", "Pack", "Rouleau", "Boîte"];

    if (isCustom) {
        const card = customShoppingCards.find(c => c.id === nameOrId);
        if (card) { displayName = card.name; allowedUnits = card.units || [""]; }
    } else {
        // Unités par défaut selon catégorie
        const nameLower = nameOrId.toLowerCase();
        if (["lait", "jus", "eau", "sirop", "vin", "bière"].some(k => nameLower.includes(k))) allowedUnits = ["", "L", "cl", "Pack"];
        else if (["farine", "sucre", "riz", "pâtes", "lentille"].some(k => nameLower.includes(k))) allowedUnits = ["", "g", "kg"];
        else allowedUnits = ["", "g", "kg", "L", "cl", "Pack", "Boîte"];
    }

    document.getElementById('shopping-modal-title').innerText = "Ajouter : " + displayName.replace(/\s*\(.*?\)/g, '');
    document.getElementById('shopping-qty').value = 1;

    const unitSelect = document.getElementById('shopping-unit');
    unitSelect.innerHTML = allowedUnits.map(u => `<option value="${u}">${u === "" ? "Pièce(s)" : u}</option>`).join('');

    // Assignation à un membre (si liste partagée)
    const assigneeContainer = document.getElementById('assignee-container');
    const assigneeSelect = document.getElementById('shopping-assignee');
    if (currentShoppingListId !== 'personal' && friends.length > 0) {
        assigneeContainer.style.display = 'block';
        const listObj = mySharedLists.find(l => l.id === currentShoppingListId);
        const members = listObj ? (listObj.memberNames || {}) : {};
        assigneeSelect.innerHTML = `<option value="">Personne en particulier</option>`;
        assigneeSelect.innerHTML += `<option value="${currentUser.uid}">Moi</option>`;
        friends.forEach(f => { assigneeSelect.innerHTML += `<option value="${f.uid}">${f.nickname}</option>`; });
    } else {
        assigneeContainer.style.display = 'none';
    }

    document.getElementById('shopping-item-modal').style.display = 'flex';
}

function saveShoppingItem() {
    const qty = parseInt(document.getElementById('shopping-qty').value) || 1;
    const unit = document.getElementById('shopping-unit').value;
    const assignee = document.getElementById('shopping-assignee')?.value || "";

    let name = _pendingItemName;
    if (_pendingIsCustom) {
        const card = customShoppingCards.find(c => c.id === _pendingItemName);
        if (card) name = card.name;
    } else {
        name = name.replace(/\s*\(.*?\)/g, '').trim();
    }

    const unitLabel = unit === "" ? "pièce(s)" : unit;
    const info = `${qty} ${unitLabel}`;

    let itemData = {
        name: name,
        info: info,
        qty: qty,
        unit: unitLabel,
        completed: false,
        userId: currentUser.uid,
        createdAt: Date.now()
    };

    if (currentShoppingListId === 'personal') {
        itemData.listId = null;
    } else {
        itemData.listId = currentShoppingListId;
        if (assignee) itemData.assignedTo = assignee;
    }

    const collection = currentShoppingListId === 'personal'
        ? db.collection("shopping").where("userId", "==", currentUser.uid)
        : db.collection("shopping");

    db.collection("shopping").add(itemData).then(() => {
        showToast(`${name} ajouté ! 🛒`);
        document.getElementById('shopping-item-modal').style.display = 'none';
        scrollToShoppingList();
    });
}

// ---- NOUVEAU PRODUIT PERSONNALISÉ ----
function openCustomCardModal() {
    const select = document.getElementById('custom-card-category');
    if (select) {
        select.innerHTML = Object.keys(foodCategories).map(k => `<option value="${k}">${k}</option>`).join('');
    }
    document.getElementById('custom-card-name').value = '';
    document.querySelectorAll('.custom-unit-cb').forEach(cb => cb.checked = cb.value === "");
    document.getElementById('custom-card-modal').style.display = 'flex';
}

function saveCustomCard() {
    const name = document.getElementById('custom-card-name').value.trim();
    const category = document.getElementById('custom-card-category').value;
    const units = Array.from(document.querySelectorAll('.custom-unit-cb:checked')).map(cb => cb.value);
    if (!name) { showToast("Veuillez saisir un nom ! ⚠️"); return; }

    const newCard = {
        id: 'custom_' + Date.now(),
        name: name,
        path: category,
        units: units,
        createdAt: Date.now()
    };

    customShoppingCards.push(newCard);
    db.collection("users").doc(currentUser.uid).set({ customCards: customShoppingCards }, { merge: true }).then(() => {
        showToast(`Produit "${name}" créé ! ✨`);
        document.getElementById('custom-card-modal').style.display = 'none';
        renderShoppingCategories();
    });
}

// ---- ONGLETS & SYNCHRO ----
function renderShoppingTabs() {
    const container = document.getElementById('shopping-tabs-dynamic');
    if (!container) return;
    container.style.display = (mySharedLists && mySharedLists.length > 0) ? 'flex' : 'none';
    container.innerHTML = '';
    const personalBtn = document.createElement('button');
    personalBtn.className = `sub-menu-tab ${currentShoppingListId === 'personal' ? 'active' : ''}`;
    personalBtn.innerText = "Ma liste";
    personalBtn.onclick = () => switchShoppingListTab("personal");
    container.appendChild(personalBtn);
    mySharedLists.forEach(list => {
        const listBtn = document.createElement('button');
        listBtn.className = `sub-menu-tab ${currentShoppingListId === list.id ? 'active' : ''}`;
        listBtn.innerText = list.name;
        listBtn.onclick = () => switchShoppingListTab(list.id);
        container.appendChild(listBtn);
    });
}

function switchShoppingListTab(listId) {
    currentShoppingListId = listId;
    renderShoppingTabs();
    renderShoppingCategories();
    syncCurrentShoppingItems();
    updateParticipantsDisplay();
}

function syncCurrentShoppingItems() {
    if (shoppingItemsUnsubscribe) shoppingItemsUnsubscribe();
    let query = (currentShoppingListId === "personal")
        ? db.collection("shopping").where("userId", "==", currentUser.uid).where("listId", "==", null)
        : db.collection("shopping").where("listId", "==", currentShoppingListId);
    shoppingItemsUnsubscribe = query.onSnapshot((snapshot) => {
        shoppingItems = [];
        snapshot.forEach(doc => { let d = doc.data(); d.id = doc.id; shoppingItems.push(d); });
        renderShoppingList();
    });
}

function updateParticipantsDisplay() {
    const el = document.getElementById('shopping-list-participants');
    if (!el) return;
    if (currentShoppingListId === 'personal') { el.style.display = 'none'; return; }
    const listObj = mySharedLists.find(l => l.id === currentShoppingListId);
    if (!listObj) { el.style.display = 'none'; return; }
    const count = listObj.members ? listObj.members.length : 1;
    el.style.display = 'block';
    el.innerText = `👥 ${count} participant(s) · Code : ${listObj.code || '---'}`;
}

// ---- RENDU LISTE DE COURSES ----
function renderShoppingList() {
    const c = document.getElementById('shopping-list-content');
    if (!c) return;
    c.innerHTML = '';

    const sortMode = document.getElementById('shopping-sort-filter')?.value || 'date';
    let actives = shoppingItems.filter(i => !i.completed);
    let completeds = shoppingItems.filter(i => i.completed);

    const sortFn = (a, b) => {
        if (sortMode === 'alpha') return (a.name || "").localeCompare(b.name || "");
        if (sortMode === 'rayon') return (a.name || "").localeCompare(b.name || "");
        if (sortMode === 'owner') return (a.assignedTo || "").localeCompare(b.assignedTo || "");
        return (b.createdAt || 0) - (a.createdAt || 0);
    };
    actives.sort(sortFn);
    completeds.sort(sortFn);

    const isCreator = (mySharedLists.find(l => l.id === currentShoppingListId)?.createdBy === currentUser?.uid);

    if (actives.length === 0 && completeds.length === 0) {
        c.innerHTML = `<p style="text-align:center; opacity:0.4; font-style:italic; margin-top:30px;">Ta liste est vide ! Ajoute des produits ☝️</p>`;
        return;
    }

    actives.forEach(item => {
        const canDelete = (currentShoppingListId === 'personal' || isCreator || item.userId === currentUser?.uid);
        const assigneeTag = item.assignedTo ? `<small style="color:var(--primary); font-size:0.75rem;">→ ${getFriendName(item.assignedTo)}</small>` : '';
        c.innerHTML += `<div class="task-card low" style="border-left-color: var(--primary);">
            <div style="flex:1; cursor:pointer;" onclick="toggleShoppingCheck('${item.id}', false)">
                <strong>${item.name}</strong>
                <small style="display:block; margin-top:2px; opacity:0.7;">${item.info || ''} ${assigneeTag}</small>
            </div>
            ${canDelete ? `<button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>` : ''}
        </div>`;
    });

    if (completeds.length > 0) {
        c.innerHTML += `<div class="task-section-separator"><span>Articles cochés</span></div>`;
        completeds.forEach(item => {
            const canDelete = (currentShoppingListId === 'personal' || isCreator || item.userId === currentUser?.uid);
            c.innerHTML += `<div class="task-card completed-bubble">
                <div style="flex:1; cursor:pointer;" onclick="toggleShoppingCheck('${item.id}', true)">
                    <s style="opacity:0.5;">${item.name}</s>
                    <small style="display:block; opacity:0.4;">${item.info || ''}</small>
                </div>
                ${canDelete ? `<button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>` : ''}
            </div>`;
        });

        // Bouton vider cochés
        c.innerHTML += `<div style="text-align:center; margin-top:10px;">
            <button onclick="clearCompletedShopping()" class="btn-secondary" style="font-size:0.85rem; padding:8px 16px;">🗑️ Vider les articles cochés</button>
        </div>`;
    }

    document.getElementById('shopping-scroll-up-btn').style.display = 'flex';
}

function getFriendName(uid) {
    if (uid === currentUser?.uid) return "Moi";
    const f = friends.find(f => f.uid === uid);
    return f ? f.nickname : "Inconnu";
}

// ---- SCROLL HELPERS ----
function scrollToShoppingList() {
    document.getElementById('shopping-list-header')?.scrollIntoView({ behavior: 'smooth' });
}
function scrollToTopShopping() {
    document.getElementById('shopping-categories')?.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('shopping-scroll-up-btn').style.display = 'none';
}

// ---- ACTIONS ARTICLES ----
function toggleShoppingCheck(id, isCompleted) { db.collection("shopping").doc(id).update({ completed: !isCompleted }); }
function deleteShoppingItem(id) { db.collection("shopping").doc(id).delete(); }
function clearCompletedShopping() {
    const completeds = shoppingItems.filter(i => i.completed);
    completeds.forEach(i => db.collection("shopping").doc(i.id).delete());
    showToast("Articles cochés supprimés ! 🗑️");
}
function autoArchiveShoppingItems() {
    const today = new Date().toISOString().split('T')[0];
    db.collection("shopping").where("completed", "==", true).get().then(snap => {
        snap.forEach(doc => {
            if (doc.data().createdAt && new Date(doc.data().createdAt).toISOString().split('T')[0] < today)
                doc.ref.delete();
        });
    });
}
setInterval(autoArchiveShoppingItems, 3600000);

// ---- LISTES PARTAGÉES ----
function openCustomShoppingListShareModal() {
    renderMySharedListsInModal();
    renderShoppingTabs();
    renderFriendsCheckboxesForNewList();
    document.getElementById('shopping-list-multi-share-modal').style.display = 'flex';
}

function renderMySharedListsInModal() {
    const container = document.getElementById('my-shared-lists-container');
    if (!container) return;
    if (!mySharedLists || mySharedLists.length === 0) {
        container.innerHTML = `<p style="font-size: 0.9rem; opacity: 0.6; font-style: italic; text-align: center; padding: 10px;">Aucune liste partagée active.</p>`;
        return;
    }
    container.innerHTML = mySharedLists.map(l => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px; border-radius:8px; border: 1px solid rgba(128,128,128,0.1); gap: 10px; box-sizing: border-box; margin-bottom: 5px;">
            <div style="flex: 1; min-width: 0;">
                <strong style="display:block; color:var(--primary-dark); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${l.name || "Sans nom"}</strong>
                <small style="color:var(--primary); font-weight:bold; background:rgba(128,128,128,0.1); padding:2px 6px; border-radius:4px; display:inline-block; margin-top:2px;">Code: ${l.code || "---"}</small>
            </div>
            <div style="display:flex; gap:8px; flex-shrink:0;">
                <button onclick="copyListCode('${l.code}')" style="background:none; border:none; cursor:pointer; font-size:1.1rem;">📋</button>
                <button onclick="leaveSharedList('${l.id}')" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer; font-weight:bold;">Quitter</button>
            </div>
        </div>`).join('');
}

function renderFriendsCheckboxesForNewList() {
    const container = document.getElementById('create-list-friends-container'), box = document.getElementById('create-list-friends-checkboxes');
    if (box) box.innerHTML = friends.map(f => `<label style="display:flex; align-items:center; gap:5px; font-size:0.85rem;"><input type="checkbox" class="friend-invite-cb" value="${f.uid}"> ${f.nickname}</label>`).join('');
    if (container) container.style.display = friends.length > 0 ? 'block' : 'none';
}

function createNewSharedShoppingList() {
    const name = document.getElementById('new-shared-list-name').value.trim();
    if (!name) { showToast("Veuillez saisir un nom ! ⚠️"); return; }
    const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const listType = document.getElementById('new-list-type').value;
    let selectedFriends = Array.from(document.querySelectorAll('.friend-invite-cb:checked')).map(cb => cb.value);
    db.collection("shoppingLists").add({
        name: name, code: uniqueCode, createdBy: currentUser.uid,
        members: [currentUser.uid, ...selectedFriends], type: listType, createdAt: Date.now()
    }).then((docRef) => {
        document.getElementById('new-shared-list-name').value = '';
        document.getElementById('shopping-list-multi-share-modal').style.display = 'none';
        // Afficher le code de succès
        document.getElementById('success-list-name').innerText = name;
        document.getElementById('success-list-code').innerText = uniqueCode;
        document.getElementById('share-success-modal').style.display = 'flex';
    });
}

function joinSharedShoppingList() {
    const code = document.getElementById('join-shared-list-code').value.trim().toUpperCase();
    if (!code) { showToast("Veuillez saisir un code ! ⚠️"); return; }
    db.collection("shoppingLists").where("code", "==", code).get().then(snapshot => {
        if (snapshot.empty) { showToast("Code introuvable ! ❌"); return; }
        let listDoc = snapshot.docs[0];
        let listData = listDoc.data();
        if (listData.members && listData.members.includes(currentUser.uid)) {
            showToast("Vous êtes déjà membre de cette liste ! 🤝"); return;
        }
        let members = listData.members || [];
        members.push(currentUser.uid);
        db.collection("shoppingLists").doc(listDoc.id).update({ members: members }).then(() => {
            showToast(`Liste "${listData.name}" rejointe ! 🛒`);
            document.getElementById('join-shared-list-code').value = '';
        });
    }).catch(() => showToast("Erreur réseau ❌"));
}

function leaveSharedList(listId) {
    const listObj = mySharedLists.find(l => l.id === listId);
    if (!listObj) return;
    if (listObj.createdBy === currentUser.uid) {
        // Créateur : supprime la liste entièrement
        db.collection("shoppingLists").doc(listId).delete().then(() => {
            if (currentShoppingListId === listId) currentShoppingListId = 'personal';
            showToast("Liste supprimée ! 🗑️");
            renderMySharedListsInModal();
        });
    } else {
        // Membre : se retire
        let members = listObj.members.filter(m => m !== currentUser.uid);
        db.collection("shoppingLists").doc(listId).update({ members: members }).then(() => {
            if (currentShoppingListId === listId) currentShoppingListId = 'personal';
            showToast("Vous avez quitté la liste ! 👋");
            renderMySharedListsInModal();
        });
    }
}

function copyListCode(code) {
    navigator.clipboard.writeText(code).then(() => showToast(`Code "${code}" copié ! 📋`));
}
