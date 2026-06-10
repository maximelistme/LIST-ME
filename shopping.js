// ============================================================
// shopping.js — Courses, Listes partagées
// VERSION CORRIGÉE : fonctions manquantes ajoutées
// ============================================================

// ---- NAVIGATION CATÉGORIES ----
function shoppingNavigateTo(cat) { shoppingSearchQuery = ""; currentShoppingPath.push(cat); renderShoppingCategories(); }
function shoppingNavigateBack() { shoppingSearchQuery = ""; currentShoppingPath.pop(); renderShoppingCategories(); }
function handleShoppingSearch(val) { shoppingSearchQuery = val; renderShoppingCategories(); const s = document.getElementById('shopping-search'); if (s) { s.focus(); const len = s.value.length; s.setSelectionRange(len, len); } }

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
        <div onclick="${currentShoppingPath.length === 0 ? '' : 'shoppingNavigateBack()'}" style="flex: 1; background:rgba(128,128,128,0.1); padding:12px; border-radius:12px; text-align:center; font-weight:normal; cursor:pointer; font-family:'Mogra',cursive; box-shadow:0 3px 8px rgba(0,0,0,0.15);">⬅️ Retour</div>
        <div style="flex:2; position:relative; display:flex; align-items:center;">
            <span style="position:absolute; left:12px; font-size:0.9rem; pointer-events:none;">🔍</span>
            <input type="text" id="shopping-search" placeholder="Rechercher..." oninput="handleShoppingSearch(this.value)" value="${shoppingSearchQuery}" style="width:100%; padding: 12px 12px 12px 34px; border-radius: 12px; border: 1px solid rgba(128,128,128,0.3); box-sizing:border-box;">
        </div>
    </div>`;
    container.innerHTML += `<div onclick="openCustomCardModal()" style="grid-column: 1 / -1; background:linear-gradient(135deg,var(--primary),var(--primary-dark)); color:white; padding:10px; border-radius:20px; text-align:center; cursor:pointer; width: 70%; margin: 0 auto 10px auto; font-weight:bold; font-size:0.95rem; box-shadow:0 3px 8px rgba(0,0,0,0.25);">+ Nouveau Produit</div>`;

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
            if (r.isCustom) container.innerHTML += `<div onclick="openShoppingItemModal('${r.id.replace(/'/g, "\\'")}', true)" style="background:var(--card-bg); padding:8px 10px; border-radius:12px; text-align:center; cursor:pointer; border:1px solid rgba(128,128,128,0.2); font-size:0.85rem;">+ ${r.name}</div>`;
            else container.innerHTML += `<div onclick="openShoppingItemModal('${r.name.replace(/'/g, "\\'")}', false)" style="background:var(--card-bg); padding:8px 10px; border-radius:12px; text-align:center; cursor:pointer; border:1px solid rgba(128,128,128,0.2); font-size:0.85rem;">+ ${formatProductDisplay(r.name)}</div>`;
        });
        return;
    }

    let currentObj = foodCategories;
    for (let step of currentShoppingPath) { if (currentObj && currentObj[step]) currentObj = currentObj[step]; }
    let defaultFolders = [], defaultProducts = [];
    if (currentObj && !Array.isArray(currentObj)) defaultFolders = Object.keys(currentObj);
    else if (Array.isArray(currentObj)) defaultProducts = currentObj;

    defaultFolders.forEach(cat => {
        container.innerHTML += `<div onclick="shoppingNavigateTo('${cat.replace(/'/g, "\\'")}')" style="background:var(--primary); color:white; padding:8px 6px; border-radius:12px; text-align:center; font-weight:bold; cursor:pointer; font-size:0.8rem;">${cat}</div>`;
    });
    defaultProducts.forEach(p => {
        container.innerHTML += `<div onclick="openShoppingItemModal('${p.replace(/'/g, "\\'")}', false)" style="background:var(--card-bg); padding:8px 10px; border-radius:12px; text-align:center; cursor:pointer; border:1px solid rgba(128,128,128,0.2); font-size:0.85rem;">+ ${formatProductDisplay(p)}</div>`;
    });
    customShoppingCards.filter(c => c.path === currentShoppingPath.join('/')).forEach(p => {
        container.innerHTML += `<div onclick="openShoppingItemModal('${p.id.replace(/'/g, "\\'")}', true)" style="background:var(--card-bg); padding:8px 10px; border-radius:12px; text-align:center; cursor:pointer; border:1px solid rgba(128,128,128,0.2); font-size:0.85rem;">+ ${p.name}</div>`;
    });
}

// ---- MAPPING UNITÉS PAR CATÉGORIE ----
function getUnitsForCurrentPath(productName) {
    const cat    = (currentShoppingPath[0] || '').toLowerCase();
    const subcat = (currentShoppingPath[1] || '').toLowerCase();
    const sub2   = (currentShoppingPath[2] || '').toLowerCase();
    const name   = productName.toLowerCase();

    // — VIANDES & VOLAILLES —
    if (cat.includes('viande') || cat.includes('volaille'))
        return ["", "g", "kg"];

    // — POISSONS —
    if (cat.includes('poisson'))
        return ["", "g", "kg"];

    // — LÉGUMES —
    if (cat.includes('légume') || cat.includes('legume'))
        return ["", "g", "kg"];

    // — FRUITS —
    if (cat.includes('fruit'))
        return ["", "g", "kg"];

    // — LAITAGES —
    if (cat.includes('laitage')) {
        if (subcat.includes('fromage'))
            return ["", "g", "kg"];
        if (subcat.includes('crèmerie') || subcat.includes('cremerie')) {
            if (name.includes('lait') || name.includes('crème') || name.includes('creme'))
                return ["", "L", "cl", "Pack"];
            if (name.includes('beurre'))
                return ["", "g", "kg"];
            if (name.includes('oeuf') || name.includes('œuf'))
                return ["", "Boîte"];
            return ["", "L", "cl", "Pack"]; // défaut crèmerie
        }
        return ["", "g", "kg"]; // défaut laitages
    }

    // — ÉPICERIE SALÉE —
    if (cat.includes('épicerie') || cat.includes('epicerie')) {
        if (subcat.includes('féculent') || subcat.includes('feculent') || subcat.includes('pâte') || subcat.includes('pate') || subcat.includes('conserve'))
            return ["", "g", "kg", "Boîte"];
        if (subcat.includes('condiment')) {
            if (name.includes('huile') || name.includes('vinaigre'))
                return ["", "L", "cl"];
            return [""];
        }
        if (subcat.includes('apéritif') || subcat.includes('aperitif')) {
            // Chips & Snacks, Tartinables → pièce uniquement
            return [""];
        }
        return ["", "g", "kg", "Boîte"]; // défaut épicerie salée
    }

    // — SURGELÉS —
    if (cat.includes('surgelé') || cat.includes('surgele')) {
        if (subcat.includes('glace'))
            return ["", "Boîte"];
        return [""];
    }

    // — BOISSONS —
    if (cat.includes('boisson')) {
        if (subcat.includes('eau'))    return ["", "L", "cl", "Pack"];
        if (subcat.includes('jus'))    return ["", "L", "cl", "Pack"];
        if (subcat.includes('sirop'))  return ["", "L", "cl"];
        if (subcat.includes('soda'))   return ["", "L", "cl", "Pack"];
        return ["", "L", "cl", "Pack"]; // défaut boissons
    }

    // — CAVE —
    if (cat.includes('cave')) {
        if (subcat.includes('vin'))        return ["", "Carton"];
        if (subcat.includes('bière') || subcat.includes('biere')) return ["", "L", "cl", "Pack"];
        if (subcat.includes('spiritueux')) return ["", "L", "cl"];
        return ["", "L", "cl"];
    }

    // — BOULANGERIE —
    if (cat.includes('boulangerie')) {
        return [""]; // pains, viennoiseries, pâtisserie, aide pâtisserie → pièce uniquement
    }

    // — CHARCUTERIE —
    if (cat.includes('charcuterie'))
        return ["", "g", "kg"];

    // — BÉBÉ —
    if (cat.includes('bébé') || cat.includes('bebe')) {
        if (subcat.includes('repas'))
            return ["", "Boîte"];
        if (subcat.includes('change') || subcat.includes('soin')) {
            if (name.includes('couche'))
                return ["", "Boîte", "Pack"];
            return ["", "Boîte"];
        }
        return [""];
    }

    // — ANIMAUX —
    if (cat.includes('animaux') || cat.includes('animal'))
        return [""];

    // — SOIN & BEAUTÉ —
    if (cat.includes('soin') || cat.includes('beauté') || cat.includes('beaute')) {
        if (subcat.includes('douche') || subcat.includes('cheveux'))
            return ["", "L", "cl"];
        return [""]; // hygiène & visage
    }

    // — ENTRETIEN & HYGIÈNE —
    if (cat.includes('entretien') || cat.includes('hygiène') || cat.includes('hygiene')) {
        if (subcat.includes('papier')) {
            if (name.includes('mouchoir')) return ["", "Boîte"];
            return ["", "Pack"];
        }
        return [""]; // ménage
    }

    // — DÉFAUT (autres catégories non encore mappées) —
    return ["", "g", "kg", "L", "cl", "Pack", "Boîte"];
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
        allowedUnits = getUnitsForCurrentPath(nameOrId);
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

// ---- MODAL GESTION ----
let _editingCustomCardId = null;

function openGestionModal() {
    const list = document.getElementById('gestion-custom-cards-list');
    const empty = document.getElementById('gestion-no-cards');
    if (!list) return;
    list.innerHTML = '';
    if (!customShoppingCards || customShoppingCards.length === 0) {
        if (empty) empty.style.display = 'block';
    } else {
        if (empty) empty.style.display = 'none';
        customShoppingCards.forEach(card => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background:rgba(128,128,128,0.08); border-radius:14px; padding:12px 16px; gap:8px;';
            row.innerHTML = `
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:bold; font-size:0.95rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${card.name}</div>
                    <div style="font-size:0.78rem; opacity:0.5; margin-top:2px;">${card.path || 'Sans catégorie'}</div>
                </div>
                <div style="display:flex; gap:6px; flex-shrink:0;">
                    <button onclick="editCustomCard('${card.id}')" style="background:linear-gradient(135deg,var(--primary),var(--primary-dark)); color:white; border:none; border-radius:10px; padding:7px 13px; cursor:pointer; font-size:0.85rem;">✎ Modifier</button>
                    <button onclick="deleteCustomCard('${card.id}')" style="background:var(--danger); color:white; border:none; border-radius:10px; padding:7px 13px; cursor:pointer; font-size:0.85rem;">🗑️</button>
                </div>`;
            list.appendChild(row);
        });
    }
    document.getElementById('gestion-modal').style.display = 'flex';
}

function editCustomCard(cardId) {
    const card = customShoppingCards.find(c => c.id === cardId);
    if (!card) return;
    _editingCustomCardId = cardId;

    // Fermer gestion, ouvrir le modal custom avec les données pré-remplies
    document.getElementById('gestion-modal').style.display = 'none';

    const select = document.getElementById('custom-card-category');
    if (select) {
        select.innerHTML = Object.keys(foodCategories).map(k => `<option value="${k}">${k}</option>`).join('');
        // Sélectionner le bon rayon (path peut être "Rayon/SousRayon" ou "Rayon")
        const parts = (card.path || '').split('/');
        select.value = parts[0] || select.options[0]?.value;
    }
    updateCustomCardSubcategory();
    // Sélectionner le bon sous-rayon si présent
    if (card.path && card.path.includes('/')) {
        const sub = card.path.split('/')[1];
        const subSel = document.getElementById('custom-card-subcategory');
        if (subSel) subSel.value = sub;
    }

    document.getElementById('custom-card-name').value = card.name;
    const allowedUnits = card.units || [""];
    document.querySelectorAll('.custom-unit-cb').forEach(cb => {
        cb.checked = allowedUnits.includes(cb.value);
    });

    // Changer le titre du modal
    const title = document.querySelector('#custom-card-modal h3');
    if (title) title.innerText = 'Modifier le produit ✏️';

    document.getElementById('custom-card-modal').style.display = 'flex';
}

function deleteCustomCard(cardId) {
    customShoppingCards = customShoppingCards.filter(c => c.id !== cardId);
    db.collection("users").doc(currentUser.uid).set({ customCards: customShoppingCards }, { merge: true }).then(() => {
        showToast("Produit supprimé ! 🗑️");
        openGestionModal();
        renderShoppingCategories();
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
    // Initialiser le sous-rayon selon la 1ère catégorie
    updateCustomCardSubcategory();
    document.getElementById('custom-card-modal').style.display = 'flex';
}

function updateCustomCardSubcategory() {
    const cat = document.getElementById('custom-card-category').value;
    const block = document.getElementById('custom-card-subcategory-block');
    const subSelect = document.getElementById('custom-card-subcategory');
    if (!cat || !block || !subSelect) return;

    const catObj = foodCategories[cat];
    // Sous-rayons = clés de l'objet si ce n'est pas un tableau
    const subKeys = (!Array.isArray(catObj) && typeof catObj === 'object') ? Object.keys(catObj) : [];

    if (subKeys.length > 0) {
        subSelect.innerHTML = `<option value="">— Rayon principal uniquement —</option>` +
            subKeys.map(k => `<option value="${k}">${k}</option>`).join('');
        block.style.display = 'block';
    } else {
        subSelect.innerHTML = '';
        block.style.display = 'none';
    }
}

function saveCustomCard() {
    const name = document.getElementById('custom-card-name').value.trim();
    const category = document.getElementById('custom-card-category').value;
    const subcategory = document.getElementById('custom-card-subcategory')?.value || '';
    const units = Array.from(document.querySelectorAll('.custom-unit-cb:checked')).map(cb => cb.value);
    if (!name) { showToast("Veuillez saisir un nom ! ⚠️"); return; }

    // Path = "Rayon/Sous-rayon" si sous-rayon choisi, sinon juste "Rayon"
    const path = subcategory ? `${category}/${subcategory}` : category;

    const newCard = {
        id: 'custom_' + Date.now(),
        name: name,
        path: path,
        units: units,
        createdAt: Date.now()
    };

    // Réinitialiser le titre du modal
    const modalTitle = document.querySelector('#custom-card-modal h3');
    if (modalTitle) modalTitle.innerText = 'Nouveau Produit ✏️';

    // Mode édition : remplacer la carte existante
    if (_editingCustomCardId) {
        const idx = customShoppingCards.findIndex(c => c.id === _editingCustomCardId);
        if (idx !== -1) { customShoppingCards[idx] = { ...customShoppingCards[idx], name, path, units }; }
        _editingCustomCardId = null;
        db.collection("users").doc(currentUser.uid).set({ customCards: customShoppingCards }, { merge: true }).then(() => {
            showToast(`Produit "${name}" modifié ! ✅`);
            document.getElementById('custom-card-modal').style.display = 'none';
            renderShoppingCategories();
            openGestionModal();
        });
        return;
    }

    // Sauvegarder dans les cartes perso de l'utilisateur
    customShoppingCards.push(newCard);
    db.collection("users").doc(currentUser.uid).set({ customCards: customShoppingCards }, { merge: true });

    // Si on est dans une liste partagée, propager la carte à tous les participants
    if (currentShoppingListId !== 'personal') {
        const listRef = db.collection("shoppingLists").doc(currentShoppingListId);
        listRef.get().then(doc => {
            if (!doc.exists) return;
            const listData = doc.data();
            const sharedCards = listData.sharedCustomCards || [];
            // Éviter les doublons par nom
            if (!sharedCards.find(c => c.name === newCard.name)) {
                sharedCards.push(newCard);
                listRef.update({ sharedCustomCards: sharedCards });
            }
        });
    }

    showToast(`Produit "${name}" créé et partagé ! ✨`);
    document.getElementById('custom-card-modal').style.display = 'none';
    renderShoppingCategories();
}

// ---- DROPDOWN SÉLECTEUR DE LISTE ----
function _buildDropdownMenu(menu, onSelect) {
    menu.innerHTML = '';
    const allLists = [{ id: 'personal', name: 'Ma liste' }, ...mySharedLists];
    allLists.forEach(list => {
        const item = document.createElement('div');
        const isActive = list.id === currentShoppingListId;
        item.style.cssText = `padding:12px 16px; cursor:pointer; font-size:0.95rem; font-weight:${isActive ? 'bold' : 'normal'}; color:${isActive ? 'var(--primary-dark)' : 'var(--text-color)'}; border-bottom:1px solid rgba(128,128,128,0.1); display:flex; align-items:center; gap:8px;`;
        item.innerHTML = `<span style="opacity:${isActive ? '1' : '0'}; color:var(--primary);">✓</span> ${list.name}`;
        item.onclick = () => { closeShoppingListDropdown(); switchShoppingListTab(list.id); };
        menu.appendChild(item);
    });
}

function renderShoppingTabs() {
    const hasShared = mySharedLists && mySharedLists.length > 0;
    const activeName = currentShoppingListId === 'personal'
        ? 'Ma liste'
        : (mySharedLists.find(l => l.id === currentShoppingListId)?.name || 'Ma liste');

    // Dropdown du bas (près de la liste)
    const selectorBot = document.getElementById('shopping-list-selector');
    const labelBot = document.getElementById('shopping-list-dropdown-label');
    const menuBot = document.getElementById('shopping-list-dropdown-menu');
    if (selectorBot) selectorBot.style.display = hasShared ? 'block' : 'none';
    if (labelBot) labelBot.innerText = activeName;
    if (menuBot) _buildDropdownMenu(menuBot);

    // Dropdown du haut (en haut de l'onglet)
    const selectorTop = document.getElementById('shopping-list-selector-top');
    const labelTop = document.getElementById('shopping-list-dropdown-label-top');
    const menuTop = document.getElementById('shopping-list-dropdown-menu-top');
    if (selectorTop) selectorTop.style.display = hasShared ? 'block' : 'none';
    if (labelTop) labelTop.innerText = activeName;
    if (menuTop) _buildDropdownMenu(menuTop);
}

function toggleShoppingListDropdown(which) {
    const menuId = which === 'top' ? 'shopping-list-dropdown-menu-top' : 'shopping-list-dropdown-menu';
    const arrowId = which === 'top' ? 'shopping-list-dropdown-arrow-top' : 'shopping-list-dropdown-arrow';
    const selectorId = which === 'top' ? 'shopping-list-selector-top' : 'shopping-list-selector';
    const menu = document.getElementById(menuId);
    const arrow = document.getElementById(arrowId);
    if (!menu) return;
    const isOpen = menu.style.display === 'block';
    // Fermer l'autre dropdown d'abord
    closeShoppingListDropdown();
    if (!isOpen) {
        menu.style.display = 'block';
        if (arrow) arrow.innerText = '▲';
        setTimeout(() => document.addEventListener('click', _closeDropdownOutside, { once: true }), 10);
    }
}

function closeShoppingListDropdown() {
    ['shopping-list-dropdown-menu', 'shopping-list-dropdown-menu-top'].forEach(id => {
        const m = document.getElementById(id); if (m) m.style.display = 'none';
    });
    ['shopping-list-dropdown-arrow', 'shopping-list-dropdown-arrow-top'].forEach(id => {
        const a = document.getElementById(id); if (a) a.innerText = '▼';
    });
}

function _closeDropdownOutside(e) {
    const s1 = document.getElementById('shopping-list-selector');
    const s2 = document.getElementById('shopping-list-selector-top');
    if ((!s1 || !s1.contains(e.target)) && (!s2 || !s2.contains(e.target))) closeShoppingListDropdown();
}

function switchShoppingListTab(listId) {
    const scrollY = window.scrollY;
    currentShoppingListId = listId;
    renderShoppingTabs();
    renderShoppingCategories();
    syncCurrentShoppingItems();
    updateParticipantsDisplay();
    // Sync les cartes partagées de la liste vers les cartes perso du participant
    if (listId !== 'personal') syncSharedCustomCards(listId);
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' }));
}

function syncSharedCustomCards(listId) {
    db.collection("shoppingLists").doc(listId).get().then(doc => {
        if (!doc.exists) return;
        const sharedCards = doc.data().sharedCustomCards || [];
        if (sharedCards.length === 0) return;
        let updated = false;
        sharedCards.forEach(card => {
            // Ajouter uniquement si pas déjà dans les cartes perso (par nom)
            if (!customShoppingCards.find(c => c.name === card.name)) {
                customShoppingCards.push(card);
                updated = true;
            }
        });
        if (updated) {
            db.collection("users").doc(currentUser.uid).set({ customCards: customShoppingCards }, { merge: true });
            renderShoppingCategories();
            showToast("Nouveaux produits partagés ajoutés ! 🛒");
        }
    });
}

function syncCurrentShoppingItems() {
    if (shoppingItemsUnsubscribe) shoppingItemsUnsubscribe();
    let query = (currentShoppingListId === "personal")
        ? db.collection("shopping").where("userId", "==", currentUser.uid)
        : db.collection("shopping").where("listId", "==", currentShoppingListId);
    shoppingItemsUnsubscribe = query.onSnapshot((snapshot) => {
        shoppingItems = [];
        snapshot.forEach(doc => {
            let d = doc.data(); d.id = doc.id;
            // Pour la liste perso, on exclut les items qui appartiennent à une liste partagée
            if (currentShoppingListId === "personal" && d.listId) return;
            shoppingItems.push(d);
        });
        renderShoppingList();
    });
}

function updateParticipantsDisplay() {
    const el = document.getElementById('shopping-list-participants');
    const title = document.getElementById('shopping-list-title');
    if (title) {
        if (currentShoppingListId === 'personal') {
            title.innerText = 'Ma Liste de Courses';
        } else {
            const listObj = mySharedLists.find(l => l.id === currentShoppingListId);
            title.innerText = listObj ? listObj.name : 'Ma Liste de Courses';
        }
    }
    if (!el) return;
    if (currentShoppingListId === 'personal') { el.style.display = 'none'; return; }
    const listObj = mySharedLists.find(l => l.id === currentShoppingListId);
    if (!listObj) { el.style.display = 'none'; return; }
    const count = listObj.members ? listObj.members.length : 1;
    el.style.display = 'block';
    el.style.cursor = 'pointer';
    el.onclick = () => openParticipantsModal(listObj);
    el.innerHTML = `👥 <u>${count} participant(s)</u>`;
}

function openParticipantsModal(listObj) {
    const names = Object.values(listObj.memberNames || {});
    const memberUids = listObj.members || [];
    let html = memberUids.map(uid => {
        const name = (listObj.memberNames && listObj.memberNames[uid])
            ? listObj.memberNames[uid]
            : (uid === currentUser?.uid ? (userNickname || 'Moi') : 'Participant');
        const isCreator = uid === listObj.createdBy;
        return `<div style="display:flex; align-items:center; gap:12px; padding:12px 15px; background:rgba(128,128,128,0.07); border-radius:12px;">
            <span style="font-size:1.4rem;">👤</span>
            <span style="font-weight:bold; flex:1;">${name}</span>
            ${isCreator ? `<span style="font-size:0.72rem; background:rgba(0,206,209,0.15); color:var(--primary); padding:3px 8px; border-radius:10px; font-weight:bold;">Créateur</span>` : ''}
        </div>`;
    }).join('');
    if (!html) html = `<p style="text-align:center; opacity:0.5; font-style:italic;">Aucun participant trouvé.</p>`;
    document.getElementById('participants-modal-list').innerHTML = html;
    document.getElementById('participants-modal').style.display = 'flex';
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

    const currentList = mySharedLists.find(l => l.id === currentShoppingListId);
    const isCreator = (currentList?.createdBy === currentUser?.uid);
    const isEventList = (currentList?.type === 'event');

    if (actives.length === 0 && completeds.length === 0) {
        c.innerHTML = `<p style="text-align:center; opacity:0.4; font-style:italic; margin-top:30px;">Ta liste est vide ! Ajoute des produits ☝️</p>`;
        return;
    }

    actives.forEach(item => {
        const canDelete = (currentShoppingListId === 'personal' || isCreator || item.userId === currentUser?.uid);
        const canCheck = !isEventList || isCreator || !item.assignedTo || item.assignedTo === currentUser?.uid;
        const assigneeTag = item.assignedTo ? `<small style="color:var(--primary); font-size:0.75rem;">→ ${getFriendName(item.assignedTo)}</small>` : '';
        c.innerHTML += `<div class="task-card low" style="border-left-color:var(--primary);${!canCheck?' opacity:0.55;':''}">
            <div style="flex:1;${canCheck?' cursor:pointer;':' cursor:default;'}" ${canCheck?`onclick="toggleShoppingCheck('${item.id}', false)"`:''}>
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
            const canCheck = !isEventList || isCreator || !item.assignedTo || item.assignedTo === currentUser?.uid;
            c.innerHTML += `<div class="task-card completed-bubble">
                <div style="flex:1;${canCheck?' cursor:pointer;':' cursor:default;'}" ${canCheck?`onclick="toggleShoppingCheck('${item.id}', true)"`:''}>
                    <s style="opacity:0.5;">${item.name}</s>
                    <small style="display:block; opacity:0.4;">${item.info || ''}</small>
                </div>
                ${canDelete ? `<button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>` : ''}
            </div>`;
        });

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
function toggleShoppingCheck(id, isCompleted) {
    const update = { completed: !isCompleted };
    if (!isCompleted) update.completedAt = new Date().toISOString().split('T')[0];
    else update.completedAt = firebase.firestore.FieldValue.delete();
    db.collection("shopping").doc(id).update(update);
}
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
            const d = doc.data();
            const refDate = d.completedAt || (d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : null);
            if (refDate && refDate < today) doc.ref.delete();
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
    container.innerHTML = mySharedLists.map(l => {
        const isCreator = l.createdBy === currentUser.uid;
        return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px; border-radius:8px; border: 1px solid rgba(128,128,128,0.1); gap: 10px; box-sizing: border-box; margin-bottom: 5px;">
            <div style="flex: 1; min-width: 0;">
                <strong style="display:block; color:var(--primary-dark); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${l.name || "Sans nom"}</strong>
                ${(isCreator || l.type !== 'event') ? `<small style="color:var(--primary); font-weight:bold; background:rgba(128,128,128,0.1); padding:2px 6px; border-radius:4px; display:inline-block; margin-top:2px;">Code: ${l.code || "---"}</small>` : ''}
            </div>
            <div style="display:flex; gap:8px; flex-shrink:0;">
                ${(isCreator || l.type !== 'event') ? `<button onclick="copyListCode('${l.code}')" style="background:none; border:none; cursor:pointer; font-size:1.1rem;">📋</button>` : ''}
                ${isCreator
                    ? `<button onclick="deleteSharedList('${l.id}')" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer; font-weight:bold;">🗑️ Supprimer</button>`
                    : `<button onclick="leaveSharedList('${l.id}')" style="background:rgba(128,128,128,0.3); color:inherit; border:none; padding:5px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer; font-weight:bold;">Quitter</button>`
                }
            </div>
        </div>`;
    }).join('');
}

function renderFriendsCheckboxesForNewList() {
    const container = document.getElementById('create-list-friends-container');
    const box = document.getElementById('create-list-friends-checkboxes');
    if (!container || !box) return;
    if (friends.length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    box.innerHTML = `
        <div style="position:relative; width:100%;">
            <input type="text" id="friend-invite-search" placeholder="🔍 Rechercher un ami..." oninput="filterFriendInviteDropdown()" onfocus="document.getElementById('friend-invite-dropdown').style.display='block'" style="width:100%; box-sizing:border-box; padding:10px 12px; border-radius:10px; border:1px solid rgba(128,128,128,0.3); background:var(--card-bg); color:var(--text-color); font-size:0.9rem;">
            <div id="friend-invite-dropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:var(--card-bg); border:1px solid rgba(128,128,128,0.3); border-radius:10px; z-index:100; max-height:150px; overflow-y:auto; box-shadow:0 4px 12px rgba(0,0,0,0.15); margin-top:4px;">
                ${friends.map(f => `<div onclick="toggleFriendInvite('${f.uid}', '${f.nickname}')" id="fi-opt-${f.uid}" style="padding:10px 14px; cursor:pointer; font-size:0.9rem; display:flex; justify-content:space-between; align-items:center;" onmouseover="this.style.background='rgba(0,206,209,0.1)'" onmouseout="this.style.background=''">${f.nickname} <span id="fi-check-${f.uid}" style="display:none; color:var(--primary); font-weight:bold;">✓</span></div>`).join('')}
            </div>
        </div>
        <div id="friend-invite-tags" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;"></div>
    `;
    document.addEventListener('click', closeFriendInviteDropdown, { once: false });
}

function filterFriendInviteDropdown() {
    const q = (document.getElementById('friend-invite-search')?.value || '').toLowerCase();
    document.getElementById('friend-invite-dropdown').style.display = 'block';
    friends.forEach(f => {
        const opt = document.getElementById(`fi-opt-${f.uid}`);
        if (opt) opt.style.display = f.nickname.toLowerCase().includes(q) ? 'flex' : 'none';
    });
}

function toggleFriendInvite(uid, nickname) {
    const check = document.getElementById(`fi-check-${uid}`);
    const tagsContainer = document.getElementById('friend-invite-tags');
    const existing = document.getElementById(`fi-tag-${uid}`);
    if (existing) {
        existing.remove();
        if (check) check.style.display = 'none';
    } else {
        if (check) check.style.display = 'inline';
        const tag = document.createElement('div');
        tag.id = `fi-tag-${uid}`;
        tag.setAttribute('data-uid', uid);
        tag.style.cssText = 'display:flex; align-items:center; gap:5px; background:rgba(0,206,209,0.15); color:var(--primary-dark); padding:4px 10px; border-radius:20px; font-size:0.82rem; font-weight:bold;';
        tag.innerHTML = `${nickname} <span onclick="toggleFriendInvite('${uid}', '${nickname}')" style="cursor:pointer; font-size:1rem; line-height:1; opacity:0.6;">×</span>`;
        tagsContainer.appendChild(tag);
    }
}

function closeFriendInviteDropdown(e) {
    const dropdown = document.getElementById('friend-invite-dropdown');
    const search = document.getElementById('friend-invite-search');
    if (dropdown && search && !dropdown.contains(e.target) && e.target !== search) {
        dropdown.style.display = 'none';
    }
}

function createNewSharedShoppingList() {
    const name = document.getElementById('new-shared-list-name').value.trim();
    if (!name) { showToast("Veuillez saisir un nom ! ⚠️"); return; }
    const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const listType = document.getElementById('new-list-type').value;
    let selectedFriends = Array.from(document.querySelectorAll('#friend-invite-tags [data-uid]')).map(el => el.getAttribute('data-uid'));
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

function deleteSharedList(listId) {
    const listObj = mySharedLists.find(l => l.id === listId);
    document.getElementById('confirm-delete-list-name').innerText = listObj ? listObj.name : 'cette liste';
    document.getElementById('confirm-delete-list-modal').style.display = 'flex';
    document.getElementById('confirm-delete-list-btn').onclick = () => {
        document.getElementById('confirm-delete-list-modal').style.display = 'none';
        _doDeleteSharedList(listId);
    };
}
function _doDeleteSharedList(listId) {
    db.collection("shopping").where("listId", "==", listId).get().then(snap => {
        const batch = db.batch();
        snap.forEach(doc => batch.delete(doc.ref));
        batch.delete(db.collection("shoppingLists").doc(listId));
        return batch.commit();
    }).then(() => {
        if (currentShoppingListId === listId) currentShoppingListId = 'personal';
        showToast("Liste supprimée pour tous ! 🗑️");
        renderMySharedListsInModal();
    }).catch(() => showToast("Erreur lors de la suppression ❌"));
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
