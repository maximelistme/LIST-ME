// --- NAVIGATIONS ---
function shoppingNavigateTo(cat) { shoppingSearchQuery = ""; currentShoppingPath.push(cat); renderShoppingCategories(); }
function formatProductDisplay(name) { return (name||"").replace(/\(([^)]+)\)/g, '<span style="color:transparent; font-size:0; opacity:0; pointer-events:none;">($1)</span>'); }
function shoppingNavigateBack() { shoppingSearchQuery = ""; currentShoppingPath.pop(); renderShoppingCategories(); }

// --- AFFICHAGE ---
function renderShoppingCategories() {
    const container = document.getElementById('shopping-categories'), breadcrumb = document.getElementById('shopping-breadcrumb'); if(!container || !breadcrumb) return;
    if (currentShoppingListId !== 'personal' && typeof mySharedLists !== "undefined") {
        const listObj = mySharedLists.find(l => l.id === currentShoppingListId);
        if (listObj && listObj.type === 'event' && listObj.createdBy !== currentUser.uid) {
            breadcrumb.innerText = "Accès restreint";
            container.innerHTML = `<div style="grid-column: 1 / -1; background: rgba(128,128,128,0.05); border: 2px dashed var(--warning); padding: 25px 15px; border-radius: 12px; text-align: center;"><strong style="color: var(--warning);">Mode Événement : Accès restreint.</strong></div>`;
            return; 
        }
    }
    container.innerHTML = ''; breadcrumb.innerText = currentShoppingPath.length === 0 ? '' : currentShoppingPath[currentShoppingPath.length - 1];
    container.innerHTML += `<div style="grid-column: 1 / -1; display: flex; gap: 10px; width: 100%; align-items: center; margin-bottom: 5px;"><div onclick="${currentShoppingPath.length === 0 ? '' : 'shoppingNavigateBack()'}" style="flex: 1; background:rgba(128,128,128,0.1); padding:12px; border-radius:12px; text-align:center; font-weight:bold; cursor:pointer;">⬅️ Retour</div><input type="text" id="shopping-search" placeholder="🔍 Rechercher..." oninput="handleShoppingSearch(this.value)" value="${shoppingSearchQuery}" style="flex: 2; padding: 12px; border-radius: 12px; border: 1px solid rgba(128,128,128,0.3);"></div>`;
    container.innerHTML += `<div onclick="openCustomCardModal()" style="grid-column: 1 / -1; background:var(--primary); color:white; padding:10px; border-radius:20px; text-align:center; cursor:pointer; width: 70%; margin: 0 auto 10px auto;">+ Nouveau Produit</div>`;
    
    // Logique de rendu (catégories ou produits)
    let defaultFolders = [], defaultProducts = [], currentObj = foodCategories;
    for (let step of currentShoppingPath) { if (currentObj && currentObj[step]) currentObj = currentObj[step]; }
    if (currentObj && !Array.isArray(currentObj)) defaultFolders = Object.keys(currentObj);
    else if (Array.isArray(currentObj)) defaultProducts = currentObj;
    
    defaultFolders.forEach(cat => { container.innerHTML += `<div onclick="shoppingNavigateTo('${cat.replace(/'/g, "\\'")}')" style="background:var(--primary); color:white; padding:15px; border-radius:12px; text-align:center; font-weight:bold; cursor:pointer;">${cat}</div>`; });
    defaultProducts.forEach(p => { container.innerHTML += `<div onclick="openShoppingItemModal('${p.replace(/'/g, "\\'")}', false)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; cursor:pointer; border:1px solid rgba(128,128,128,0.2);">+ ${formatProductDisplay(p)}</div>`; });
    customShoppingCards.filter(c => c.path === currentShoppingPath.join('/')).forEach(p => { container.innerHTML += `<div onclick="openShoppingItemModal('${p.id.replace(/'/g, "\\'")}', true)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; cursor:pointer; border:2px dashed var(--primary);">+ ${p.name}</div>`; });
}

// --- ONGLETS & SYNCHRO ---
function renderShoppingTabs() {
    const container = document.getElementById('shopping-tabs-dynamic'); if (!container) return;
    container.style.display = (mySharedLists && mySharedLists.length > 0) ? 'flex' : 'none';
    container.innerHTML = '';
    const personalBtn = document.createElement('button'); personalBtn.className = `sub-menu-tab ${currentShoppingListId === 'personal' ? 'active' : ''}`; personalBtn.innerText = "Ma liste"; personalBtn.onclick = () => switchShoppingListTab("personal"); container.appendChild(personalBtn);
    mySharedLists.forEach(list => { const listBtn = document.createElement('button'); listBtn.className = `sub-menu-tab ${currentShoppingListId === list.id ? 'active' : ''}`; listBtn.innerText = list.name; listBtn.onclick = () => switchShoppingListTab(list.id); container.appendChild(listBtn); });
}

function switchShoppingListTab(listId) { currentShoppingListId = listId; renderShoppingTabs(); renderShoppingCategories(); syncCurrentShoppingItems(); updateParticipantsDisplay(); }

function syncCurrentShoppingItems() {
    if (shoppingItemsUnsubscribe) shoppingItemsUnsubscribe();
    let query = (currentShoppingListId === "personal") ? db.collection("shopping").where("userId", "==", currentUser.uid) : db.collection("shopping").where("listId", "==", currentShoppingListId);
    shoppingItemsUnsubscribe = query.onSnapshot((snapshot) => {
        shoppingItems = []; snapshot.forEach(doc => { let d = doc.data(); d.id = doc.id; shoppingItems.push(d); });
        renderShoppingList();
    });
}

// --- RENDER LISTE (avec bouton supprimer) ---
function renderShoppingList() {
    const c = document.getElementById('shopping-list-content'); if (!c) return; c.innerHTML = '';
    const actives = shoppingItems.filter(i => !i.completed), completeds = shoppingItems.filter(i => i.completed);
    const isCreator = (mySharedLists.find(l => l.id === currentShoppingListId)?.createdBy === currentUser.uid);
    
    actives.forEach(item => {
        const canDelete = (currentShoppingListId === 'personal' || isCreator || item.userId === currentUser.uid);
        c.innerHTML += `<div class="task-card"><div style="flex:1" onclick="toggleShoppingCheck('${item.id}', false)"><strong>${item.name}</strong><br><small>${item.info}</small></div>${canDelete ? `<button onclick="deleteShoppingItem('${item.id}')">×</button>` : ''}</div>`;
    });
    completeds.forEach(item => {
        const canDelete = (currentShoppingListId === 'personal' || isCreator || item.userId === currentUser.uid);
        c.innerHTML += `<div class="task-card completed-bubble"><div style="flex:1" onclick="toggleShoppingCheck('${item.id}', true)"><s>${item.name}</s></div>${canDelete ? `<button onclick="deleteShoppingItem('${item.id}')">×</button>` : ''}</div>`;
    });
}

// --- MODALE PARTAGE & GESTION ---
function openCustomShoppingListShareModal() {
    renderMySharedListsInModal(); 
    renderShoppingTabs(); 
    renderFriendsCheckboxesForNewList();
    document.getElementById('shopping-list-multi-share-modal').style.display = 'flex';
}

function renderMySharedListsInModal() {
    const container = document.getElementById('my-shared-lists-container'); if (!container) return;
    container.innerHTML = mySharedLists.map(l => `<div style="display:flex; justify-content:space-between; align-items:center;"><strong>${l.name}</strong><button onclick="leaveSharedList('${l.id}')">Quitter</button></div>`).join('');
}

function renderFriendsCheckboxesForNewList() {
    const container = document.getElementById('create-list-friends-container'), box = document.getElementById('create-list-friends-checkboxes');
    if(box) box.innerHTML = friends.map(f => `<label><input type="checkbox" class="friend-invite-cb" value="${f.uid}"> ${f.nickname}</label>`).join('');
    if(container) container.style.display = friends.length > 0 ? 'block' : 'none';
}

function createNewSharedShoppingList() {
    const name = document.getElementById('new-shared-list-name').value.trim(); if (!name) return;
    const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase(), listType = document.getElementById('new-list-type').value;
    let selectedFriends = Array.from(document.querySelectorAll('.friend-invite-cb:checked')).map(cb => cb.value);
    db.collection("shoppingLists").add({ name: name, code: uniqueCode, createdBy: currentUser.uid, members: [currentUser.uid, ...selectedFriends], type: listType, createdAt: Date.now() }).then(() => { 
        document.getElementById('shopping-list-multi-share-modal').style.display = 'none'; showToast("Liste créée ! 🎉"); 
    });
}

// --- ACTIONS SIMPLES ---
function toggleShoppingCheck(id, isCompleted) { db.collection("shopping").doc(id).update({ completed: !isCompleted }); }
function deleteShoppingItem(id) { db.collection("shopping").doc(id).delete(); }
function clearCompletedShopping() { completeds = shoppingItems.filter(i => i.completed); completeds.forEach(i => db.collection("shopping").doc(i.id).delete()); }
function autoArchiveShoppingItems() { const today = new Date().toISOString().split('T')[0]; db.collection("shopping").where("completed", "==", true).get().then(snap => { snap.forEach(doc => { if (doc.data().createdAt && new Date(doc.data().createdAt).toISOString().split('T')[0] < today) doc.ref.delete(); }); }); }
setInterval(autoArchiveShoppingItems, 3600000);
