// ============================================================
// navigation.js — UI Events, Auth boutons, Service Worker
// VERSION CORRIGÉE : doublons supprimés
// ============================================================

// ---- BADGES RAPPELS ----
document.querySelectorAll('.reminder-badge').forEach(badge => {
    badge.onclick = () => {
        if (!badge.classList.contains('disabled-frozen')) {
            badge.classList.toggle('active');
        }
    };
});

// NOTE : getSelectedRemindersFromBadges et setSelectedRemindersToBadges
// sont définies dans config.js — NE PAS les redéclarer ici.

// ---- AUTH BOUTONS ----
let btnLogin = document.getElementById('btn-login');
if (btnLogin) {
    btnLogin.onclick = () => {
        const email = document.getElementById('auth-email').value, pass = document.getElementById('auth-pass').value;
        if (email && pass) auth.signInWithEmailAndPassword(email, pass)
            .then(() => showToast("Ravi de vous revoir ! 👋"))
            .catch(err => showToast("Erreur : " + err.message));
    };
}

let btnRegister = document.getElementById('btn-register');
let _registerMode = false;
if (btnRegister) {
    btnRegister.onclick = () => {
        _registerMode = !_registerMode;
        const rgpdBlock = document.getElementById('rgpd-check-block');
        if (_registerMode) {
            btnRegister.innerText = "Créer mon compte";
            if (rgpdBlock) rgpdBlock.style.display = 'block';
        } else {
            // 2ème clic = création du compte
            const email = document.getElementById('auth-email').value;
            const pass  = document.getElementById('auth-pass').value;
            const rgpd  = document.getElementById('rgpd-checkbox')?.checked;
            if (!rgpd) { showToast("Veuillez accepter la politique de confidentialité ⚠️"); return; }
            if (email && pass) auth.createUserWithEmailAndPassword(email, pass)
                .then(cred => {
                    db.collection("users").doc(cred.user.uid).set({
                        email: email,
                        rgpdAcceptedAt: new Date().toISOString(),
                        createdAt: Date.now()
                    }, { merge: true });
                    showToast("Compte créé avec succès ! 🎉");
                    if (rgpdBlock) rgpdBlock.style.display = 'none';
                    btnRegister.innerText = "Pas de compte ? S'inscrire";
                    _registerMode = false;
                })
                .catch(err => { showToast("Erreur : " + err.message); _registerMode = true; });
        }
    };
}

let btnGoogle = document.getElementById('btn-google');
if (btnGoogle) {
    btnGoogle.onclick = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider)
            .then(() => showToast("Connexion Google réussie ! 🚀"))
            .catch(err => showToast("Erreur Google : " + err.message));
    };
}

let btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.onclick = () => {
        auth.signOut().then(() => showToast("Déconnexion réussie."));
    };
}

// ---- SAUVEGARDE TÂCHE ----
let btnSaveTask = document.getElementById('save-task');
if (btnSaveTask) {
    btnSaveTask.onclick = () => {
        const n = document.getElementById('task-name').value.trim(),
            dStr = document.getElementById('task-desc').value.trim(),
            singleDate = document.getElementById('task-date').value,
            time = getCustomTime('task-time'),
            imp = document.getElementById('task-importance').value,
            reminders = getSelectedRemindersFromBadges();
        if (n && currentUser) {
            if (document.getElementById('modal-title').innerText === "Dupliquer la tâche" && editingId) {
                const task = tasks.find(t => t.id === editingId);
                if (task && singleDate) {
                    let allOccurrences = [{ date: task.date, time: task.time || "" }];
                    let currentGhosts = Array.isArray(task.duplicateDays) ? task.duplicateDays : [];
                    currentGhosts.forEach(g => allOccurrences.push(typeof g === 'string' ? { date: g, time: task.time } : g));
                    allOccurrences.push({ date: singleDate, time: time });
                    allOccurrences.sort((a, b) => (a.date || "").localeCompare(b.date || "") !== 0 ? (a.date || "").localeCompare(b.date || "") : (a.time || "").localeCompare(b.time || ""));
                    let nextMain = allOccurrences.shift();
                    db.collection("tasks").doc(editingId).update({ date: nextMain.date, time: nextMain.time || "", desc: task.desc || "", duplicateDays: allOccurrences });
                    editingId = null;
                    showToast("Date planifiée avec succès ! 🗓️");
                }
            } else if (editingId && singleDate) {
                db.collection("tasks").doc(editingId).update({ name: n, desc: dStr, date: singleDate, time: time, reminders: reminders, importance: imp });
                editingId = null;
                showToast("Tâche modifiée ! ✎");
            } else if (singleDate) {
                db.collection("tasks").add({ name: n, desc: dStr, date: singleDate, time: time, reminders: reminders, importance: imp, completed: false, userId: currentUser.uid, createdAt: Date.now(), duplicateDays: [] });
                showToast("Tâche enregistrée ! ✨");
            }
            unlockModalFields();
            document.getElementById('task-modal').style.display = 'none';
        }
    };
}

// ---- SAUVEGARDE TODO ----
let btnSaveTodo = document.getElementById('save-todo');
if (btnSaveTodo) {
    btnSaveTodo.onclick = () => {
        const n = document.getElementById('todo-task-name').value.trim(),
            t = getCustomTime('todo-time'),
            isWeekly = document.getElementById('save-todo').getAttribute('data-weekly-mode') === 'true',
            isRoutine = document.getElementById('save-todo').getAttribute('data-routine-mode') === 'true';
        if (n && t && currentUser) {
            let targetCollection = "dailyTodo";
            if (isWeekly) targetCollection = "weeklyTodo";
            else if (isRoutine) targetCollection = "routineTodo";
            if (editingTodoId) {
                let updateData = { name: n, time: t };
                if (isWeekly || isRoutine) updateData.dayOfWeek = document.getElementById('todo-day-select').value;
                db.collection(targetCollection).doc(editingTodoId).update(updateData).then(() => {
                    showToast(isRoutine ? "Semaine type modifiée ! ⚙️" : "Activité modifiée ! ✎");
                });
                editingTodoId = null;
            } else {
                if (isRoutine) {
                    db.collection("routineTodo").add({ name: n, time: t, dayOfWeek: document.getElementById('todo-day-select').value, completed: false, isRoutine: true, userId: currentUser.uid }).then(() => showToast("Ajouté à la semaine type ! ⚙️"));
                } else if (isWeekly) {
                    db.collection("weeklyTodo").add({ name: n, time: t, dayOfWeek: document.getElementById('todo-day-select').value, completed: false, userId: currentUser.uid }).then(() => showToast("Activité hebdomadaire ajoutée ! 🗓️"));
                } else {
                    db.collection("dailyTodo").add({ name: n, time: t, date: todayStr, completed: false, userId: currentUser.uid }).then(() => showToast("Activité ajoutée ! ✨"));
                }
            }
            document.getElementById('todo-modal').style.display = 'none';
            document.getElementById('todo-task-name').value = '';
        }
    };
}

// ---- ANNIVERSAIRE ----
let btnSaveBirthday = document.getElementById('save-birthday');
if (btnSaveBirthday) {
    btnSaveBirthday.onclick = () => {
        const n = document.getElementById('birthday-name').value.trim(), d = document.getElementById('birthday-date').value;
        if (n && d && currentUser) {
            db.collection("birthdays").add({ name: n, date: d, userId: currentUser.uid, createdAt: Date.now() }).then(() => {
                showToast("Anniversaire enregistré ! 🎂");
                document.getElementById('birthday-modal').style.display = 'none';
            });
        }
    };
}

// ---- BOUTONS MODALES TÂCHES ----
let btnAddTask = document.getElementById('add-task-btn');
if (btnAddTask) {
    btnAddTask.onclick = () => {
        editingId = null;
        unlockModalFields();
        if (document.getElementById('task-name')) document.getElementById('task-name').value = "";
        if (document.getElementById('task-desc')) document.getElementById('task-desc').value = "";
        setCustomTime('task-time', "");
        setSelectedRemindersToBadges([]);
        if (document.getElementById('task-date')) document.getElementById('task-date').value = todayStr;
        document.getElementById('modal-title').innerText = "Nouvelle Tâche";
        document.getElementById('task-modal').style.display = 'flex';
    };
}

let btnCloseTaskModal = document.getElementById('close-modal');
if (btnCloseTaskModal) {
    btnCloseTaskModal.onclick = () => { unlockModalFields(); document.getElementById('task-modal').style.display = 'none'; };
}

let btnCloseTodoModal = document.getElementById('close-todo-modal');
if (btnCloseTodoModal) {
    btnCloseTodoModal.onclick = () => { document.getElementById('todo-modal').style.display = 'none'; };
}

// ---- LIER UN AMI (modal Agenda) ----
let btnAddFriend = document.getElementById('btn-add-friend');
if (btnAddFriend) {
    btnAddFriend.onclick = () => {
        const code = document.getElementById('friend-code-input').value.trim().toUpperCase();
        if (!code || code === myAgendaCode) return;
        db.collection("users").where("agendaCode", "==", code).get().then(snapshot => {
            if (snapshot.empty) { showToast("Code introuvable ! ❌"); return; }
            let friendDoc = snapshot.docs[0], friendUid = friendDoc.id, friendData = friendDoc.data();
            let friendName = friendData.nickname || "Inconnu";
            if (agendaLinks.some(a => a.uid === friendUid)) { showToast("Agenda déjà lié ! 🤝"); return; }
            agendaLinks.push({ uid: friendUid, nickname: friendName });
            db.collection("users").doc(currentUser.uid).update({ agendaLinks: agendaLinks });
            startFriendSync(friendUid, friendName, 'agenda');
            showToast(`Agenda de ${friendName} lié ! ✨`);
            renderAgendaLinksList();
            document.getElementById('friend-code-input').value = "";
        });
    };
}

// ---- FERMETURE MODALES AU CLIC EXTÉRIEUR ----
window.onclick = (e) => {
    if (e.target.classList && e.target.classList.contains('modal')) {
        unlockModalFields();
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }
};

// ---- SERVICE WORKER ----
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(() => console.log('SW OK'))
            .catch(() => console.log('SW FAIL'));
    });
}

// ---- NAVIGATION ENTRE PAGES ----
function openSidebar() {
    document.getElementById('sidebar').style.left = '0';
    document.getElementById('sidebar-overlay').style.display = 'block';
}
function closeSidebar() {
    document.getElementById('sidebar').style.left = '-280px';
    document.getElementById('sidebar-overlay').style.display = 'none';
}

function showPage(p) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(`${p}-page`);
    if (target) target.style.display = 'block';
    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
    const currentNavBtn = document.getElementById(`nav-btn-${p}`);
    if (currentNavBtn) currentNavBtn.classList.add('active');

    // Bouton raccourci dans la navbar
    const shortcut = document.getElementById('nav-shortcut-btn');
    if (shortcut) {
        if (p === 'tasks') {
            shortcut.style.display = 'block';
            shortcut.textContent = '📅 Calendrier';
            shortcut.onclick = () => showPage('calendar');
        } else if (p === 'calendar') {
            shortcut.style.display = 'block';
            shortcut.textContent = '📋 Tâches';
            shortcut.onclick = () => showPage('tasks');
        } else {
            shortcut.style.display = 'none';
        }
    }

    if (p === 'calendar' && typeof renderCalendar === 'function') renderCalendar();
    if (p === 'todo' && typeof renderTodo === 'function') renderTodo();
    if (p === 'tasks' && typeof renderTasks === 'function') renderTasks();
    if (p === 'shopping') {
        if (typeof renderShoppingCategories === 'function') renderShoppingCategories();
        if (typeof renderShoppingTabs === 'function') renderShoppingTabs();
        if (typeof syncCurrentShoppingItems === 'function') syncCurrentShoppingItems();
    }
    if (p === 'profile' && typeof renderGlobalFriends === 'function') renderGlobalFriends();
    if (p === 'tricount' && typeof initTricount === 'function') initTricount();
    if (p === 'blocnote' && typeof initBlocNote === 'function') initBlocNote();
}

// ---- SWITCH VUE TÂCHES (Actives / Archives) ----
function switchTaskSubView(view) {
    taskSubView = view;
    document.querySelectorAll('.sub-menu-tab').forEach(b => b.classList.remove('active'));
    const actionBar = document.getElementById('tasks-action-bar');
    const archiveSearch = document.getElementById('archive-search-bar');
    if (view === 'active') {
        document.getElementById('sub-btn-active-tasks').classList.add('active');
        if (actionBar) actionBar.style.display = 'flex';
        if (archiveSearch) archiveSearch.style.display = 'none';
    } else {
        document.getElementById('sub-btn-archived-tasks').classList.add('active');
        if (actionBar) actionBar.style.display = 'none';
        if (archiveSearch) archiveSearch.style.display = 'flex';
    }
    if (typeof renderTasks === 'function') renderTasks();
}

// ---- THÈME ----
function changeTheme(t) {
    document.body.className = `theme-${t}`;
    localStorage.setItem('listme_theme', t);
}

// ---- MODALE DE BIENVENUE ----
function triggerWelcomeModal() {
    const now = new Date();
    const hour = now.getHours();
    let greeting = "Bonne nuit";
    if (hour >= 5 && hour < 12) greeting = "Bonjour";
    else if (hour >= 12 && hour < 18) greeting = "Bonne après-midi";
    else if (hour >= 18 && hour < 22) greeting = "Bonne soirée";

    const name = userNickname ? ` ${userNickname}` : "";
    const welcomeText = document.getElementById('welcome-message-text');
    if (welcomeText) welcomeText.innerText = `${greeting}${name} ! 👋`;

    const summaryZone = document.getElementById('today-summary-zone');
    if (summaryZone) {
        const todayTasks = tasks.filter(t => !t.completed && t.date === todayStr);
        const todayBirthdays = birthdays.filter(b => (b.date || "").endsWith(todayStr.substring(5)));
        let html = '';
        if (todayTasks.length > 0) {
            html += `<div class="welcome-summary-item">📋 <strong>${todayTasks.length} tâche(s)</strong> prévue(s) aujourd'hui</div>`;
        } else {
            html += `<div class="welcome-summary-item">✅ Aucune tâche prévue aujourd'hui</div>`;
        }
        todayBirthdays.forEach(b => {
            html += `<div class="welcome-summary-item">🎂 C'est l'anniversaire de <strong>${b.name}</strong> aujourd'hui !</div>`;
        });
        summaryZone.innerHTML = html;
    }

    document.getElementById('welcome-modal').style.display = 'flex';
}
