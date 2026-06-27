// ============================================================
// jsevents.js — Auth, Sync Firebase, Système d'amis
// VERSION CORRIGÉE : doublons supprimés
// ============================================================

auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('main-nav').style.display = 'none';
        const hbtn = document.getElementById('hamburger-btn');
        if (hbtn) hbtn.style.display = 'block';
        if (document.getElementById('profile-user-email')) document.getElementById('profile-user-email').innerText = user.email || "";
        if (typeof requestNotificationPermission === 'function') requestNotificationPermission();

        unsubscribeUser = db.collection("users").doc(user.uid).onSnapshot((doc) => {
            try {
                let data = doc.exists ? doc.data() : {};

                // Vérifier suppression programmée
                if (data.deletionScheduledAt) {
                    const deletionDate = new Date(data.deletionScheduledAt);
                    const now = new Date();
                    const daysLeft = Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24));
                    if (daysLeft <= 0) {
                        // 10 jours écoulés → suppression effective
                        _eraseAllData().catch(() => {});
                        return;
                    } else {
                        // Encore du temps → proposer la récupération
                        const msg = document.getElementById('recovery-days-msg');
                        if (msg) msg.innerHTML = `Votre compte sera supprimé dans <strong>${daysLeft} jour(s)</strong>.<br>Voulez-vous récupérer vos données ?`;
                        const modal = document.getElementById('recovery-account-modal');
                        if (modal) modal.style.display = 'flex';
                    }
                }

                userNickname = data.nickname || "";
                if (document.getElementById('profile-nickname')) document.getElementById('profile-nickname').value = userNickname;
                const preview = document.getElementById('profile-preview-name');
                if (preview && userNickname) preview.innerText = userNickname;
                customShoppingCards = data.customCards || [];

                let updateData = {};
                // Code agenda (partage historique)
                myAgendaCode = data.agendaCode || data.shareCode;
                if (!myAgendaCode) {
                    myAgendaCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                    updateData.agendaCode = myAgendaCode;
                }
                // Code amis (ajout d'amis)
                myFriendCode = data.friendCode;
                if (!myFriendCode) {
                    myFriendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                    updateData.friendCode = myFriendCode;
                }
                if (Object.keys(updateData).length > 0) {
                    db.collection("users").doc(user.uid).set(updateData, { merge: true });
                }

                if (document.getElementById('my-share-code') && document.getElementById('share-modal').style.display === 'flex')
                    document.getElementById('my-share-code').innerText = myAgendaCode;
                if (document.getElementById('my-friend-code-display'))
                    document.getElementById('my-friend-code-display').innerText = myFriendCode;

                friends = data.following || [];
                agendaLinks = data.agendaLinks || [];
                if (document.getElementById('friends-count-badge'))
                    document.getElementById('friends-count-badge').innerText = friends.length;
                if (document.getElementById('profile-page').style.display === 'block' && typeof renderGlobalFriends === 'function')
                    renderGlobalFriends();
                if (document.getElementById('shopping-page').style.display === 'block' && typeof renderShoppingCategories === 'function')
                    renderShoppingCategories();
            } catch (e) { console.error(e); }
        });

        startRealtimeSync(user.uid);
        showPage('tasks');
    } else {
        currentUser = null;
        userNickname = "";
        hasShownWelcomeThisSession = false;
        document.getElementById('main-nav').style.display = 'none';
        stopRealtimeSync();
        document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
        document.getElementById('auth-page').style.display = 'block';
    }
});

// ---- SYNC TEMPS RÉEL ----

let initialSyncDone = false;

function startRealtimeSync(userId) {
    initialSyncDone = false;

    unsubscribeTasks = db.collection("tasks").where("userId", "==", userId).onSnapshot((snapshot) => {
        tasks = [];
        snapshot.forEach((doc) => {
            let data = doc.data(); data.id = doc.id;
            if (!data.createdAt) data.createdAt = 0;
            else if (data.createdAt.seconds) data.createdAt = data.createdAt.seconds * 1000;
            tasks.push(data);
        });
        if (!initialSyncDone && tasks.length > 0) {
            initialSyncDone = true;
            setTimeout(() => { if (typeof processMidnightAutoArchive === 'function') processMidnightAutoArchive(); }, 1500);
        }
        if (typeof renderTasks === 'function') renderTasks();
        if (!hasShownWelcomeThisSession) {
            if (typeof triggerWelcomeModal === 'function') triggerWelcomeModal();
            hasShownWelcomeThisSession = true;
        }
        if (viewState === 'day' && typeof renderCalendar === 'function') renderCalendar();
        if (typeof scheduleLocalNotifications === 'function') scheduleLocalNotifications();
    });

    unsubscribeDaily = db.collection("dailyTodo").where("userId", "==", userId).onSnapshot((snapshot) => {
        dailyTodo = [];
        snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; dailyTodo.push(data); });
        if (typeof renderTodo === 'function') renderTodo();
    });

    unsubscribeWeekly = db.collection("weeklyTodo").where("userId", "==", userId).onSnapshot((snapshot) => {
        weeklyTodo = [];
        snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; weeklyTodo.push(data); });
        if (typeof renderTodo === 'function') renderTodo();
    });

    unsubscribeRoutine = db.collection("routineTodo").where("userId", "==", userId).onSnapshot((snapshot) => {
        routineTodo = [];
        snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; routineTodo.push(data); });
        if (typeof renderTodo === 'function') renderTodo();
    });

    unsubscribeBirthdays = db.collection("birthdays").where("userId", "==", userId).onSnapshot((snapshot) => {
        birthdays = [];
        snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; birthdays.push(data); });
        if (viewState === 'day' && typeof renderCalendar === 'function') renderCalendar();
        if (typeof scheduleLocalNotifications === 'function') scheduleLocalNotifications();
    });

    sharedListsUnsubscribe = db.collection("shoppingLists").where("members", "array-contains", userId).onSnapshot((snapshot) => {
        mySharedLists = [];
        snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; mySharedLists.push(data); });
        if (currentShoppingListId !== "personal" && !mySharedLists.some(l => l.id === currentShoppingListId)) {
            currentShoppingListId = "personal";
        }
        if (typeof renderShoppingTabs === 'function') renderShoppingTabs();
        if (typeof syncCurrentShoppingItems === 'function') syncCurrentShoppingItems();
        if (typeof updateParticipantsDisplay === 'function') updateParticipantsDisplay();
        if (document.getElementById('shopping-list-multi-share-modal') &&
            document.getElementById('shopping-list-multi-share-modal').style.display === 'flex' &&
            typeof renderMySharedListsInModal === 'function') renderMySharedListsInModal();
    });

    friends.forEach(f => startFriendSync(f.uid, f.nickname, 'agenda'));
    agendaLinks.forEach(a => startFriendSync(a.uid, a.nickname, 'agenda'));
}

function startFriendSync(fUid, fName, mode) {
    if (mode === 'agenda') {
        if (friendUnsubscribes[fUid]) return;
        friendUnsubscribes[fUid] = db.collection("tasks").where("userId", "==", fUid).onSnapshot((snapshot) => {
            sharedTasks = sharedTasks.filter(t => t.userId !== fUid);
            snapshot.forEach((doc) => {
                let data = doc.data(); data.id = doc.id; data.ownerName = fName;
                if (!data.createdAt) data.createdAt = 0;
                else if (data.createdAt.seconds) data.createdAt = data.createdAt.seconds * 1000;
                sharedTasks.push(data);
            });
            if (viewState === 'day' && typeof renderCalendar === 'function') renderCalendar();
            if (typeof scheduleLocalNotifications === 'function') scheduleLocalNotifications();
        });
    }
}

function stopRealtimeSync() {
    if (typeof unsubscribeTasks !== 'undefined' && unsubscribeTasks) unsubscribeTasks();
    if (typeof unsubscribeDaily !== 'undefined' && unsubscribeDaily) unsubscribeDaily();
    if (typeof unsubscribeWeekly !== 'undefined' && unsubscribeWeekly) unsubscribeWeekly();
    if (typeof unsubscribeRoutine !== 'undefined' && unsubscribeRoutine) unsubscribeRoutine();
    if (typeof unsubscribeBirthdays !== 'undefined' && unsubscribeBirthdays) unsubscribeBirthdays();
    if (typeof unsubscribeUser !== 'undefined' && unsubscribeUser) unsubscribeUser();
    if (typeof sharedListsUnsubscribe !== 'undefined' && sharedListsUnsubscribe) sharedListsUnsubscribe();
    if (typeof shoppingItemsUnsubscribe !== 'undefined' && shoppingItemsUnsubscribe) shoppingItemsUnsubscribe();
    Object.values(friendUnsubscribes).forEach(u => u());
    friendUnsubscribes = {};
    tasks = []; sharedTasks = []; dailyTodo = []; weeklyTodo = [];
    routineTodo = []; birthdays = []; friends = []; agendaLinks = []; shoppingItems = []; mySharedLists = [];
}

// ---- PROFIL & PARTAGE ----

function openProfileNicknameModal() {
    if (document.getElementById('profile-nickname'))
        document.getElementById('profile-nickname').value = userNickname;

    // Afficher email actuel
    const emailEl = document.getElementById('profile-current-email');
    if (emailEl && currentUser) emailEl.innerText = currentUser.email || '';

    // Détecter si compte Google
    const isGoogle = currentUser?.providerData?.some(p => p.providerId === 'google.com');
    const emailSection = document.getElementById('profile-email-section');
    const passSection  = document.getElementById('profile-password-section');
    const googleMsg    = document.getElementById('profile-google-msg');
    if (isGoogle) {
        if (emailSection) emailSection.style.display = 'none';
        if (passSection)  passSection.style.display  = 'none';
        if (googleMsg)    googleMsg.style.display     = 'block';
    } else {
        if (emailSection) emailSection.style.display = 'block';
        if (passSection)  passSection.style.display  = 'block';
        if (googleMsg)    googleMsg.style.display     = 'none';
    }

    // Reset champs
    ['profile-new-email','profile-email-confirm-pass','profile-new-pass'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
    });
    const disp = document.getElementById('profile-current-pass-display');
    const real = document.getElementById('profile-current-pass-real');
    if (disp) disp.value = ''; if (real) real.value = '';

    document.getElementById('profile-nickname-modal').style.display = 'flex';
}

// Masque le mot de passe : 3 premiers chars visibles + *
function updatePassMask() {
    const real = document.getElementById('profile-current-pass-real');
    const disp = document.getElementById('profile-current-pass-display');
    if (!real || !disp) return;
    const val = real.value;
    const visible = val.substring(0, 3);
    const masked  = '*'.repeat(Math.max(0, val.length - 3));
    disp.value = visible + masked;
}

function changeEmail() {
    const newEmail  = document.getElementById('profile-new-email')?.value.trim();
    const pass      = document.getElementById('profile-email-confirm-pass')?.value;
    if (!newEmail || !pass) { showToast("Remplissez tous les champs ⚠️"); return; }
    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, pass);
    currentUser.reauthenticateWithCredential(credential)
        .then(() => currentUser.updateEmail(newEmail))
        .then(() => {
            db.collection("users").doc(currentUser.uid).set({ email: newEmail }, { merge: true });
            showToast("E-mail mis à jour ✅");
            document.getElementById('profile-current-email').innerText = newEmail;
            document.getElementById('profile-new-email').value = '';
            document.getElementById('profile-email-confirm-pass').value = '';
        })
        .catch(err => showToast("Erreur : " + err.message));
}

function changePassword() {
    const currentPass = document.getElementById('profile-current-pass-real')?.value;
    const newPass     = document.getElementById('profile-new-pass')?.value;
    if (!currentPass || !newPass) { showToast("Remplissez tous les champs ⚠️"); return; }
    if (newPass.length < 6) { showToast("Le mot de passe doit faire au moins 6 caractères ⚠️"); return; }
    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, currentPass);
    currentUser.reauthenticateWithCredential(credential)
        .then(() => currentUser.updatePassword(newPass))
        .then(() => {
            showToast("Mot de passe mis à jour ✅");
            document.getElementById('profile-current-pass-real').value = '';
            document.getElementById('profile-current-pass-display').value = '';
            document.getElementById('profile-new-pass').value = '';
        })
        .catch(err => showToast("Erreur : " + err.message));
}

function sendResetPasswordEmail() {
    const email = currentUser?.email;
    if (!email) { showToast("Aucun e-mail associé ⚠️"); return; }
    auth.sendPasswordResetEmail(email)
        .then(() => showToast("E-mail de réinitialisation envoyé à " + email + " 📧"))
        .catch(err => showToast("Erreur : " + err.message));
}

function openDeleteAccountModal() {
    const isGoogle = currentUser?.providerData?.some(p => p.providerId === 'google.com');
    document.getElementById('delete-account-email-block').style.display = isGoogle ? 'none' : 'block';
    document.getElementById('delete-account-google-msg').style.display = isGoogle ? 'block' : 'none';
    const passEl = document.getElementById('delete-account-pass');
    if (passEl) passEl.value = '';
    document.getElementById('profile-nickname-modal').style.display = 'none';
    document.getElementById('delete-account-modal').style.display = 'flex';
}

async function _reauthenticate() {
    const isGoogle = currentUser.providerData?.some(p => p.providerId === 'google.com');
    if (isGoogle) {
        const provider = new firebase.auth.GoogleAuthProvider();
        await currentUser.reauthenticateWithPopup(provider);
    } else {
        const pass = document.getElementById('delete-account-pass')?.value;
        if (!pass) throw new Error("Mot de passe requis ⚠️");
        const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, pass);
        await currentUser.reauthenticateWithCredential(credential);
    }
}

async function _eraseAllData() {
    const uid = currentUser.uid;
    const batch = db.batch();
    const collections = ['tasks', 'shopping', 'dailyTodo', 'weeklyTodo', 'routineTodo', 'birthdays'];
    for (const col of collections) {
        const snap = await db.collection(col).where('userId', '==', uid).get();
        snap.forEach(doc => batch.delete(doc.ref));
    }
    const listsSnap = await db.collection('shoppingLists').where('members', 'array-contains', uid).get();
    listsSnap.forEach(doc => {
        const members = (doc.data().members || []).filter(m => m !== uid);
        members.length === 0 ? batch.delete(doc.ref) : batch.update(doc.ref, { members });
    });
    batch.delete(db.collection('users').doc(uid));
    await batch.commit();
    await currentUser.delete();
}

async function confirmDeleteAccount() {
    if (!currentUser) return;
    try {
        await _reauthenticate();
        // Planifier la suppression dans 10 jours (soft delete)
        const deletionDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
        await db.collection('users').doc(currentUser.uid).update({ deletionScheduledAt: deletionDate });
        document.getElementById('delete-account-modal').style.display = 'none';
        showToast("Suppression programmée dans 10 jours. Reconnectez-vous pour annuler.");
        await auth.signOut();
    } catch (err) {
        showToast("Erreur : " + err.message);
    }
}

async function confirmDeleteNow() {
    if (!currentUser) return;
    try {
        showToast("Suppression en cours... ⏳");
        await _eraseAllData();
        document.getElementById('recovery-account-modal').style.display = 'none';
        showToast("Compte supprimé. À bientôt ! 👋");
    } catch (err) {
        showToast("Erreur : " + err.message);
    }
}

async function cancelAccountDeletion() {
    if (!currentUser) return;
    await db.collection('users').doc(currentUser.uid).update({
        deletionScheduledAt: firebase.firestore.FieldValue.delete()
    });
    document.getElementById('recovery-account-modal').style.display = 'none';
    showToast("Suppression annulée, bon retour ! 🎉");
}

function autoSaveNickname() {
    const nick = document.getElementById('profile-nickname').value.trim();
    if (currentUser) {
        db.collection("users").doc(currentUser.uid).set({ nickname: nick }, { merge: true }).then(() => {
            userNickname = nick;
            const preview = document.getElementById('profile-preview-name');
            if (preview) preview.innerText = nick || "Modifier mon nom d'affichage";
            showToast("Surnom mis à jour ! ✨");
        });
    }
}

function openShareModal(mode) {
    currentShareMode = mode;
    document.getElementById('share-modal-title').innerText = "Agenda Partagé 🤝";
    if (document.getElementById('my-share-code')) document.getElementById('my-share-code').innerText = myAgendaCode;
    renderAgendaLinksList();
    document.getElementById('share-modal').style.display = 'flex';
}

function renderAgendaLinksList() {
    const container = document.getElementById('friends-list-container');
    if (!container) return;
    if (agendaLinks.length === 0) {
        container.innerHTML = `<p style='font-size:0.85rem; opacity:0.5; font-style:italic; text-align:center; width:100%; margin-top:10px;'>Aucun agenda lié pour l'instant.</p>`;
        return;
    }
    container.innerHTML = agendaLinks.map(a => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px 15px; border-radius:10px; margin-top:10px; border:1px solid rgba(128,128,128,0.2); width:100%;">
            <span style="font-weight:bold; color:var(--primary-dark);">📅 ${a.nickname}</span>
            <button onclick="removeAgendaLink('${a.uid}')" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:bold;">Retirer</button>
        </div>`).join('');
}

function removeAgendaLink(uid) {
    agendaLinks = agendaLinks.filter(a => a.uid !== uid);
    db.collection("users").doc(currentUser.uid).update({ agendaLinks: agendaLinks }).then(() => {
        if (friendUnsubscribes[uid]) { friendUnsubscribes[uid](); delete friendUnsubscribes[uid]; }
        sharedTasks = sharedTasks.filter(t => t.userId !== uid);
        if (typeof renderCalendar === 'function') renderCalendar();
        renderAgendaLinksList();
        showToast("Agenda retiré ! 🗑️");
    });
}

function copyShareCode() {
    const code = document.getElementById('my-share-code').innerText;
    navigator.clipboard.writeText(code).then(() => showToast("Code copié ! 📋"));
}

function copyUserCode() {
    navigator.clipboard.writeText(myFriendCode).then(() => showToast("Code ami copié ! 📋"));
}
function copyAgendaCode() {
    navigator.clipboard.writeText(myAgendaCode).then(() => showToast("Code agenda copié ! 📋"));
}

// ---- LISTE D'AMIS (modal Agenda) ----

function renderFriendsList() {
    const container = document.getElementById('friends-list-container');
    if (!container) return;
    if (friends.length === 0) {
        container.innerHTML = `<p style='font-size: 0.85rem; opacity: 0.5; font-style: italic; text-align: center; width: 100%;'>Aucun agenda lié.</p>`;
        return;
    }
    container.innerHTML = friends.map(f => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px 15px; border-radius:10px; margin-top:10px; border: 1px solid rgba(128,128,128,0.2); width: 100%;">
            <span style="font-weight:bold; color:var(--primary-dark);">👤 ${f.nickname}</span>
            <button onclick="removeFriend('${f.uid}')" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:bold;">Retirer</button>
        </div>`).join('');
}

function removeFriend(fUid) {
    friends = friends.filter(f => f.uid !== fUid);
    db.collection("users").doc(currentUser.uid).set({ following: friends }, { merge: true }).then(() => {
        renderFriendsList();
        if (friendUnsubscribes[fUid]) { friendUnsubscribes[fUid](); delete friendUnsubscribes[fUid]; }
        sharedTasks = sharedTasks.filter(t => t.userId !== fUid);
        if (typeof renderCalendar === 'function') renderCalendar();
        showToast("Agenda retiré ! 🗑️");
    });
}

// ---- SYSTÈME D'AMIS GLOBAL ----

function addGlobalFriend() {
    const inputField = document.getElementById('add-friend-input');
    if (!inputField) return;
    const code = inputField.value.trim().toUpperCase();
    if (!code) { showToast("Veuillez saisir un code ! ⚠️"); return; }
    if (code === myFriendCode) { showToast("Vous ne pouvez pas vous ajouter vous-même ! 😅"); return; }

    showToast("Recherche en cours... ⏳");

    db.collection("users").where("friendCode", "==", code).get().then(snapshot => {
        if (snapshot.empty) { showToast("Code introuvable ! ❌"); return; }
        let friendDoc = snapshot.docs[0];
        let friendUid = friendDoc.id;
        let friendData = friendDoc.data();
        let friendName = friendData.nickname || "Inconnu";

        if (friends.some(f => f.uid === friendUid)) {
            showToast("Cet ami est déjà dans votre liste ! 🤝");
            return;
        }

        friends.push({ uid: friendUid, nickname: friendName });
        db.collection("users").doc(currentUser.uid).update({ following: friends }).then(() => {
            // Réciprocité (peut échouer selon règles Firestore, non bloquant)
            let theirFriends = friendData.following || [];
            if (!theirFriends.some(f => f.uid === currentUser.uid)) {
                theirFriends.push({ uid: currentUser.uid, nickname: userNickname || "Inconnu" });
                db.collection("users").doc(friendUid).update({ following: theirFriends }).catch(err => {
                    console.warn("Réciprocité non appliquée (règles Firestore) :", err);
                });
            }
            showToast(`${friendName} ajouté à vos amis ! ✨`);
            inputField.value = "";
            renderGlobalFriends();
            startFriendSync(friendUid, friendName, 'agenda');
        }).catch(() => showToast("Erreur lors de l'enregistrement ❌"));
    }).catch(() => showToast("Erreur réseau ❌"));
}

function openFriendsModal() {
    const searchInput = document.getElementById('friend-search-input');
    if (searchInput) searchInput.value = "";
    const codeEl = document.getElementById('my-friend-code-display');
    if (codeEl) codeEl.innerText = myFriendCode || '------';
    renderGlobalFriends();
    document.getElementById('friends-list-modal').style.display = 'flex';
}

function filterFriendsList() {
    renderGlobalFriends();
}

function renderGlobalFriends() {
    const container = document.getElementById('global-friends-list');
    const badge = document.getElementById('friends-count-badge');
    if (badge) badge.innerText = friends.length;
    if (!container) return;

    if (friends.length === 0) {
        container.innerHTML = `<p style='font-size: 0.85rem; opacity: 0.5; font-style: italic; text-align: center; margin-top: 10px;'>Vous n'avez pas encore ajouté d'amis.</p>`;
        return;
    }

    const searchQuery = (document.getElementById('friend-search-input')?.value || "").toLowerCase().trim();
    const filteredFriends = friends.filter(f => f.nickname.toLowerCase().includes(searchQuery));

    if (filteredFriends.length === 0) {
        container.innerHTML = `<p style='font-size: 0.85rem; opacity: 0.5; font-style: italic; text-align: center; margin-top: 10px;'>Aucun ami trouvé pour "${searchQuery}".</p>`;
        return;
    }

    container.innerHTML = filteredFriends.map(f => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px 15px; border-radius:10px; border: 1px solid rgba(128,128,128,0.2); width: 100%;">
            <span style="font-weight:bold;">👤 ${f.nickname}</span>
            <button onclick="removeGlobalFriend('${f.uid}')" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:0.8rem; cursor:pointer; font-weight:bold;">Retirer</button>
        </div>`).join('');
}

function removeGlobalFriend(fUid) {
    friends = friends.filter(f => f.uid !== fUid);
    db.collection("users").doc(currentUser.uid).update({ following: friends }).then(() => {
        db.collection("users").doc(fUid).get().then(doc => {
            if (doc.exists) {
                let theirFriends = doc.data().following || [];
                theirFriends = theirFriends.filter(f => f.uid !== currentUser.uid);
                db.collection("users").doc(fUid).update({ following: theirFriends }).catch(e => console.warn("Retrait distant ignoré."));
            }
        });
        renderGlobalFriends();
        if (friendUnsubscribes[fUid]) { friendUnsubscribes[fUid](); delete friendUnsubscribes[fUid]; }
        sharedTasks = sharedTasks.filter(t => t.userId !== fUid);
        if (typeof renderCalendar === 'function') renderCalendar();
        showToast("Ami retiré ! 🗑️");
    });
}

// ---- PRÉFÉRENCES NOTIFICATIONS ----
function loadNotifPrefs() {
    const prefs = JSON.parse(localStorage.getItem('notifPrefs') || '{"tasks":true,"birthdays":true,"shopping":true}');
    ['tasks','birthdays','shopping'].forEach(key => {
        _applyNotifToggle(key, prefs[key]);
    });
}

function toggleNotifPref(key) {
    const prefs = JSON.parse(localStorage.getItem('notifPrefs') || '{"tasks":true,"birthdays":true,"shopping":true}');
    prefs[key] = !prefs[key];
    localStorage.setItem('notifPrefs', JSON.stringify(prefs));
    _applyNotifToggle(key, prefs[key]);
}

function _applyNotifToggle(key, active) {
    const toggle = document.getElementById(`notif-toggle-${key}`);
    const thumb = document.getElementById(`notif-thumb-${key}`);
    if (!toggle || !thumb) return;
    toggle.style.background = active ? 'var(--primary)' : 'rgba(128,128,128,0.4)';
    thumb.style.left = active ? '23px' : '3px';
}

function isNotifEnabled(key) {
    const prefs = JSON.parse(localStorage.getItem('notifPrefs') || '{"tasks":true,"birthdays":true,"shopping":true}');
    return prefs[key] !== false;
}
