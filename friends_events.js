auth.onAuthStateChanged((user) => {
    // ... (dans auth.onAuthStateChanged) ...
if(document.getElementById('my-user-code')) {
    document.getElementById('my-user-code').innerText = myAgendaCode;
}
if(document.getElementById('profile-page').style.display === 'block') {
    renderGlobalFriends();
}
// ...
    if (user) {
        currentUser = user; document.getElementById('main-nav').style.display = 'flex'; if(document.getElementById('profile-user-email')) document.getElementById('profile-user-email').innerText = user.email || ""; if(typeof requestNotificationPermission === 'function') requestNotificationPermission();
        
        unsubscribeUser = db.collection("users").doc(user.uid).onSnapshot((doc) => {
            try {
                let data = doc.exists ? doc.data() : {}; userNickname = data.nickname || "";
                if(document.getElementById('profile-nickname')) document.getElementById('profile-nickname').value = userNickname;
                customShoppingCards = data.customCards || []; 
                let updateData = {}; myAgendaCode = data.shareCode;
                if(!myAgendaCode) { myAgendaCode = Math.random().toString(36).substring(2, 8).toUpperCase(); updateData.shareCode = myAgendaCode; updateData.sharedWith = []; }
                if(Object.keys(updateData).length > 0) { db.collection("users").doc(user.uid).set(updateData, {merge: true}); }
                if(document.getElementById('my-share-code') && document.getElementById('share-modal').style.display === 'flex') document.getElementById('my-share-code').innerText = myAgendaCode;
                if(document.getElementById('my-user-code')) document.getElementById('my-user-code').innerText = myAgendaCode;
                
                friends = data.following || [];
                if(document.getElementById('profile-page').style.display === 'block' && typeof renderGlobalFriends === 'function') renderGlobalFriends();
                if(document.getElementById('shopping-page').style.display === 'block' && typeof renderShoppingCategories === 'function') renderShoppingCategories();
            } catch (e) { console.error(e); }
        });

        startRealtimeSync(user.uid); showPage('tasks');
    } else {
        currentUser = null; userNickname = ""; hasShownWelcomeThisSession = false; document.getElementById('main-nav').style.display = 'none'; stopRealtimeSync(); document.querySelectorAll('main > section').forEach(s => s.style.display = 'none'); document.getElementById('auth-page').style.display = 'block';
    }
});

let initialSyncDone = false;
function startRealtimeSync(userId) {
    initialSyncDone = false; 
    unsubscribeTasks = db.collection("tasks").where("userId", "==", userId).onSnapshot((snapshot) => { tasks = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; if (!data.createdAt) { data.createdAt = 0; } else if (data.createdAt.seconds) { data.createdAt = data.createdAt.seconds * 1000; } tasks.push(data); }); if (!initialSyncDone && tasks.length > 0) { initialSyncDone = true; setTimeout(() => {if(typeof processMidnightAutoArchive === 'function') processMidnightAutoArchive();}, 1500); } if(typeof renderTasks === 'function') renderTasks(); if (!hasShownWelcomeThisSession) { if(typeof triggerWelcomeModal === 'function') triggerWelcomeModal(); hasShownWelcomeThisSession = true; } if(viewState === 'day' && typeof renderCalendar === 'function') renderCalendar(); });
    unsubscribeDaily = db.collection("dailyTodo").where("userId", "==", userId).onSnapshot((snapshot) => { dailyTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; dailyTodo.push(data); }); if(typeof renderTodo === 'function') renderTodo(); });
    unsubscribeWeekly = db.collection("weeklyTodo").where("userId", "==", userId).onSnapshot((snapshot) => { weeklyTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; weeklyTodo.push(data); }); if(typeof renderTodo === 'function') renderTodo(); });
    unsubscribeRoutine = db.collection("routineTodo").where("userId", "==", userId).onSnapshot((snapshot) => { routineTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; routineTodo.push(data); }); if(typeof renderTodo === 'function') renderTodo(); });
    unsubscribeBirthdays = db.collection("birthdays").where("userId", "==", userId).onSnapshot((snapshot) => { birthdays = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; birthdays.push(data); }); if(viewState === 'day' && typeof renderCalendar === 'function') renderCalendar(); });
    
    sharedListsUnsubscribe = db.collection("shoppingLists").where("members", "array-contains", userId).onSnapshot((snapshot) => {
        mySharedLists = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; mySharedLists.push(data); });
        if (currentShoppingListId !== "personal" && !mySharedLists.some(l => l.id === currentShoppingListId)) { currentShoppingListId = "personal"; }
        if(typeof renderShoppingTabs === 'function') renderShoppingTabs(); if(typeof syncCurrentShoppingItems === 'function') syncCurrentShoppingItems(); if(typeof updateParticipantsDisplay === 'function') updateParticipantsDisplay();
        if (document.getElementById('shopping-list-multi-share-modal') && document.getElementById('shopping-list-multi-share-modal').style.display === 'flex' && typeof renderMySharedListsInModal === 'function') renderMySharedListsInModal();
    });
    friends.forEach(f => startFriendSync(f.uid, f.nickname, 'agenda'));
}

function startFriendSync(fUid, fName, mode) {
    if (mode === 'agenda') {
        if(friendUnsubscribes[fUid]) return;
        friendUnsubscribes[fUid] = db.collection("tasks").where("userId", "==", fUid).onSnapshot((snapshot) => { sharedTasks = sharedTasks.filter(t => t.userId !== fUid); snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; data.ownerName = fName; if (!data.createdAt) { data.createdAt = 0; } else if (data.createdAt.seconds) { data.createdAt = data.createdAt.seconds * 1000; } sharedTasks.push(data); }); if(viewState === 'day' && typeof renderCalendar === 'function') renderCalendar(); });
    }
}

function stopRealtimeSync() { 
    if (typeof unsubscribeTasks !== 'undefined' && unsubscribeTasks) unsubscribeTasks(); if (typeof unsubscribeDaily !== 'undefined' && unsubscribeDaily) unsubscribeDaily(); if (typeof unsubscribeWeekly !== 'undefined' && unsubscribeWeekly) unsubscribeWeekly(); if (typeof unsubscribeRoutine !== 'undefined' && unsubscribeRoutine) unsubscribeRoutine(); if (typeof unsubscribeBirthdays !== 'undefined' && unsubscribeBirthdays) unsubscribeBirthdays(); if(typeof unsubscribeUser !== 'undefined' && unsubscribeUser) unsubscribeUser();
    if (typeof sharedListsUnsubscribe !== 'undefined' && sharedListsUnsubscribe) sharedListsUnsubscribe(); if (typeof shoppingItemsUnsubscribe !== 'undefined' && shoppingItemsUnsubscribe) shoppingItemsUnsubscribe();
    Object.values(friendUnsubscribes).forEach(u => u()); friendUnsubscribes = {};
    tasks = []; sharedTasks = []; dailyTodo = []; weeklyTodo = []; routineTodo = []; birthdays = []; friends = []; shoppingItems = []; mySharedLists = [];
}

function autoSaveNickname() { const nick = document.getElementById('profile-nickname').value.trim(); if (currentUser) { db.collection("users").doc(currentUser.uid).set({ nickname: nick }, { merge: true }).then(() => { userNickname = nick; showToast("Surnom mis à jour ! ✨"); }); } }
function openShareModal(mode) { currentShareMode = mode; document.getElementById('share-modal-title').innerText = "Partage Agenda 🤝"; document.getElementById('my-share-code').innerText = myAgendaCode; renderFriendsList(); document.getElementById('share-modal').style.display = 'flex'; }
function copyShareCode() { const code = document.getElementById('my-share-code').innerText; navigator.clipboard.writeText(code).then(() => showToast("Code copié ! 📋")); }
function copyUserCode() { const code = document.getElementById('my-user-code').innerText; navigator.clipboard.writeText(code).then(() => showToast("Code copié ! 📋")); }

function renderFriendsList() { 
    const container = document.getElementById('friends-list-container'); if(!container) return; 
    if (friends.length === 0) { container.innerHTML = `<p style='font-size: 0.85rem; opacity: 0.5; font-style: italic; text-align: center; width: 100%;'>Aucun agenda lié.</p>`; return; }
    container.innerHTML = friends.map(f => `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px 15px; border-radius:10px; margin-top:10px; border: 1px solid rgba(128,128,128,0.2); width: 100%;"><span style="font-weight:bold; color:var(--primary-dark);">👤 ${f.nickname}</span><button onclick="removeFriend('${f.uid}')" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:bold;">Retirer</button></div>`).join(''); 
}

function removeFriend(fUid) { 
    friends = friends.filter(f => f.uid !== fUid); 
    db.collection("users").doc(currentUser.uid).set({following: friends}, {merge: true}).then(() => { renderFriendsList(); if(friendUnsubscribes[fUid]) { friendUnsubscribes[fUid](); delete friendUnsubscribes[fUid]; } sharedTasks = sharedTasks.filter(t => t.userId !== fUid); if(typeof renderCalendar === 'function') renderCalendar(); showToast("Agenda retiré ! 🗑️"); }); 
}

// --- SYSTÈME D'AMIS GLOBAL ---

function copyUserCode() {
    const code = document.getElementById('my-user-code').innerText;
    navigator.clipboard.writeText(code).then(() => showToast("Code copié ! Donnez-le à vos amis. 📋"));
}

function addGlobalFriend() {
    const inputField = document.getElementById('add-friend-input');
    if (!inputField) return;

    const code = inputField.value.trim().toUpperCase(); 
    if(!code) { showToast("Veuillez saisir un code ! ⚠️"); return; }
    if(code === myAgendaCode) { showToast("Vous ne pouvez pas vous ajouter vous-même ! 😅"); return; }
    
    showToast("Recherche en cours... ⏳");
    
    // On cherche l'utilisateur qui possède ce code
    db.collection("users").where("shareCode", "==", code).get().then(snapshot => { 
        if(snapshot.empty) { showToast("Code introuvable ! ❌"); return; } 
        
        let friendDoc = snapshot.docs[0];
        let friendUid = friendDoc.id;
        let friendData = friendDoc.data(); 
        let friendName = friendData.nickname || "Inconnu"; 
        
        if(friends.some(f => f.uid === friendUid)) { 
            showToast("Cet ami est déjà dans votre liste ! 🤝"); 
            return; 
        } 
        
        // 1. On l'ajoute de NOTRE côté
        friends.push({uid: friendUid, nickname: friendName}); 
        db.collection("users").doc(currentUser.uid).update({following: friends}).then(() => {
            
            // 2. RÉCIPROCITÉ : On s'ajoute de SON côté automatiquement
            let theirFriends = friendData.following || [];
            if(!theirFriends.some(f => f.uid === currentUser.uid)) {
                theirFriends.push({uid: currentUser.uid, nickname: userNickname || "Inconnu"});
                
                db.collection("users").doc(friendUid).update({following: theirFriends}).catch(err => {
                    console.warn("Info: La sécurité Firebase empêche l'écriture distante, mais l'ajout local a fonctionné.", err);
                });
            }

            showToast(`${friendName} ajouté à vos amis ! ✨`);
            inputField.value = ""; 
            renderGlobalFriends();
            
        }).catch(err => {
            showToast("Erreur lors de l'enregistrement ❌");
        });
    }).catch(err => {
        showToast("Erreur réseau ❌");
    }); 
}

function renderGlobalFriends() {
    const container = document.getElementById('global-friends-list');
    if(!container) return;
    
    if (friends.length === 0) { 
        container.innerHTML = `<p style='font-size: 0.85rem; opacity: 0.5; font-style: italic; text-align: center;'>Vous n'avez pas encore ajouté d'amis.</p>`; 
        return; 
    }
    
    container.innerHTML = friends.map(f => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px 15px; border-radius:10px; border: 1px solid rgba(128,128,128,0.2); width: 100%;">
            <span style="font-weight:bold; color:var(--primary-dark);">👤 ${f.nickname}</span>
            <button onclick="removeGlobalFriend('${f.uid}')" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:0.8rem; cursor:pointer; font-weight:bold;">Retirer</button>
        </div>
    `).join('');
}

function removeGlobalFriend(fUid) { 
    // On se retire de notre côté
    friends = friends.filter(f => f.uid !== fUid); 
    db.collection("users").doc(currentUser.uid).update({following: friends}).then(() => { 
        
        // Réciprocité : on essaie de se retirer de SA liste aussi
        db.collection("users").doc(fUid).get().then(doc => {
            if(doc.exists) {
                let theirFriends = doc.data().following || [];
                theirFriends = theirFriends.filter(f => f.uid !== currentUser.uid);
                db.collection("users").doc(fUid).update({following: theirFriends}).catch(e => console.warn("Retrait distant ignoré."));
            }
        });

        renderGlobalFriends(); 
        if(friendUnsubscribes[fUid]) { friendUnsubscribes[fUid](); delete friendUnsubscribes[fUid]; } 
        sharedTasks = sharedTasks.filter(t => t.userId !== fUid); 
        if(typeof renderCalendar === 'function') renderCalendar(); 
        showToast("Ami retiré ! 🗑️"); 
    }); 
}
