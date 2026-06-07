// --- FONCTIONS DE NAVIGATION ---
function shoppingNavigateTo(cat) { shoppingSearchQuery = ""; currentShoppingPath.push(cat); renderShoppingCategories(); }
function formatProductDisplay(name) { return (name||"").replace(/\(([^)]+)\)/g, '<span style="color:transparent; font-size:0; opacity:0; pointer-events:none;">($1)</span>'); }
function shoppingNavigateBack() { shoppingSearchQuery = ""; currentShoppingPath.pop(); renderShoppingCategories(); }

// --- AFFICHAGE RAYONS ---
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
    if (isFocused) { const input = document.getElementById('shopping-search'); if (input) { input.focus(); let val = input.value; input.value = ''; input.value = val; } }
}

function handleShoppingSearch(val) { shoppingSearchQuery = val; renderShoppingCategories(); }
function scrollToShoppingList() { const listHeader = document.getElementById('shopping-list-header'); if (listHeader) listHeader.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function scrollToTopShopping() { const marketHeader = document.getElementById('shopping-page'); if (marketHeader) marketHeader.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

// --- LISTES PARTAGÉES ---
function renderShoppingTabs() {
    const container = document.getElementById('shopping-tabs-dynamic'), ownerOpt = document.getElementById('sort-opt-owner'), sortSelect = document.getElementById('shopping-sort-filter'); if (!container) return;
    if (ownerOpt && sortSelect) { if (currentShoppingListId === 'personal') { ownerOpt.style.display = 'none'; ownerOpt.disabled = true; if (sortSelect.value === 'owner') sortSelect.value = 'date'; } else { ownerOpt.style.display = 'block'; ownerOpt.disabled = false; } }
    if (mySharedLists.length === 0) { container.style.display = 'none'; return; } else { container.style.display = 'flex'; }
    container.innerHTML = '';
    const personalBtn = document.createElement('button'); personalBtn.className = `sub-menu-tab ${currentShoppingListId === 'personal' ? 'active' : ''}`; personalBtn.style.cssText = currentShoppingListId === 'personal' ? "background: var(--primary); color: white; border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border:none; font-family: inherit;" : "background: rgba(128,128,128,0.1); color: var(--text-color); border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border: none; opacity: 0.7; font-family: inherit;"; personalBtn.innerText = "Ma liste"; personalBtn.onclick = () => switchShoppingListTab("personal"); container.appendChild(personalBtn);
    mySharedLists.forEach(list => { const listBtn = document.createElement('button'); listBtn.className = `sub-menu-tab ${currentShoppingListId === list.id ? 'active' : ''}`; listBtn.style.cssText = currentShoppingListId === list.id ? "background: var(--primary); color: white; border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border:none; font-family: inherit;" : "background: rgba(128,128,128,0.1); color: var(--text-color); border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border: none; opacity: 0.7; font-family: inherit;"; listBtn.innerText = list.name; listBtn.onclick = () => switchShoppingListTab(list.id); container.appendChild(listBtn); });
}

function switchShoppingListTab(listId) { currentShoppingListId = listId; renderShoppingTabs(); renderShoppingCategories(); syncCurrentShoppingItems(); updateParticipantsDisplay(); }

function renderShoppingList() {
    try {
        const c = document.getElementById('shopping-list-content'), scrollUpBtn = document.getElementById('shopping-scroll-up-btn'); if (!c) return; c.innerHTML = '';
        const sortVal = document.getElementById('shopping-sort-filter') ? document.getElementById('shopping-sort-filter').value : 'date';
        
        if (sortVal === 'alpha') shoppingItems.sort((a, b) => (a.name || "").localeCompare(b.name || "", 'fr', {sensitivity: 'base'}));
        else if (sortVal === 'owner') shoppingItems.sort((a, b) => { const ownerA = itemOwnerNameForSort(a), ownerB = itemOwnerNameForSort(b); if (ownerA !== ownerB) return ownerA.localeCompare(ownerB, 'fr', {sensitivity: 'base'}); return (a.createdAt || 0) - (b.createdAt || 0); });
        else if (sortVal === 'rayon') shoppingItems.sort((a, b) => { const rayonA = findRayonForProduct(a.name), rayonB = findRayonForProduct(b.name); if (rayonA !== rayonB) return rayonA.localeCompare(rayonB, 'fr'); return (a.name || "").localeCompare(b.name || "", 'fr', {sensitivity: 'base'}); });
        else shoppingItems.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

        const actives = shoppingItems.filter(item => !item.completed), completeds = shoppingItems.filter(item => item.completed);
        const isCreator = (mySharedLists.find(l => l.id === currentShoppingListId)?.createdBy === currentUser.uid);

        const getOwnerTag = (item) => {
            if (currentShoppingListId === 'personal') return '';
            if (item.assignedToName) { const isMe = item.assignedToUid === currentUser.uid; return ` <small style="opacity:0.9; font-weight:bold; color:white; background: ${isMe ? 'var(--danger)' : 'var(--warning)'}; padding: 2px 7px; border-radius: 6px; font-size: 0.7rem; margin-left: 5px;">🎯 Ramené par ${isMe ? 'Moi' : item.assignedToName}</small>`; }
            return item.userId === currentUser.uid ? ` <small style="opacity:0.6; font-style:italic; color:var(--primary);">(Moi)</small>` : ` <small style="opacity:0.6; font-style:italic;">(${item.ownerName})</small>`;
        };

        actives.forEach(item => {
            const canDelete = (currentShoppingListId === 'personal' || isCreator || item.userId === currentUser.uid);
            const deleteBtn = canDelete ? `<button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>` : '';
            c.innerHTML += `<div class="task-card" style="border-left: 6px solid var(--primary);"><div style="flex:1; display:flex; align-items:center; min-width:0;"><div onclick="toggleShoppingCheck('${item.id}', false)" style="width:20px; height:20px; border:2px solid var(--primary); border-radius:5px; margin-right:10px; cursor:pointer;"></div><div style="flex:1;"><strong style="display:block;">${item.name}${getOwnerTag(item)}</strong><small style="color:var(--primary); font-weight:bold;">${item.info}</small></div></div><div class="task-actions">${deleteBtn}</div></div>`;
        });

        if (completeds.length > 0) {
            c.innerHTML += `<div class="task-section-separator"><span>Dans le chariot</span><button onclick="clearCompletedShopping()" style="background:none; border:none; color:var(--danger); font-size:0.85rem; text-decoration:underline; cursor:pointer;">Vider le cadie</button></div>`;
            completeds.forEach(item => {
                const canDelete = (currentShoppingListId === 'personal' || isCreator || item.userId === currentUser.uid);
                const deleteBtn = canDelete ? `<button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>` : '';
                c.innerHTML += `<div class="task-card completed-bubble"><div style="flex:1; display:flex; align-items:center; min-width:0;"><div onclick="toggleShoppingCheck('${item.id}', true)" style="width:20px; height:20px; background:var(--success); border-radius:5px; margin-right:10px; display:flex; align-items:center; justify-content:center; color:white; font-size:0.8rem; cursor:pointer;">✓</div><div style="flex:1; text-decoration:line-through; opacity:0.6;"><strong>${item.name}${getOwnerTag(item)}</strong><br><small>${item.info}</small></div></div><div class="task-actions">${deleteBtn}</div></div>`;
            });
        }
    } catch(e) { console.error(e); }
}

// --- OUTILS & GESTION ---
function autoArchiveShoppingItems() {
    const today = new Date().toISOString().split('T')[0];
    db.collection("shopping").where("completed", "==", true).get().then(snapshot => {
        snapshot.forEach(doc => { let item = doc.data(); if (item.createdAt && new Date(item.createdAt).toISOString().split('T')[0] < today) doc.ref.delete(); });
    });
}
setInterval(autoArchiveShoppingItems, 3600000);

function toggleShoppingCheck(id, isCompleted) { db.collection("shopping").doc(id).update({ completed: !isCompleted }); }
function deleteShoppingItem(id) { db.collection("shopping").doc(id).delete().then(() => showToast("Produit retiré !")); }
function clearCompletedShopping() { let completeds = shoppingItems.filter(item => item.completed); if (completeds.length === 0) return; Promise.all(completeds.map(item => db.collection("shopping").doc(item.id).delete())).then(() => { showToast("Le chariot a été vidé ! 🗑️"); }); }

function openCustomShoppingListShareModal() {
    document.getElementById('new-shared-list-name').value = ''; document.getElementById('join-shared-list-code').value = '';
    renderMySharedListsInModal(); renderShoppingTabs(); renderFriendsCheckboxesForNewList();
    document.getElementById('shopping-list-multi-share-modal').style.display = 'flex';
}

function renderMySharedListsInModal() {
    const container = document.getElementById('my-shared-lists-container'); if (!container) return;
    if (!mySharedLists || mySharedLists.length === 0) { container.innerHTML = `<p style="font-size: 0.9rem; opacity: 0.6; font-style: italic; text-align: center; padding: 10px;">Aucune liste partagée active.</p>`; return; }
    container.innerHTML = mySharedLists.map(l => `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px; border-radius:8px; border: 1px solid rgba(128,128,128,0.1); width: 100%; gap: 10px; box-sizing: border-box;"><div style="flex: 1; min-width: 0;"><strong style="display:block; color:var(--primary-dark); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${l.name || "Sans nom"}</strong><small style="color:var(--primary); font-weight:bold; background:rgba(128,128,128,0.1); padding:2px 6px; border-radius:4px; display:inline-block; margin-top:2px;">Code: ${l.code || "---"}</small></div><div style="display:flex; gap:8px; flex-shrink:0;"><button onclick="copyListCode('${l.code}')" style="background:none; border:none; cursor:pointer; font-size:1.1rem;" title="Copier le code">📋</button><button onclick="leaveSharedList('${l.id}')" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer; font-weight:bold; font-family:inherit;">Quitter</button></div></div>`).join('');
}
