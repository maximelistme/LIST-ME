// --- NAVIGATIONS ET OUTILS ---
function shoppingNavigateTo(cat) { shoppingSearchQuery = ""; currentShoppingPath.push(cat); renderShoppingCategories(); }
function formatProductDisplay(name) { return (name||"").replace(/\(([^)]+)\)/g, '<span style="color:transparent; font-size:0; opacity:0; pointer-events:none;">($1)</span>'); }
function shoppingNavigateBack() { shoppingSearchQuery = ""; currentShoppingPath.pop(); renderShoppingCategories(); }

// --- AFFICHAGE CATEGORIES ---
function renderShoppingCategories() {
    const container = document.getElementById('shopping-categories'), breadcrumb = document.getElementById('shopping-breadcrumb'); if(!container || !breadcrumb) return;
    if (currentShoppingListId !== 'personal' && typeof mySharedLists !== "undefined") {
        const listObj = mySharedLists.find(l => l.id === currentShoppingListId);
        if (listObj && listObj.type === 'event' && listObj.createdBy !== currentUser.uid) {
            breadcrumb.innerText = "Accès restreint";
            container.innerHTML = `<div style="grid-column: 1 / -1; background: rgba(128,128,128,0.05); border: 2px dashed var(--warning); padding: 25px 15px; border-radius: 12px; text-align: center;"><span style="font-size: 2rem; display:block; margin-bottom: 10px;">🛡️</span><strong style="color: var(--primary-dark); font-size: 1.1rem; display:block; margin-bottom: 5px;">Mode Événement</strong><span style="font-style: italic; opacity: 0.8; font-size: 0.9rem;">Vous êtes invité. Seul l'organisateur gère la liste.</span></div>`;
            return; 
        }
    }
    let isFocused = (document.activeElement && document.activeElement.id === 'shopping-search'); container.innerHTML = '';
    breadcrumb.innerText = currentShoppingPath.length === 0 ? '' : currentShoppingPath[currentShoppingPath.length - 1]; const isAtRoot = (currentShoppingPath.length === 0);
    container.innerHTML += `<div style="grid-column: 1 / -1; display: flex; gap: 10px; width: 100%; align-items: center; margin-bottom: 5px;"><div onclick="${isAtRoot ? '' : 'shoppingNavigateBack()'}" style="flex: 1; background:rgba(128,128,128,0.1); color:var(--text-color); padding:12px; border-radius:12px; text-align:center; font-weight:bold; ${isAtRoot ? 'opacity: 0.3; cursor: default; pointer-events: none;' : 'cursor: pointer;'}">⬅️ Retour</div><input type="text" id="shopping-search" placeholder="🔍 Rechercher..." oninput="handleShoppingSearch(this.value)" value="${shoppingSearchQuery}" style="flex: 2; padding: 12px; border-radius: 12px; border: 1px solid rgba(128,128,128,0.3); background: var(--card-bg); color: var(--text-color); font-size: 1rem; font-weight: bold; outline: none;"></div>`;
    container.innerHTML += `<div onclick="openCustomCardModal()" style="grid-column: 1 / -1; background:var(--primary); color:white; padding:10px; border-radius:20px; text-align:center; font-weight:bold; cursor:pointer; width: 70%; margin: 0 auto 10px auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);">+ Nouveau Produit</div>`;
    
    // Rendu des produits
    if (shoppingSearchQuery.trim() !== "") {
        let matches = [], q = shoppingSearchQuery.toLowerCase().trim();
        function extractMatches(obj) { if (Array.isArray(obj)) { obj.forEach(p => { if (p.toLowerCase().includes(q) && !matches.some(m => m.name === p)) matches.push({ name: p, isCustom: false }); }); } else if (typeof obj === 'object' && obj !== null) { for (let key in obj) { extractMatches(obj[key]); } } }
        extractMatches(foodCategories); customShoppingCards.forEach(card => { if (card.name.toLowerCase().includes(q) && !matches.some(m => m.id === card.id)) matches.push({ name: card.name, id: card.id, isCustom: true }); });
        matches.forEach(product => { let safe = product.isCustom ? product.id.replace(/'/g, "\\'") : product.name.replace(/'/g, "\\'"); container.innerHTML += `<div onclick="openShoppingItemModal('${safe}', ${product.isCustom})" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.05); font-weight:bold; cursor:pointer; border:${product.isCustom?'2px dashed var(--primary)':'1px solid rgba(128,128,128,0.2)'};">+ ${product.isCustom?product.name:formatProductDisplay(product.name)}</div>`; });
    } else {
        let defaultFolders = [], defaultProducts = [], currentObj = foodCategories, validDefaultPath = true;
        for (let step of currentShoppingPath) { if (currentObj && currentObj[step]) currentObj = currentObj[step]; else { validDefaultPath = false; break; } }
        if (currentObj) { if (Array.isArray(currentObj)) defaultProducts = currentObj; else defaultFolders = Object.keys(currentObj); }
        defaultFolders.forEach(cat => { container.innerHTML += `<div onclick="shoppingNavigateTo('${cat.replace(/'/g, "\\'")}')" style="background:var(--primary); color:white; padding:15px; border-radius:12px; text-align:center; font-weight:bold; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);">${cat}</div>`; });
        defaultProducts.forEach(p => { container.innerHTML += `<div onclick="openShoppingItemModal('${p.replace(/'/g, "\\'")}', false)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.05); font-weight:bold; cursor:pointer; border:1px solid rgba(128,128,128,0.2);">+ ${formatProductDisplay(p)}</div>`; });
        customShoppingCards.filter(c => c.path === currentPathStr).forEach(p => { container.innerHTML += `<div onclick="openShoppingItemModal('${p.id.replace(/'/g, "\\'")}', true)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.05); font-weight:bold; cursor:pointer; border:2px dashed var(--primary);">+ ${p.name}</div>`; });
    }
}

// --- LOGIQUE LISTE ET ATTRIBUTION ---
function handleShoppingSearch(val) { shoppingSearchQuery = val; renderShoppingCategories(); }
function syncCurrentShoppingItems() {
    if (typeof shoppingItemsUnsubscribe !== 'undefined' && shoppingItemsUnsubscribe) shoppingItemsUnsubscribe();
    if (!currentUser) return;
    let query = db.collection("shopping").where("listId", "==", currentShoppingListId);
    if (currentShoppingListId === "personal") { query = db.collection("shopping").where("userId", "==", currentUser.uid); }
    shoppingItemsUnsubscribe = query.onSnapshot((snapshot) => {
        shoppingItems = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; shoppingItems.push(data); });
        renderShoppingList();
    });
}

function renderShoppingList() {
    const c = document.getElementById('shopping-list-content'); if (!c) return; c.innerHTML = '';
    const actives = shoppingItems.filter(item => !item.completed), completeds = shoppingItems.filter(item => item.completed);
    const isCreator = (mySharedLists.find(l => l.id === currentShoppingListId)?.createdBy === currentUser.uid);
    actives.forEach(item => {
        const canDelete = (currentShoppingListId === 'personal' || isCreator || item.userId === currentUser.uid);
        c.innerHTML += `<div class="task-card" style="border-left: 6px solid var(--primary);"><div style="flex:1; display:flex; align-items:center; min-width:0;"><div onclick="toggleShoppingCheck('${item.id}', false)" style="width:20px; height:20px; border:2px solid var(--primary); border-radius:5px; margin-right:10px; cursor:pointer;"></div><div style="flex:1;"><strong style="display:block;">${item.name}</strong><small style="color:var(--primary); font-weight:bold;">${item.info}</small></div></div><div class="task-actions">${canDelete ? `<button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>` : ''}</div></div>`;
    });
    if (completeds.length > 0) {
        c.innerHTML += `<div class="task-section-separator"><span>Dans le chariot</span><button onclick="clearCompletedShopping()" style="background:none; border:none; color:var(--danger); font-size:0.85rem; text-decoration:underline; cursor:pointer;">Vider le cadie</button></div>`;
        completeds.forEach(item => {
            const canDelete = (currentShoppingListId === 'personal' || isCreator || item.userId === currentUser.uid);
            c.innerHTML += `<div class="task-card completed-bubble"><div style="flex:1; display:flex; align-items:center; min-width:0;"><div onclick="toggleShoppingCheck('${item.id}', true)" style="width:20px; height:20px; background:var(--success); border-radius:5px; margin-right:10px; cursor:pointer;">✓</div><div style="flex:1; text-decoration:line-through; opacity:0.6;"><strong>${item.name}</strong><br><small>${item.info}</small></div></div><div class="task-actions">${canDelete ? `<button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>` : ''}</div></div>`;
        });
    }
}

// --- MODALES & PARTAGE ---
function openCustomShoppingListShareModal() {
    renderMySharedListsInModal(); renderShoppingTabs(); renderFriendsCheckboxesForNewList();
    document.getElementById('shopping-list-multi-share-modal').style.display = 'flex';
}
function renderFriendsCheckboxesForNewList() {
    const container = document.getElementById('create-list-friends-container'), checkboxDiv = document.getElementById('create-list-friends-checkboxes'); 
    if (!container || !checkboxDiv) return;
    checkboxDiv.innerHTML = friends.map(f => `<label style="display:flex; align-items:center; gap:5px; font-size:0.8rem; cursor:pointer;"><input type="checkbox" class="friend-invite-cb" value="${f.uid}"> ${f.nickname}</label>`).join('');
    container.style.display = friends.length > 0 ? 'block' : 'none';
}
function renderMySharedListsInModal() {
    const container = document.getElementById('my-shared-lists-container'); if (!container) return;
    container.innerHTML = mySharedLists.map(l => `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px; border-radius:8px; width: 100%; gap: 10px; box-sizing: border-box;"><div style="flex:1; min-width:0;"><strong>${l.name}</strong><br><small>Code: ${l.code}</small></div><button onclick="leaveSharedList('${l.id}')" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;">Quitter</button></div>`).join('');
}
function createNewSharedShoppingList() {
    const name = document.getElementById('new-shared-list-name').value.trim(); if (!name) return;
    const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase(), listType = document.getElementById('new-list-type').value;
    let selectedFriends = Array.from(document.querySelectorAll('.friend-invite-cb:checked')).map(cb => cb.value);
    db.collection("shoppingLists").add({ name: name, code: uniqueCode, createdBy: currentUser.uid, members: [currentUser.uid, ...selectedFriends], type: listType, createdAt: Date.now() }).then(() => { 
        document.getElementById('shopping-list-multi-share-modal').style.display = 'none'; showToast("Liste créée !"); 
    });
}

// --- ACTIONS SIMPLES ---
function toggleShoppingCheck(id, isCompleted) { db.collection("shopping").doc(id).update({ completed: !isCompleted }); }
function deleteShoppingItem(id) { db.collection("shopping").doc(id).delete().then(() => showToast("Produit retiré !")); }
function clearCompletedShopping() { let completeds = shoppingItems.filter(item => item.completed); if (completeds.length === 0) return; Promise.all(completeds.map(item => db.collection("shopping").doc(item.id).delete())); }
function autoArchiveShoppingItems() { const today = new Date().toISOString().split('T')[0]; db.collection("shopping").where("completed", "==", true).get().then(snap => { snap.forEach(doc => { if (doc.data().createdAt && new Date(doc.data().createdAt).toISOString().split('T')[0] < today) doc.ref.delete(); }); }); }
setInterval(autoArchiveShoppingItems, 3600000);
