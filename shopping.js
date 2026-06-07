function shoppingNavigateTo(cat) { shoppingSearchQuery = ""; currentShoppingPath.push(cat); renderShoppingCategories(); }
function formatProductDisplay(name) { return (name||"").replace(/\(([^)]+)\)/g, '<span style="color:transparent; font-size:0; opacity:0; pointer-events:none;">($1)</span>'); }
function shoppingNavigateBack() { shoppingSearchQuery = ""; currentShoppingPath.pop(); renderShoppingCategories(); }

function renderShoppingCategories() {
    const container = document.getElementById('shopping-categories'), breadcrumb = document.getElementById('shopping-breadcrumb'); if(!container || !breadcrumb) return;

    // SÉCURITÉ : VÉRIFICATION ACCÈS RESTREINT ÉVÉNEMENT
    if (currentShoppingListId !== 'personal' && typeof mySharedLists !== "undefined") {
        const listObj = mySharedLists.find(l => l.id === currentShoppingListId);
        // Si c'est un event et qu'on N'EST PAS le créateur, on bloque l'affichage
        if (listObj && listObj.type === 'event' && listObj.createdBy !== currentUser.uid) {
            breadcrumb.innerText = "Accès restreint";
            container.innerHTML = `
                <div style="grid-column: 1 / -1; background: rgba(128,128,128,0.05); border: 2px dashed var(--warning); padding: 25px 15px; border-radius: 12px; text-align: center;">
                    <span style="font-size: 2rem; display:block; margin-bottom: 10px;">🛡️</span>
                    <strong style="color: var(--primary-dark); font-size: 1.1rem; display:block; margin-bottom: 5px;">Mode Événement</strong>
                    <span style="font-style: italic; opacity: 0.8; font-size: 0.9rem;">Vous êtes invité à cet événement. Seul l'organisateur ajoute les produits. Vous pouvez cocher ce que vous prenez dans le chariot en bas !</span>
                </div>`;
            return; 
        }
    }
    
    let isFocused = (document.activeElement && document.activeElement.id === 'shopping-search'); container.innerHTML = ''; const currentPathStr = currentShoppingPath.join('/');
    breadcrumb.innerText = currentShoppingPath.length === 0 ? '' : currentShoppingPath[currentShoppingPath.length - 1]; const isAtRoot = (currentShoppingPath.length === 0);

    container.innerHTML += `<div style="grid-column: 1 / -1; display: flex; gap: 10px; width: 100%; align-items: center; margin-bottom: 5px;"><div onclick="${isAtRoot ? '' : 'shoppingNavigateBack()'}" style="flex: 1; background:rgba(128,128,128,0.1); color:var(--text-color); padding:12px; border-radius:12px; text-align:center; font-weight:bold; white-space: nowrap; border: 1px dashed rgba(128,128,128,0.3); ${isAtRoot ? 'opacity: 0.3; cursor: default; pointer-events: none;' : 'cursor: pointer;'}-webkit-user-select: none; user-select: none;">⬅️ Retour</div><input type="text" id="shopping-search" placeholder="🔍 Rechercher..." oninput="handleShoppingSearch(this.value)" value="${shoppingSearchQuery}" style="flex: 2; padding: 12px; border-radius: 12px; border: 1px solid rgba(128,128,128,0.3); background: var(--card-bg); color: var(--text-color); font-size: 1rem; font-weight: bold; outline: none;"></div>`;
    container.innerHTML += `<div onclick="openCustomCardModal()" style="grid-column: 1 / -1; background:var(--primary); color:white; padding:10px; border-radius:20px; text-align:center; font-weight:bold; cursor:pointer; width: 70%; margin: 0 auto 10px auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);">+ Nouveau Produit</div>`;

    if (shoppingSearchQuery.trim() !== "") {
        let matches = [], q = shoppingSearchQuery.toLowerCase().trim();
        function extractMatches(obj) { if (Array.isArray(obj)) { obj.forEach(p => { if (p.toLowerCase().includes(q) && !matches.some(m => m.name === p)) matches.push({ name: p, isCustom: false }); }); } else if (typeof obj === 'object' && obj !== null) { for (let key in obj) { extractMatches(obj[key]); } } }
        extractMatches(foodCategories); customShoppingCards.forEach(card => { if (card.name.toLowerCase().includes(q) && !matches.some(m => m.id === card.id)) matches.push({ name: card.name, id: card.id, isCustom: true }); });
        if (matches.length === 0) { container.innerHTML += `<p style="grid-column: 1 / -1; text-align:center; opacity:0.5; font-style:italic; margin-top:10px;">Aucun produit trouvé</p>`; } 
        else { matches.forEach(product => { let safe = product.isCustom ? product.id.replace(/'/g, "\\'") : product.name.replace(/'/g, "\\'"); container.innerHTML += `<div onclick="openShoppingItemModal('${safe}', ${product.isCustom})" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.05); font-weight:bold; cursor:pointer; border:${product.isCustom?'2px dashed var(--primary)':'1px solid rgba(128,128,128,0.2)'};">+ ${product.isCustom?product.name:formatProductDisplay(product.name)}</div>`; }); }
    } else {
        let defaultFolders = [], defaultProducts = [], currentObj = foodCategories, validDefaultPath = true;
        for (let step of currentShoppingPath) { if (currentObj && currentObj[step]) currentObj = currentObj[step]; else { validDefaultPath = false; break; } }
        if (validDefaultPath && currentObj) { if (Array.isArray(currentObj)) defaultProducts = currentObj; else defaultFolders = Object.keys(currentObj); }
        defaultFolders.forEach(cat => { container.innerHTML += `<div onclick="shoppingNavigateTo('${cat.replace(/'/g, "\\'")}')" style="background:var(--primary); color:white; padding:15px; border-radius:12px; text-align:center; font-weight:bold; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);">${cat}</div>`; });
        defaultProducts.forEach(product => { container.innerHTML += `<div onclick="openShoppingItemModal('${product.replace(/'/g, "\\'")}', false)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.05); font-weight:bold; cursor:pointer; border:1px solid rgba(128,128,128,0.2);">+ ${formatProductDisplay(product)}</div>`; });
        customShoppingCards.filter(c => c.path === currentPathStr).forEach(product => { container.innerHTML += `<div onclick="openShoppingItemModal('${product.id.replace(/'/g, "\\'")}', true)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.05); font-weight:bold; cursor:pointer; border:2px dashed var(--primary);">+ ${product.name}</div>`; });
    }
    if (isFocused) { const input = document.getElementById('shopping-search'); if (input) { input.focus(); let val = input.value; input.value = ''; input.value = val; } }
}

function handleShoppingSearch(val) { shoppingSearchQuery = val; renderShoppingCategories(); }
function openCustomCardModal() { document.getElementById('custom-card-name').value = ''; const catSelect = document.getElementById('custom-card-category'); catSelect.innerHTML = ''; Object.keys(foodCategories).forEach(cat => { let opt = document.createElement('option'); opt.value = cat; opt.innerText = cat; catSelect.appendChild(opt); }); if (currentShoppingPath.length > 0) catSelect.value = currentShoppingPath[0]; document.getElementById('custom-card-modal').style.display = 'flex'; }

function saveCustomCard() {
    const targetRayon = document.getElementById('custom-card-category').value, name = document.getElementById('custom-card-name').value.trim(); if (!name || !currentUser) return;
    let units = []; document.querySelectorAll('.custom-unit-cb:checked').forEach(cb => { units.push({ v: cb.value, l: cb.parentElement.innerText.trim() }); }); if (units.length === 0) units.push({ v: "", l: "Pièce(s)" }); 
    let calculatedPath = (currentShoppingPath.length > 0 && currentShoppingPath[0] === targetRayon) ? currentShoppingPath.join('/') : targetRayon;
    customShoppingCards.push({ id: Date.now().toString(), path: calculatedPath, name: name, units: units });
    db.collection("users").doc(currentUser.uid).update({ customCards: customShoppingCards }).then(() => { showToast("Produit créé ! ✨"); document.getElementById('custom-card-modal').style.display = 'none'; renderShoppingCategories(); });
}

let tempShoppingProduct = "";
function openShoppingItemModal(identifier, isCustom) {
    let productName = identifier, units = [];
    if (isCustom) { const customItem = customShoppingCards.find(c => c.id === identifier); if (!customItem) return; productName = customItem.name; units = customItem.units; } 
    else {
        let mainCat = currentShoppingPath.length > 0 ? currentShoppingPath[0] : "", pNameLower = productName.toLowerCase(); units.push({v: "", l: "Pièce(s)"});
        if (pNameLower.includes("papier") || pNameLower.includes("sopalin") || pNameLower.includes("mouchoir") || pNameLower.includes("couches")) { units.push({v: "Rouleau", l: "Rouleau(x)"}, {v: "Pack", l: "Pack(s)"}, {v: "Boîte", l: "Boîte(s)"}); } 
        else if (pNameLower.includes("lait ") || pNameLower.includes("douche") || pNameLower.includes("shampoing") || pNameLower.includes("vaisselle") || pNameLower.includes("lessive") || pNameLower.includes("eau") || pNameLower.includes("jus") || mainCat.includes("Boissons") || mainCat.includes("Cave")) { units.push({v: "L", l: "Litres (L)"}, {v: "cl", l: "Centilitres (cl)"}, {v: "Pack", l: "Pack(s)"}); } 
        else if (mainCat.includes("Viandes") || mainCat.includes("Poissons") || mainCat.includes("Légumes") || mainCat.includes("Fruits") || mainCat.includes("Laitages") || mainCat.includes("Charcuterie") || mainCat.includes("Surgelés")) { units.push({v: "g", l: "Grammes (g)"}, {v: "kg", l: "Kilos (kg)"}); if (mainCat.includes("Légumes") || mainCat.includes("Fruits")) units.push({v: "Filet", l: "Filet(s)"}, {v: "Sachet", l: "Sachet(s)"}); if (mainCat.includes("Surgelés")) units.push({v: "Boîte", l: "Boîte(s)"}, {v: "Sachet", l: "Sachet(s)"}); } 
        else if (mainCat.includes("Apéritif")) { units.push({v: "g", l: "Grammes (g)"}, {v: "kg", l: "Kilos (kg)"}, {v: "Boîte", l: "Boîte(s)"}, {v: "Sachet", l: "Sachet(s)"}); } 
        else { units.push({v: "g", l: "Grammes (g)"}, {v: "kg", l: "Kilos (kg)"}, {v: "L", l: "Litres (L)"}, {v: "cl", l: "Centilitres (cl)"}, {v: "Pack", l: "Pack(s)"}, {v: "Boîte", l: "Boîte(s)"}, {v: "Sachet", l: "Sachet(s)"}); }
    }
    tempShoppingProduct = productName; document.getElementById('shopping-modal-title').innerHTML = formatProductDisplay(productName); document.getElementById('shopping-qty').value = "1";
    const unitSelect = document.getElementById('shopping-unit'); unitSelect.innerHTML = ''; units.forEach(u => { let opt = document.createElement('option'); opt.value = u.v; opt.innerText = u.l; unitSelect.appendChild(opt); });
    
    // GESTION DU MENU D'ATTRIBUTION
    const assignContainer = document.getElementById('assignee-container');
    const assignSelect = document.getElementById('shopping-assignee');
    if(assignContainer && assignSelect) {
        assignContainer.style.display = 'none';
        assignSelect.innerHTML = '';

        if (currentShoppingListId !== 'personal') {
            const listObj = mySharedLists.find(l => l.id === currentShoppingListId);
            // Si c'est un event et qu'ON EST le créateur, on affiche la liste des participants
            if (listObj && listObj.type === 'event' && listObj.createdBy === currentUser.uid) {
                assignContainer.style.display = 'block';
                assignSelect.innerHTML = '<option value="">-- Non attribué --</option>';
                
                listObj.members.forEach(memberUid => {
                    let fName = window.currentListMemberNames[memberUid] || "Invité";
                    assignSelect.innerHTML += `<option value="${memberUid}">${fName}</option>`;
                });
            }
        }
    }
    document.getElementById('shopping-item-modal').style.display = 'flex'; 
    currentShoppingPath = []; renderShoppingCategories();
}

function findRayonForProduct(productName) { const pLower = (productName||"").toLowerCase(); for (let rayon in foodCategories) { if (JSON.stringify(foodCategories[rayon]).toLowerCase().includes(pLower)) return rayon; } return "✨ Produits Custom / Autres"; }
function itemOwnerNameForSort(item) { if (currentShoppingListId === 'personal') return 'Moi'; if (item.assignedToName) return item.assignedToName; if (item.userId === currentUser.uid) return 'A_Moi'; return item.ownerName || 'Z_Inconnu'; }

function saveShoppingItem() {
    const qty = document.getElementById('shopping-qty').value;
    const unit = document.getElementById('shopping-unit').value;
    const finalName = tempShoppingProduct;
    const displayInfo = unit === "" ? `x${qty}` : `${qty} ${unit}`;
    
    let assignedToUid = null, assignedToName = null;
    const assignContainer = document.getElementById('assignee-container');
    if (assignContainer && assignContainer.style.display === 'block') { 
        const assignSelect = document.getElementById('shopping-assignee'); 
        if (assignSelect && assignSelect.value) { 
            assignedToUid = assignSelect.value; 
            assignedToName = assignSelect.options[assignSelect.selectedIndex].text; 
        } 
    }

    if (finalName && currentUser) {
        const payload = { 
            name: finalName, 
            info: displayInfo, 
            completed: false, 
            userId: currentUser.uid, 
            ownerName: userNickname || "Inconnu", 
            listId: currentShoppingListId, 
            createdAt: Date.now() 
        };
        // Injecte les données d'attribution si elles existent
        if (assignedToUid) { 
            payload.assignedToUid = assignedToUid; 
            payload.assignedToName = assignedToName; 
        }
        
        db.collection("shopping").add(payload).then(() => { 
            showToast("Ajouté au panier ! 🛒"); 
            document.getElementById('shopping-item-modal').style.display = 'none'; 
        });
    }
}

function scrollToShoppingList() { const listHeader = document.getElementById('shopping-list-header'); if (listHeader) listHeader.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function scrollToTopShopping() { const marketHeader = document.getElementById('shopping-page'); if (marketHeader) marketHeader.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

function renderShoppingTabs() {
    const container = document.getElementById('shopping-tabs-dynamic'), ownerOpt = document.getElementById('sort-opt-owner'), sortSelect = document.getElementById('shopping-sort-filter'); if (!container) return;
    if (ownerOpt && sortSelect) { if (currentShoppingListId === 'personal') { ownerOpt.style.display = 'none'; ownerOpt.disabled = true; if (sortSelect.value === 'owner') sortSelect.value = 'date'; } else { ownerOpt.style.display = 'block'; ownerOpt.disabled = false; } }
    if (mySharedLists.length === 0) { container.style.display = 'none'; return; } else { container.style.display = 'flex'; }
    container.innerHTML = '';
    const personalBtn = document.createElement('button'); personalBtn.className = `sub-menu-tab ${currentShoppingListId === 'personal' ? 'active' : ''}`; personalBtn.style.cssText = currentShoppingListId === 'personal' ? "background: var(--primary); color: white; border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border:none; font-family: inherit;" : "background: rgba(128,128,128,0.1); color: var(--text-color); border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border: none; opacity: 0.7; font-family: inherit;"; personalBtn.innerText = "Ma liste"; personalBtn.onclick = () => switchShoppingListTab("personal"); container.appendChild(personalBtn);
    mySharedLists.forEach(list => { const listBtn = document.createElement('button'); listBtn.className = `sub-menu-tab ${currentShoppingListId === list.id ? 'active' : ''}`; listBtn.style.cssText = currentShoppingListId === list.id ? "background: var(--primary); color: white; border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border:none; font-family: inherit;" : "background: rgba(128,128,128,0.1); color: var(--text-color); border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border: none; opacity: 0.7; font-family: inherit;"; listBtn.innerText = list.name; listBtn.onclick = () => switchShoppingListTab(list.id); container.appendChild(listBtn); });
}

function switchShoppingListTab(listId) { currentShoppingListId = listId; renderShoppingTabs(); renderShoppingCategories(); syncCurrentShoppingItems(); updateParticipantsDisplay(); }

async function updateParticipantsDisplay() {
    const pDiv = document.getElementById('shopping-list-participants'); if (!pDiv) return; window.currentListMemberNames = {};
    if (currentShoppingListId === 'personal') { pDiv.style.display = 'none'; } else {
        const listObj = mySharedLists.find(l => l.id === currentShoppingListId);
        if (listObj && listObj.members) {
            pDiv.innerHTML = `👥 <b>Participants :</b> Chargement...`; pDiv.style.display = 'block'; let names = [];
            for (let uid of listObj.members) {
                if (uid === currentUser.uid) { names.push("Moi"); window.currentListMemberNames[uid] = "Moi"; } else {
                    let f = friends.find(friend => friend.uid === uid);
                    if (f) { names.push(f.nickname); window.currentListMemberNames[uid] = f.nickname; } else {
                        try { let doc = await db.collection('users').doc(uid).get(); if (doc.exists && doc.data().nickname) { names.push(doc.data().nickname); window.currentListMemberNames[uid] = doc.data().nickname; } else { names.push("Invité"); window.currentListMemberNames[uid] = "Invité"; } } catch(e) { names.push("Invité"); window.currentListMemberNames[uid] = "Invité"; }
                    }
                }
            }
            pDiv.innerHTML = `👥 <b>Participants :</b> ${names.join(', ')}`;
        } else { pDiv.style.display = 'none'; }
    }
}

function syncCurrentShoppingItems() {
    if (shoppingItemsUnsubscribe) shoppingItemsUnsubscribe(); if (!currentUser) return;
    let query = db.collection("shopping").where("listId", "==", currentShoppingListId);
    if (currentShoppingListId === "personal") { query = db.collection("shopping").where("userId", "==", currentUser.uid); }
    shoppingItemsUnsubscribe = query.onSnapshot((snapshot) => {
        shoppingItems = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; if (currentShoppingListId === "personal") { if (!data.listId || data.listId === "personal") shoppingItems.push(data); } else { if (data.listId === currentShoppingListId) shoppingItems.push(data); } });
        if (document.getElementById('shopping-page').style.display === 'block') { renderShoppingList(); }
    });
}

function renderShoppingList() {
    const c = document.getElementById('shopping-list-content'), scrollUpBtn = document.getElementById('shopping-scroll-up-btn'); if (!c) return; c.innerHTML = '';
    const sortVal = document.getElementById('shopping-sort-filter') ? document.getElementById('shopping-sort-filter').value : 'date';
    
    if (sortVal === 'alpha') shoppingItems.sort((a, b) => (a.name || "").localeCompare(b.name || "", 'fr', {sensitivity: 'base'}));
    else if (sortVal === 'owner') shoppingItems.sort((a, b) => { const ownerA = itemOwnerNameForSort(a), ownerB = itemOwnerNameForSort(b); if (ownerA !== ownerB) return ownerA.localeCompare(ownerB, 'fr', {sensitivity: 'base'}); return (a.createdAt || 0) - (b.createdAt || 0); });
    else if (sortVal === 'rayon') shoppingItems.sort((a, b) => { const rayonA = findRayonForProduct(a.name), rayonB = findRayonForProduct(b.name); if (rayonA !== rayonB) return rayonA.localeCompare(rayonB, 'fr'); return (a.name || "").localeCompare(b.name || "", 'fr', {sensitivity: 'base'}); });
    else shoppingItems.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    const actives = shoppingItems.filter(item => !item.completed), completeds = shoppingItems.filter(item => item.completed);
    if (shoppingItems.length === 0) { c.innerHTML = '<p style="text-align:center; opacity:0.5; font-style:italic;">La liste est vide !</p>'; if(scrollUpBtn) scrollUpBtn.style.display = 'none'; return; }
    if(scrollUpBtn) scrollUpBtn.style.display = 'flex';

    const getOwnerTag = (item) => {
        if (currentShoppingListId === 'personal') return '';
        if (item.assignedToName) { const isMe = item.assignedToUid === currentUser.uid; return ` <small style="opacity:0.8; font-weight:bold; color:white; background: ${isMe ? 'var(--danger)' : 'var(--warning)'}; padding: 2px 6px; border-radius: 6px; font-size: 0.7rem; margin-left: 5px;">🎯 Ramené par ${isMe ? 'Moi' : item.assignedToName}</small>`; }
        if (item.userId === currentUser.uid) return ` <small style="opacity:0.6; font-style:italic; color:var(--primary);">(Moi)</small>`;
        if (item.ownerName) return ` <small style="opacity:0.6; font-style:italic;">(${item.ownerName})</small>`; return '';
        // Mode Événement : Si le produit est attribué à quelqu'un
        if (item.assignedToName) { 
            const isMe = item.assignedToUid === currentUser.uid; 
            return ` <small style="opacity:0.9; font-weight:bold; color:white; background: ${isMe ? 'var(--danger)' : 'var(--warning)'}; padding: 2px 7px; border-radius: 6px; font-size: 0.7rem; margin-left: 5px;">🎯 Ramené par ${isMe ? 'Moi' : item.assignedToName}</small>`; 
        }
        
        // Mode Standard
        return item.userId === currentUser.uid ? ` <small style="opacity:0.6; font-style:italic; color:var(--primary);">(Moi)</small>` : ` <small style="opacity:0.6; font-style:italic;">(${item.ownerName})</small>`;
    };

    let lastRayonRendered = null;
    actives.forEach(item => {
        if (sortVal === 'rayon') { const itemRayon = findRayonForProduct(item.name); if (itemRayon !== lastRayonRendered) { c.innerHTML += `<div style="text-align: left; margin: 18px 0 8px 10px; font-size: 0.85rem; font-weight: bold; color: var(--primary); opacity: 0.7; letter-spacing: 1px;">— ${itemRayon}</div>`; lastRayonRendered = itemRayon; } }
        c.innerHTML += `<div class="task-card" style="border-left: 6px solid var(--primary);"><div style="flex:1; display:flex; align-items:center; min-width:0;"><div onclick="toggleShoppingCheck('${item.id}', false)" style="width:20px; height:20px; border:2px solid var(--primary); border-radius:5px; margin-right:10px; cursor:pointer;"></div><div style="flex:1;"><strong style="display:block;">${item.name || "Produit"}${getOwnerTag(item)}</strong><small style="color:var(--primary); font-weight:bold;">${item.info || ""}</small></div></div><div class="task-actions" style="flex-shrink:0;"><button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button></div></div>`;
    });
    if (completeds.length > 0) { let marginStyle = actives.length === 0 ? "margin-top: 0;" : ""; c.innerHTML += `<div class="task-section-separator" style="display: flex; justify-content: space-between; align-items: center; padding-right: 5px; ${marginStyle}"><span>Dans le chariot</span><button onclick="clearCompletedShopping()" style="background:none; border:none; color:var(--danger); font-size:0.85rem; font-weight:bold; cursor:pointer; text-decoration:underline;">Vider le cadie</button></div>`; }
    completeds.forEach(item => { c.innerHTML += `<div class="task-card completed-bubble"><div style="flex:1; display:flex; align-items:center; min-width:0;"><div onclick="toggleShoppingCheck('${item.id}', true)" style="width:20px; height:20px; background:var(--success); border-radius:5px; margin-right:10px; display:flex; align-items:center; justify-content:center; color:white; font-size:0.8rem; cursor:pointer;">✓</div><div style="flex:1; text-decoration:line-through; opacity:0.6;"><strong style="display:block;">${item.name || "Produit"}${getOwnerTag(item)}</strong><small>${item.info || ""}</small></div></div><div class="task-actions" style="flex-shrink:0;"><button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button></div></div>`; });
}

function toggleShoppingCheck(id, isCompleted) { db.collection("shopping").doc(id).update({ completed: !isCompleted }); }
function deleteShoppingItem(id) { db.collection("shopping").doc(id).delete().then(() => showToast("Produit retiré !")); }
function clearCompletedShopping() { let completeds = shoppingItems.filter(item => item.completed); if (completeds.length === 0) return; Promise.all(completeds.map(item => db.collection("shopping").doc(item.id).delete())).then(() => { showToast("Le chariot a été vidé ! 🗑️"); }); }

function openCustomShoppingListShareModal() {
    document.getElementById('new-shared-list-name').value = ''; 
    document.getElementById('join-shared-list-code').value = '';
    
    // Inutile de refaire une requête à Firebase !
    // La liste mySharedLists est DÉJÀ synchronisée en temps réel par friends_events.js
    renderMySharedListsInModal(); 
    renderShoppingTabs(); 
    renderFriendsCheckboxesForNewList(); 
    
    document.getElementById('shopping-list-multi-share-modal').style.display = 'flex';
}

function renderFriendsCheckboxesForNewList() {
    const container = document.getElementById('create-list-friends-container'), checkboxDiv = document.getElementById('create-list-friends-checkboxes'); if (!container || !checkboxDiv) return;
    if (friends.length === 0) { container.style.display = 'none'; return; } container.style.display = 'block';
    checkboxDiv.innerHTML = friends.map(f => `<label style="display:flex; align-items:center; gap:5px; background:rgba(128,128,128,0.1); padding:4px 8px; border-radius:15px; font-size:0.8rem; cursor:pointer;"><input type="checkbox" class="friend-invite-cb" value="${f.uid}"> ${f.nickname}</label>`).join('');
}

function renderMySharedListsInModal() {
    const container = document.getElementById('my-shared-lists-container'); 
    if (!container) return;
    
    // Sécurité d'affichage si la liste est vide
    if (!mySharedLists || mySharedLists.length === 0) { 
        container.innerHTML = `<p style="font-size: 0.9rem; opacity: 0.6; font-style: italic; text-align: center; padding: 10px;">Aucune liste partagée active.</p>`; 
        return; 
    }
    
    // Rendu sécurisé des listes existantes
    container.innerHTML = mySharedLists.map(l => {
        let safeName = l.name || "Liste sans nom";
        let safeCode = l.code || "---";
        
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px; border-radius:8px; border: 1px solid rgba(128,128,128,0.1); width: 100%; gap: 10px; box-sizing: border-box;">
            <div style="flex: 1; min-width: 0;">
                <strong style="display:block; color:var(--primary-dark); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${safeName}</strong>
                <small style="color:var(--primary); font-weight:bold; background:rgba(128,128,128,0.1); padding:2px 6px; border-radius:4px; display:inline-block; margin-top:2px;">Code: ${safeCode}</small>
            </div>
            <div style="display:flex; gap:8px; flex-shrink:0;">
                <button onclick="copyListCode('${safeCode}')" style="background:none; border:none; cursor:pointer; font-size:1.1rem;" title="Copier le code">📋</button>
                <button onclick="leaveSharedList('${l.id}')" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer; font-weight:bold; font-family:inherit;">Quitter</button>
            </div>
        </div>`;
    }).join('');
}

function copyListCode(code) { navigator.clipboard.writeText(code).then(() => showToast("Code copié ! 📋")); }

function createNewSharedShoppingList() {
    const nameInput = document.getElementById('new-shared-list-name'), name = nameInput.value.trim(); if (!name || !currentUser) { showToast("Erreur de création."); return; }
    const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase(), listType = document.getElementById('new-list-type') ? document.getElementById('new-list-type').value : 'standard';
    let selectedFriends = Array.from(document.querySelectorAll('.friend-invite-cb:checked')).map(cb => cb.value);
    const newList = { name: name, code: uniqueCode, createdBy: currentUser.uid, members: [currentUser.uid, ...selectedFriends], type: listType, createdAt: Date.now() };
    db.collection("shoppingLists").add(newList).then((docRef) => {
        document.getElementById('share-success-modal').style.display = 'flex'; document.getElementById('success-list-name').innerText = `"${name}"`; document.getElementById('success-list-code').innerText = uniqueCode;
        nameInput.value = ''; if (!mySharedLists.some(l => l.id === docRef.id)) { newList.id = docRef.id; mySharedLists.push(newList); } currentShoppingListId = docRef.id; 
        renderShoppingTabs(); renderShoppingCategories(); syncCurrentShoppingItems(); if (typeof updateParticipantsDisplay === 'function') updateParticipantsDisplay(); renderMySharedListsInModal();
    });
}

function joinSharedShoppingList() {
    const code = document.getElementById('join-shared-list-code').value.trim().toUpperCase(); if (!code || !currentUser) return;
    db.collection("shoppingLists").where("code", "==", code).get().then(snapshot => {
        if (snapshot.empty) { showToast("Code introuvable ! ❌"); return; } const doc = snapshot.docs[0], data = doc.data();
        if (data.members.includes(currentUser.uid)) { showToast("Déjà dans la liste ! 😊"); return; }
        let updatedMembers = [...data.members, currentUser.uid];
        db.collection("shoppingLists").doc(doc.id).update({ members: updatedMembers }).then(() => {
            showToast(`Rejoint : "${data.name}" ! 🛒`); document.getElementById('join-shared-list-code').value = '';
            if (!mySharedLists.some(l => l.id === doc.id)) { data.id = doc.id; data.members = updatedMembers; mySharedLists.push(data); } currentShoppingListId = doc.id; 
            renderShoppingTabs(); renderShoppingCategories(); syncCurrentShoppingItems(); updateParticipantsDisplay(); renderMySharedListsInModal();
        });
    });
}

function leaveSharedList(listId) {
    if (!currentUser) return;
    db.collection("shoppingLists").doc(listId).get().then(doc => {
        if (!doc.exists) return; const data = doc.data(); let updatedMembers = data.members.filter(m => m !== currentUser.uid);
        if (updatedMembers.length === 0) { db.collection("shoppingLists").doc(listId).delete(); db.collection("shopping").where("listId", "==", listId).get().then(snap => { snap.forEach(d => d.ref.delete()); }); } 
        else { db.collection("shoppingLists").doc(listId).update({ members: updatedMembers }); }
        showToast("Liste quittée !"); mySharedLists = mySharedLists.filter(l => l.id !== listId); if (currentShoppingListId === listId) { currentShoppingListId = "personal"; }
        renderShoppingTabs(); renderShoppingCategories(); syncCurrentShoppingItems(); updateParticipantsDisplay(); if (document.getElementById('shopping-list-multi-share-modal').style.display === 'flex') { renderMySharedListsInModal(); }
    });
}
