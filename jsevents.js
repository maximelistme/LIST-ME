// --- GESTION DES BOUTONS DE RAPPEL (MODAL TÂCHES) ---
document.querySelectorAll('.reminder-badge').forEach(badge => { 
    badge.onclick = () => { 
        if(!badge.classList.contains('disabled-frozen')) { 
            badge.classList.toggle('active'); 
        } 
    }; 
});

function getSelectedRemindersFromBadges() { 
    let activeReminders = []; 
    document.querySelectorAll('.reminder-badge.active').forEach(b => activeReminders.push(b.getAttribute('data-value'))); 
    return activeReminders; 
}

function setSelectedRemindersToBadges(remindersArray) { 
    document.querySelectorAll('.reminder-badge').forEach(b => { 
        if(remindersArray && remindersArray.includes(b.getAttribute('data-value'))) {
            b.classList.add('active'); 
        } else {
            b.classList.remove('active'); 
        }
    }); 
}

// --- ÉVÉNEMENTS CLICS (CONNEXION & BOUTONS PRINCIPAUX) ---
let btnLogin = document.getElementById('btn-login'); if (btnLogin) { btnLogin.onclick = () => { const email = document.getElementById('auth-email').value, pass = document.getElementById('auth-pass').value; if(email && pass) auth.signInWithEmailAndPassword(email, pass).then(() => { showToast("Ravi de vous revoir ! 👋"); }).catch(err => showToast("Erreur : " + err.message)); }; }
let btnRegister = document.getElementById('btn-register'); if (btnRegister) { btnRegister.onclick = () => { const email = document.getElementById('auth-email').value, pass = document.getElementById('auth-pass').value; if(email && pass) auth.createUserWithEmailAndPassword(email, pass).then(() => showToast("Compte créé avec succès ! 🎉")).catch(err => showToast("Erreur : " + err.message)); }; }
let btnGoogle = document.getElementById('btn-google'); if (btnGoogle) { btnGoogle.onclick = () => { const provider = new firebase.auth.GoogleAuthProvider(); auth.signInWithPopup(provider).then(() => { showToast("Connexion Google réussie ! 🚀"); }).catch((err) => { showToast("Erreur Google : " + err.message); }); }; }
let btnLogout = document.getElementById('btn-logout'); if (btnLogout) { btnLogout.onclick = () => { auth.signOut().then(() => { showToast("Déconnexion réussie."); }); }; }

let btnSaveTask = document.getElementById('save-task'); if (btnSaveTask) { btnSaveTask.onclick = () => { const n = document.getElementById('task-name').value.trim(), dStr = document.getElementById('task-desc').value.trim(), singleDate = document.getElementById('task-date').value, time = getCustomTime('task-time'), imp = document.getElementById('task-importance').value, reminders = getSelectedRemindersFromBadges(); if(n && currentUser) { if(document.getElementById('modal-title').innerText === "Dupliquer la tâche" && editingId) { const task = tasks.find(t => t.id === editingId); if (task && singleDate) { let allOccurrences = [{date: task.date, time: task.time || ""}], currentGhosts = Array.isArray(task.duplicateDays) ? task.duplicateDays : []; currentGhosts.forEach(g => { allOccurrences.push(typeof g === 'string' ? {date: g, time: task.time} : g); }); allOccurrences.push({date: singleDate, time: time}); allOccurrences.sort((a, b) => (a.date||"").localeCompare(b.date||"") !== 0 ? (a.date||"").localeCompare(b.date||"") : (a.time || "").localeCompare(b.time || "")); let nextMain = allOccurrences.shift(); db.collection("tasks").doc(editingId).update({ date: nextMain.date, time: nextMain.time || "", desc: task.desc || "", duplicateDays: allOccurrences }); editingId = null; showToast("Date planifiée avec succès ! 🗓️"); } } else if(editingId && singleDate) { db.collection("tasks").doc(editingId).update({ name: n, desc: dStr, date: singleDate, time: time, reminders: reminders, importance: imp }); editingId = null; showToast("Tâche modifiée ! ✎"); } else if (singleDate) { db.collection("tasks").add({ name: n, desc: dStr, date: singleDate, time: time, reminders: reminders, importance: imp, completed: false, userId: currentUser.uid, createdAt: Date.now(), duplicateDays: [] }); showToast("Tâche enregistrée ! ✨"); } unlockModalFields(); document.getElementById('task-modal').style.display = 'none'; } }; }
let btnSaveTodo = document.getElementById('save-todo'); if (btnSaveTodo) { btnSaveTodo.onclick = () => { const n = document.getElementById('todo-task-name').value.trim(), t = getCustomTime('todo-time'), isWeekly = document.getElementById('save-todo').getAttribute('data-weekly-mode') === 'true', isRoutine = document.getElementById('save-todo').getAttribute('data-routine-mode') === 'true'; if(n && t && currentUser) { let targetCollection = "dailyTodo"; if (isWeekly) targetCollection = "weeklyTodo"; else if (isRoutine) targetCollection = "routineTodo"; if(editingTodoId) { let updateData = { name: n, time: t }; if(isWeekly || isRoutine) updateData.dayOfWeek = document.getElementById('todo-day-select').value; db.collection(targetCollection).doc(editingTodoId).update(updateData).then(() => { showToast(isRoutine ? "Semaine type modifiée ! ⚙️" : "Activité modifiée ! ✎"); }); editingTodoId = null; } else { if(isRoutine) { db.collection("routineTodo").add({ name: n, time: t, dayOfWeek: document.getElementById('todo-day-select').value, completed: false, isRoutine: true, userId: currentUser.uid }).then(() => { showToast("Ajouté à la semaine type ! ⚙️"); }); } else if(isWeekly) { db.collection("weeklyTodo").add({ name: n, time: t, dayOfWeek: document.getElementById('todo-day-select').value, completed: false, userId: currentUser.uid }).then(() => { showToast("Activité hebdomadaire ajoutée ! 🗓️"); }); } else { db.collection("dailyTodo").add({ name: n, time: t, date: todayStr, completed: false, userId: currentUser.uid }).then(() => { showToast("Activité ajoutée ! ✨"); }); } } document.getElementById('todo-modal').style.display = 'none'; document.getElementById('todo-task-name').value = ''; } }; }
let btnSaveBirthday = document.getElementById('save-birthday'); if (btnSaveBirthday) { btnSaveBirthday.onclick = () => { const n = document.getElementById('birthday-name').value.trim(), d = document.getElementById('birthday-date').value; if (n && d && currentUser) { db.collection("birthdays").add({ name: n, date: d, userId: currentUser.uid, createdAt: Date.now() }).then(() => { showToast("Anniversaire enregistré ! 🎂"); document.getElementById('birthday-modal').style.display = 'none'; }); } }; }

let btnAddTask = document.getElementById('add-task-btn'); if (btnAddTask) { btnAddTask.onclick = () => { editingId = null; unlockModalFields(); if(document.getElementById('task-name')) document.getElementById('task-name').value = ""; if(document.getElementById('task-desc')) document.getElementById('task-desc').value = ""; setCustomTime('task-time', ""); setSelectedRemindersToBadges([]); if(document.getElementById('task-date')) document.getElementById('task-date').value = todayStr; document.getElementById('modal-title').innerText = "Nouvelle Tâche"; document.getElementById('task-modal').style.display = 'flex'; }; }
let btnCloseTaskModal = document.getElementById('close-modal'); if (btnCloseTaskModal) { btnCloseTaskModal.onclick = () => { unlockModalFields(); document.getElementById('task-modal').style.display = 'none'; }; }
let btnCloseTodoModal = document.getElementById('close-todo-modal'); if (btnCloseTodoModal) { btnCloseTodoModal.onclick = () => { document.getElementById('todo-modal').style.display = 'none'; } }

let btnAddFriend = document.getElementById('btn-add-friend');
if(btnAddFriend) { 
    btnAddFriend.onclick = () => { 
        const code = document.getElementById('friend-code-input').value.trim().toUpperCase(); if(!code || code === myAgendaCode) return; 
        db.collection("users").where("shareCode", "==", code).get().then(snapshot => { 
            if(snapshot.empty) { showToast("Code introuvable ! ❌"); return; } 
            let friendDoc = snapshot.docs[0], friendUid = friendDoc.id, friendData = friendDoc.data(); let friendName = friendData.nickname || "Inconnu"; 
            if(friends.some(f => f.uid === friendUid)) { showToast("Déjà lié ! 🤝"); return; } 
            friends.push({uid: friendUid, nickname: friendName}); db.collection("users").doc(currentUser.uid).update({following: friends}); 
            let sharedWith = friendData.sharedWith || []; if(!sharedWith.includes(currentUser.uid)) { sharedWith.push(currentUser.uid); db.collection("users").doc(friendUid).update({sharedWith: sharedWith}); } 
            startFriendSync(friendUid, friendName, 'agenda'); showToast(`Agenda de ${friendName} lié ! ✨`);
            renderFriendsList(); document.getElementById('friend-code-input').value = ""; 
        }); 
    }; 
}

// --- FERMETURE DES FENÊTRES EN CLIQUANT À L'EXTÉRIEUR ---
window.onclick = (e) => { 
    if(e.target.classList && e.target.classList.contains('modal')) { 
        unlockModalFields(); 
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    } 
};

// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').then(reg => { console.log('SW OK'); }).catch(err => { console.log('SW FAIL'); }); }); }
