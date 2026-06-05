// --- SYSTÈME D'AMIS GLOBAL (PROFIL) ---
function copyUserCode() {
    const code = document.getElementById('my-user-code').innerText;
    navigator.clipboard.writeText(code).then(() => showToast("Code copié ! Donnez-le à vos amis. 📋"));
}

function addGlobalFriend() {
    const inputField = document.getElementById('add-friend-input'); if (!inputField) return;
    const code = inputField.value.trim().toUpperCase(); 
    if(!code) { showToast("Veuillez saisir un code ! ⚠️"); return; }
    if(code === myAgendaCode) { showToast("Vous ne pouvez pas vous ajouter vous-même ! 😅"); return; }
    
    showToast("Recherche en cours... ⏳");
    db.collection("users").where("shareCode", "==", code).get().then(snapshot => { 
        if(snapshot.empty) { showToast("Code introuvable ! ❌"); return; } 
        let friendDoc = snapshot.docs[0], friendUid = friendDoc.id, friendData = friendDoc.data(); 
        let friendName = friendData.nickname || "Inconnu"; 
        if(friends.some(f => f.uid === friendUid)) { showToast("Cet ami est déjà dans votre liste ! 🤝"); return; } 
        
        friends.push({uid: friendUid, nickname: friendName}); 
        db.collection("users").doc(currentUser.uid).update({following: friends}).then(() => {
            // AJOUT RÉCIPROQUE AUTOMATIQUE SÉCURISÉ
            let theirFriends = friendData.following || [];
            if(!theirFriends.some(f => f.uid === currentUser.uid)) {
                theirFriends.push({uid: currentUser.uid, nickname: userNickname || "Inconnu"});
                db.collection("users").doc(friendUid).update({following: theirFriends}).catch(e => console.log("Réciprocité gérée."));
            }
            showToast(`${friendName} ajouté à vos amis ! ✨`); inputField.value = ""; renderGlobalFriends();
        });
    }).catch(e => showToast("Erreur réseau ❌"));
}

function renderGlobalFriends() {
    const container = document.getElementById('global-friends-list'); if(!container) return;
    if (friends.length === 0) { container.innerHTML = `<p style='font-size: 0.85rem; opacity: 0.5; font-style: italic; text-align: center;'>Vous n'avez pas encore d'amis.</p>`; return; }
    container.innerHTML = friends.map(f => `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px 15px; border-radius:10px; border: 1px solid rgba(128,128,128,0.2); width: 100%;"><span style="font-weight:bold;">👤 ${f.nickname}</span><button onclick="removeGlobalFriend('${f.uid}')" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:bold;">Retirer</button></div>`).join('');
}

function removeGlobalFriend(fUid) {
    friends = friends.filter(f => f.uid !== fUid);
    db.collection("users").doc(currentUser.uid).update({following: friends}).then(() => { renderGlobalFriends(); showToast("Ami retiré ! 🗑️"); });
}

// --- CASIER INVITATIONS DIRECTES AMIS (CASES À COCHER) ---
function renderFriendsCheckboxesForNewList() {
    const container = document.getElementById('create-list-friends-container'); const checkboxDiv = document.getElementById('create-list-friends-checkboxes'); if (!container || !checkboxDiv) return;
    if (friends.length === 0) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    checkboxDiv.innerHTML = friends.map(f => `<label style="display:flex; align-items:center; gap:5px; background:rgba(128,128,128,0.1); padding:4px 8px; border-radius:15px; font-size:0.8rem; cursor:pointer;"><input type="checkbox" class="friend-invite-cb" value="${f.uid}"> ${f.nickname}</label>`).join('');
}

function createNewSharedShoppingList() {
    const nameInput = document.getElementById('new-shared-list-name'); const name = nameInput.value.trim(); if (!name) { showToast("Donnez un nom ! ❌"); return; }
    const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const listType = document.getElementById('new-list-type') ? document.getElementById('new-list-type').value : 'standard';
    let selectedFriends = Array.from(document.querySelectorAll('.friend-invite-cb:checked')).map(cb => cb.value);

    const newList = { name: name, code: uniqueCode, createdBy: currentUser.uid, members: [currentUser.uid, ...selectedFriends], type: listType, createdAt: Date.now() };
    db.collection("shoppingLists").add(newList).then((docRef) => {
        document.getElementById('share-success-modal').style.display = 'flex';
        document.getElementById('success-list-name').innerText = `"${name}"`; document.getElementById('success-list-code').innerText = uniqueCode;
        nameInput.value = ''; document.querySelectorAll('.friend-invite-cb').forEach(cb => cb.checked = false);
        if (!mySharedLists.some(l => l.id === docRef.id)) { newList.id = docRef.id; mySharedLists.push(newList); }
        currentShoppingListId = docRef.id; renderShoppingTabs(); renderShoppingCategories(); syncCurrentShoppingItems(); updateParticipantsDisplay();
    });
}

// --- RENDU ET LIENS DES ONGLETS MARKET ---
function renderShoppingList() {
    try {
        const c = document.getElementById('shopping-list-content'); const scrollUpBtn = document.getElementById('shopping-scroll-up-btn'); if (!c) return; c.innerHTML = '';
        const sortVal = document.getElementById('shopping-sort-filter') ? document.getElementById('shopping-sort-filter').value : 'date';
        if (sortVal === 'alpha') shoppingItems.sort((a,b) => (a.name||"").localeCompare(b.name||"", 'fr', {sensitivity:'base'}));
        else if (sortVal === 'owner') shoppingItems.sort((a,b) => itemOwnerNameForSort(a).localeCompare(itemOwnerNameForSort(b), 'fr', {sensitivity:'base'}));
        else if (sortVal === 'rayon') shoppingItems.sort((a,b) => findRayonForProduct(a.name).localeCompare(findRayonForProduct(b.name), 'fr'));
        else shoppingItems.sort((a,b) => (a.createdAt||0) - (b.createdAt||0));

        const actives = shoppingItems.filter(item => !item.completed), completeds = shoppingItems.filter(item => item.completed);
        if (shoppingItems.length === 0) { c.innerHTML = '<p style="text-align:center; opacity:0.5; font-style:italic;">La liste est vide !</p>'; if(scrollUpBtn) scrollUpBtn.style.display = 'none'; return; }
        if(scrollUpBtn) scrollUpBtn.style.display = 'flex';

        // --- ENRICHISSEMENT DU BADGE PASTILLE COULEUR SUR L'ASSIGNATION ---
        const getOwnerTag = (item) => {
            if (currentShoppingListId === 'personal') return '';
            if (item.assignedToName) {
                const isMe = item.assignedToUid === currentUser.uid;
                return ` <small style="opacity:0.9; font-weight:bold; color:white; background: ${isMe ? 'var(--danger)' : 'var(--warning)'}; padding: 2px 7px; border-radius: 6px; font-size: 0.7rem; margin-left: 5px;">🎯 Ramené par ${isMe ? 'Moi' : item.assignedToName}</small>`;
            }
            return item.userId === currentUser.uid ? ` <small style="opacity:0.6; font-style:italic; color:var(--primary);">(Moi)</small>` : ` <small style="opacity:0.6; font-style:italic;">(${item.ownerName})</small>`;
        };

        let lastRayon = null;
        actives.forEach(item => {
            if (sortVal === 'rayon') { let r = findRayonForProduct(item.name); if(r !== lastRayon) { c.innerHTML += `<div style="text-align:left; margin:15px 0 5px 10px; font-size:0.85rem; font-weight:bold; color:var(--primary); opacity:0.7;">— ${r}</div>`; lastRayon = r; } }
            c.innerHTML += `<div class="task-card"><div style="flex:1; display:flex; align-items:center; min-width:0;"><div onclick="toggleShoppingCheck('${item.id}', false)" style="width:20px; height:20px; border:2px solid var(--primary); border-radius:5px; margin-right:10px; cursor:pointer;"></div><div style="flex:1;"><strong style="display:block;">${item.name || "Produit"}${getOwnerTag(item)}</strong><small style="color:var(--primary); font-weight:bold;">${item.info || ""}</small></div></div><div class="task-actions"><button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button></div></div>`;
        });
        if (completeds.length > 0) c.innerHTML += `<div class="task-section-separator"><span>Dans le chariot</span><button onclick="clearCompletedShopping()" style="background:none; border:none; color:var(--danger); font-size:0.85rem; text-decoration:underline; cursor:pointer;">Vider le cadie</button></div>`;
        completeds.forEach(item => {
            c.innerHTML += `<div class="task-card completed-bubble"><div style="flex:1; display:flex; align-items:center; min-width:0;"><div onclick="toggleShoppingCheck('${item.id}', true)" style="width:20px; height:20px; background:var(--success); border-radius:5px; margin-right:10px; display:flex; align-items:center; justify-content:center; color:white; font-size:0.8rem; cursor:pointer;">✓</div><div style="flex:1; text-decoration:line-through; opacity:0.6;"><strong>${item.name || "Produit"}${getOwnerTag(item)}</strong><br><small>${item.info || ""}</small></div></div><div class="task-actions"><button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button></div></div>`;
        });
    } catch(e) { console.error(e); }
}

// --- SYNC ET ÉCOUTEURS GENERAUX D'AUTHENTIFICATION ---
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user; document.getElementById('main-nav').style.display = 'flex'; if(document.getElementById('profile-user-email')) document.getElementById('profile-user-email').innerText = user.email || ""; requestNotificationPermission();
        unsubscribeUser = db.collection("users").doc(user.uid).onSnapshot((doc) => {
            try {
                let data = doc.exists ? doc.data() : {}; userNickname = data.nickname || "";
                if(document.getElementById('profile-nickname')) document.getElementById('profile-nickname').value = userNickname;
                customShoppingCards = data.customCards || []; myAgendaCode = data.shareCode;
                if(!myAgendaCode) { myAgendaCode = Math.random().toString(36).substring(2, 8).toUpperCase(); db.collection("users").doc(user.uid).set({shareCode: myAgendaCode, sharedWith: []}, {merge: true}); }
                if(document.getElementById('my-user-code')) document.getElementById('my-user-code').innerText = myAgendaCode;
                friends = data.following || [];
                if(document.getElementById('profile-page').style.display === 'block') renderGlobalFriends();
                if(document.getElementById('shopping-page').style.display === 'block') renderShoppingCategories();
            } catch(e){}
        });
        startRealtimeSync(user.uid); showPage('tasks');
    } else {
        currentUser = null; stopRealtimeSync(); document.getElementById('main-nav').style.display = 'none'; document.querySelectorAll('main > section').forEach(s => s.style.display = 'none'); document.getElementById('auth-page').style.display = 'block';
    }
});
