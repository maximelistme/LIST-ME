// --- CONFIGURATION FIREBASE PROD ---
const firebaseConfig = {
  apiKey: "AIzaSyAVkf6PEZnPWLrS1smnau0J6k3ZE1wGX-4",
  authDomain: "listme-2620d.firebaseapp.com",
  projectId: "listme-2620d",
  storageBucket: "listme-2620d.firebasestorage.app",
  messagingSenderId: "145966801688",
  appId: "1:145966801688:web:34638000fbafaff5bd346d",
  measurementId: "G-ERX6N3R6XK"
};

// Initialisation de Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- VARIABLES D'ÉTAT LOCALES ---
let tasks = [];
let dailyTodo = [];
let weeklyTodo = [];
let currentUser = null; 
let userNickname = ""; 
let hasShownWelcomeThisSession = false; 
let taskSubView = "active"; 
let unsubscribeTasks, unsubscribeDaily, unsubscribeWeekly; 

let currentTheme = localStorage.getItem('listme_theme') || 'pink';
let viewState = 'day'; 
let todoMode = 'daily';
let editingId = null;
let editingTodoId = null; 
let selectedYear = new Date().getFullYear();
let selectedMonth = new Date().getMonth();

const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const dayInitials = ["D", "L", "M", "M", "J", "V", "S"];
const dayNamesFr = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const todayStr = new Date().toISOString().split('T')[0];
const currentDayOfWeek = new Date().getDay();

document.body.className = `theme-${currentTheme}`;

// --- BULLE DE NOTIFICATION TOAST ---
function showToast(message) {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;
    toast.innerText = message;
    toast.className = "toast-show";
    setTimeout(() => { toast.className = "toast-hidden"; }, 3000);
}

function changeTheme(t) { 
    document.body.className = `theme-${t}`; 
    localStorage.setItem('listme_theme', t); 
}

function showPage(p) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(`${p}-page`);
    if (target) target.style.display = 'block';
    
    document.querySelectorAll('.nav-bubble').forEach(btn => btn.classList.remove('active'));
    const currentNavBtn = document.getElementById(`nav-btn-${p}`);
    if (currentNavBtn) currentNavBtn.classList.add('active');
    
    if(p === 'calendar') renderCalendar();
    if(p === 'todo') renderTodo();
    if(p === 'tasks') renderTasks();
}

function switchTaskSubView(view) {
    taskSubView = view;
    document.querySelectorAll('.sub-menu-tab').forEach(b => b.classList.remove('active'));
    const actionBar = document.getElementById('tasks-action-bar');
    if(view === 'active') {
        document.getElementById('sub-btn-active-tasks').classList.add('active');
        if(actionBar) actionBar.style.display = 'flex';
    } else {
        document.getElementById('sub-btn-archived-tasks').classList.add('active');
        if(actionBar) actionBar.style.display = 'none';
    }
    renderTasks();
}

// --- MOTEUR DE VÉRIFICATION EN CONTINU ---
function runNotificationEngine() {
    const now = new Date();
    if(document.getElementById('tasks-page').style.display === 'block') { renderTasks(); }

    const todayString = now.toISOString().split('T')[0];
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay();

    if (dayOfWeek === 0 && hour === 18 && minute === 0) {
        const key = `recap-${todayString}`;
        let heavyNotificationsSent = JSON.parse(localStorage.getItem('listme_sent_notifs')) || {};
        if (!heavyNotificationsSent[key]) {
            const activeTasksCount = tasks.filter(t => !t.completed).length;
            sendNotification("📋 LIST'ME : Récap de ta semaine", activeTasksCount > 0 ? `Tu as ${activeTasksCount} tâches prévues cette semaine.` : "Aucune tâche critique de planifiée.");
            heavyNotificationsSent[key] = true;
            localStorage.setItem('listme_sent_notifs', JSON.stringify(heavyNotificationsSent));
        }
    }

    tasks.forEach(t => {
        if (t.completed || !t.date) return;
        const taskDateObj = new Date(t.date);
        const diffTime = taskDateObj - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1 && hour === 20 && minute === 0) {
            const key = `veille-${t.id}`;
            let heavyNotificationsSent = JSON.parse(localStorage.getItem('listme_sent_notifs')) || {};
            if (!heavyNotificationsSent[key]) {
                sendNotification("⏰ Rappel : C'est pour demain !", `Ne pas oublier : "${t.name}" prévu demain.`);
                heavyNotificationsSent[key] = true;
                localStorage.setItem('listme_sent_notifs', JSON.stringify(heavyNotificationsSent));
            }
        }

        if (t.time && t.reminders && t.reminders.length > 0) {
            const [tHour, tMin] = t.time.split(':').map(Number);
            const taskDateTime = new Date(t.date);
            taskDateTime.setHours(tHour, tMin, 0, 0);
            const minutesRemaining = Math.round((taskDateTime - now) / 60000);

            t.reminders.forEach(reminderMinutes => {
                if (minutesRemaining === Number(reminderMinutes)) {
                    const key = `custom-${t.id}-${reminderMinutes}`;
                    let heavyNotificationsSent = JSON.parse(localStorage.getItem('listme_sent_notifs')) || {};
                    if (!heavyNotificationsSent[key]) {
                        sendNotification(`🔔 Rappel : ${t.name}`, `Commence dans ${reminderMinutes} minutes.`);
                        heavyNotificationsSent[key] = true;
                        localStorage.setItem('listme_sent_notifs', JSON.stringify(heavyNotificationsSent));
                    }
                }
            });
        }
    });
}
let lastCheckedMinute = "";
setInterval(runNotificationEngine, 30000);

function requestNotificationPermission() { if ("Notification" in window) { Notification.requestPermission(); } }
function sendNotification(title, body) { if ("Notification" in window && Notification.permission === "granted") { new Notification(title, { body: body, icon: "https://cdn-icons-png.flaticon.com/512/906/906334.png" }); } }

// --- BADGES DE RAPPEL ---
document.querySelectorAll('.reminder-badge').forEach(badge => { badge.onclick = () => { badge.classList.toggle('active'); }; });
function getSelectedRemindersFromBadges() { let activeReminders = []; document.querySelectorAll('.reminder-badge.active').forEach(badge => { activeReminders.push(badge.getAttribute('data-value')); }); return activeReminders; }
function setSelectedRemindersToBadges(remindersArray) { document.querySelectorAll('.reminder-badge').forEach(badge => { const val = badge.getAttribute('data-value'); if(remindersArray && remindersArray.includes(val)) { badge.classList.add('active'); } else { badge.classList.remove('active'); } }); }

// --- SURVEILLANCE DE L'ÉTAT DE CONNEXION ---
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('main-nav').style.display = 'flex';
        document.getElementById('profile-user-email').innerText = user.email;
        requestNotificationPermission();
        
        db.collection("users").doc(user.uid).get().then((doc) => {
            if (doc.exists && doc.data().nickname) {
                userNickname = doc.data().nickname;
                document.getElementById('profile-nickname').value = userNickname;
            } else {
                userNickname = ""; 
            }
            startRealtimeSync(user.uid); 
            showPage('tasks');
        }).catch(() => { startRealtimeSync(user.uid); showPage('tasks'); });
    } else {
        currentUser = null; userNickname = ""; hasShownWelcomeThisSession = false;
        document.getElementById('main-nav').style.display = 'none';
        stopRealtimeSync();
        document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
        document.getElementById('auth-page').style.display = 'block';
    }
});

document.getElementById('btn-save-nickname').onclick = () => {
    const nick = document.getElementById('profile-nickname').value.trim();
    if (nick && currentUser) {
        db.collection("users").doc(currentUser.uid).set({ nickname: nick }, { merge: true }).then(() => {
            userNickname = nick; 
            showToast("Surnom enregistré avec succès ! ✨");
        });
    }
};

// --- SYNCHRONISATION PRIVÉE FIREBASE ---
function startRealtimeSync(userId) {
    unsubscribeTasks = db.collection("tasks").where("userId", "==", userId)
        .onSnapshot((snapshot) => {
            tasks = []; 
            snapshot.forEach((doc) => { 
                let data = doc.data(); data.id = doc.id; 
                if (!data.createdAt) { data.createdAt = 0; } else if (data.createdAt.seconds) { data.createdAt = data.createdAt.seconds * 1000; }
                tasks.push(data); 
            });
            renderTasks(); 
            if (!hasShownWelcomeThisSession) { triggerWelcomeModal(); hasShownWelcomeThisSession = true; }
            if(viewState === 'day') renderCalendar();
        });
    unsubscribeDaily = db.collection("dailyTodo").where("userId", "==", userId).onSnapshot((snapshot) => { dailyTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; dailyTodo.push(data); }); renderTodo(); });
    unsubscribeWeekly = db.collection("weeklyTodo").where("userId", "==", userId).onSnapshot((snapshot) => { weeklyTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; weeklyTodo.push(data); }); renderTodo(); });
}

function stopRealtimeSync() { if (unsubscribeTasks) unsubscribeTasks(); if (unsubscribeDaily) unsubscribeDaily(); if (unsubscribeWeekly) unsubscribeWeekly(); tasks = []; dailyTodo = []; weeklyTodo = []; }

// --- POP-UP BIENVENUE ---
function triggerWelcomeModal() {
    const wModal = document.getElementById('welcome-modal'); const msgText = document.getElementById('welcome-message-text'); const summaryZone = document.getElementById('today-summary-zone');
    if(!wModal) return;
    let nameToDisplay = userNickname ? userNickname : "toi"; msgText.innerText = `Welcome back, ${nameToDisplay} ! 👋`;
    let todayTasks = tasks.filter(t => t.date === todayStr && !t.completed); summaryZone.innerHTML = '';
    if(todayTasks.length === 0) { summaryZone.innerHTML = `<p style="font-size: 0.95rem; font-style: italic; opacity: 0.8; margin-top: 10px; text-align:center;">Aucune tâche urgente au programme pour aujourd'hui ! ✨</p>`; } 
    else {
        summaryZone.innerHTML = `<p style="font-size: 0.95rem; font-weight: bold; margin-bottom: 12px; color: var(--primary-dark);">Voici tes tâches de la journée :</p>`;
        todayTasks.forEach(t => { summaryZone.innerHTML += `<div class="welcome-summary-item">📌 <b>${t.time ? t.time : 'Pas d\'heure'}</b> - ${t.name} <span style="float: right; font-size: 0.75rem; font-weight: bold; padding: 2px 6px; border-radius: 8px; background: rgba(128,128,128,0.1); color: var(--${t.importance === 'high'?'danger':t.importance==='medium'?'warning':'success'});">${t.importance === 'high' ? 'Haute' : t.importance === 'medium' ? 'Moyenne' : 'Faible'}</span></div>`; });
    }
    wModal.style.display = 'flex';
}

// --- ONGLET : MES TÂCHES ---
function renderTasks() {
    const c = document.getElementById('task-list'); if (!c) return; c.innerHTML = '';
    const now = new Date();
    
    let activeList = []; let archiveList = [];
    tasks.forEach(t => {
        if(t.completed) {
            if(t.completedAtStr && t.completedAtStr !== todayStr) { archiveList.push(t); } else { activeList.push(t); }
        } else { activeList.push(t); }
    });

    let filteredList = (taskSubView === "active") ? activeList : archiveList;

    if (taskSubView === "active") {
        const sortMode = document.getElementById('task-sort-filter').value;
        let imminentTasks = []; let standardTasks = []; let completedTodayTasks = [];

        filteredList.forEach(t => {
            if(t.completed) { completedTodayTasks.push(t); return; }
            if(t.date === todayStr && t.time) {
                const [tHour, tMin] = t.time.split(':').map(Number);
                const taskTimeObj = new Date(); taskTimeObj.setHours(tHour, tMin, 0, 0);
                const remainingMinutes = (taskTimeObj - now) / 60000;
                if(remainingMinutes > 0 && remainingMinutes <= 60) {
                    t.isImminent = true; t.minutesLeft = Math.round(remainingMinutes); imminentTasks.push(t); return;
                }
            }
            t.isImminent = false; standardTasks.push(t);
        });

        const chronoSort = (a, b) => { if (a.date !== b.date) return a.date.localeCompare(b.date); if (!a.time) return -1; if (!b.time) return 1; return a.time.localeCompare(b.time); };
        const creationSort = (a, b) => b.createdAt - a.createdAt;

        if (sortMode === 'chrono') { standardTasks.sort(chronoSort); completedTodayTasks.sort(chronoSort); } 
        else { standardTasks.sort(creationSort); completedTodayTasks.sort(creationSort); }
        imminentTasks.sort((a,b) => a.minutesLeft - b.minutesLeft);
        filteredList = [...imminentTasks, ...standardTasks, ...completedTodayTasks];
    } else {
        filteredList.sort((a,b) => b.createdAt - a.createdAt);
    }

    if(filteredList.length === 0) {
        c.innerHTML = `<p style="text-align:center; opacity:0.4; font-style:italic; margin-top:30px;">${taskSubView==='active'?'Aucune tâche active !':'Vos archives sont vides'}</p>`; return;
    }

    filteredList.forEach(t => {
        const d = document.createElement('div'); d.className = `task-card ${t.importance} ${t.completed ? 'completed' : ''} ${t.isImminent ? 'is-imminent' : ''}`;
        let remindersText = "Aucun"; if(t.reminders && t.reminders.length > 0) { remindersText = t.reminders.map(r => `${r} min avant`).join(', '); }
        d.innerHTML = `
            <div style="flex:1" onclick="toggleTaskCheck('${t.id}', ${t.completed})">
                <strong style="${t.completed ? 'text-decoration:line-through; opacity:0.5;' : ''}">${t.name}</strong><br>
                <small>📅 ${t.date} ${t.time ? '⏰ ' + t.time : ''}</small>
                ${t.isImminent ? `<br><small class="time-alert">⚠️ ÉCHÉANCE PROCHE : Reste ${t.minutesLeft} min !</small>` : `<br><small style="color:var(--primary-dark);">🔔 Rappels : ${remindersText}</small>`}
            </div>
            <div class="task-actions">
                ${taskSubView === 'active' ? `<button onclick="editTask('${t.id}')" style="background:none; border:none; color:var(--primary); font-size:1.3rem; cursor:pointer;">✎</button>` : ''}
                <button onclick="deleteTask('${t.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>
            </div>`;
        c.appendChild(d);
    });
}

function toggleTaskCheck(id, currentStatus) { 
    let updateData = { completed: !currentStatus };
    if(!currentStatus) { updateData.completedAtStr = todayStr; } else { updateData.completedAtStr = firebase.firestore.FieldValue.delete(); }
    db.collection("tasks").doc(id).update(updateData); 
}

function deleteTask(id) { db.collection("tasks").doc(id).delete().then(() => { showToast("Tâche supprimée ! 🗑️"); }); }

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if(task) {
        editingId = id;
        document.getElementById('task-name').value = task.name; document.getElementById('task-date').value = task.date; document.getElementById('task-time').value = task.time || "";
        setSelectedRemindersToBadges(task.reminders || []); document.getElementById('task-importance').value = task.importance;
        document.getElementById('modal-title').innerText = "Modifier la tâche"; document.getElementById('task-modal').style.display = 'flex';
    }
}

document.getElementById('save-task').onclick = () => {
    const n = document.getElementById('task-name').value; const d = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value; const imp = document.getElementById('task-importance').value;
    const reminders = getSelectedRemindersFromBadges(); 
    if(n && d && currentUser) {
        let taskData = { name: n, date: d, time: time, reminders: reminders, importance: imp };
        if(editingId) { db.collection("tasks").doc(editingId).update(taskData); editingId = null; showToast("Tâche modifiée ! ✎"); } 
        else { taskData.completed = false; taskData.userId = currentUser.uid; taskData.createdAt = Date.now(); db.collection("tasks").add(taskData); showToast("Tâche ajoutée ! ✨"); }
        document.getElementById('task-modal').style.display = 'none';
    }
};

// --- AUTHENTIFICATION BOUTONS ---
document.getElementById('btn-login').onclick = () => {
    const email = document.getElementById('auth-email').value; const pass = document.getElementById('auth-pass').value;
    if(email && pass) auth.signInWithEmailAndPassword(email, pass).then(() => { showToast("Ravi de vous revoir ! 👋"); }).catch(err => showToast("Erreur : " + err.message));
};
document.getElementById('btn-register').onclick = () => {
    const email = document.getElementById('auth-email').value; const pass = document.getElementById('auth-pass').value;
    if(email && pass) auth.createUserWithEmailAndPassword(email, pass).then(() => showToast("Compte créé avec succès ! 🎉")).catch(err => showToast("Erreur : " + err.message));
};
document.getElementById('btn-google').onclick = () => { const provider = new firebase.auth.GoogleAuthProvider(); auth.signInWithPopup(provider).then(() => { showToast("Connexion Google réussie ! 🚀"); }).catch((err) => { showToast("Erreur Google : " + err.message); }); };
document.getElementById('btn-logout').onclick = () => { auth.signOut().then(() => { showToast("Déconnexion réussie."); }); };

// --- ONGLET : CALENDRIER ---
function setViewState(s) { viewState = s; renderCalendar(); }
function renderCalendar() {
    const c = document.getElementById('calendar-content'); const t = document.getElementById('calendar-title'); c.innerHTML = '';
    if (!c) return;
    document.querySelectorAll('#calendar-page .bubble').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${viewState}`).classList.add('active');

    if (viewState === 'year') {
        c.className = 'grid-years'; t.innerText = "Années";
        for (let i = selectedYear - 4; i <= selectedYear + 4; i++) {
            const d = document.createElement('div'); d.className = `grid-item ${i === selectedYear ? 'selected' : ''}`; d.innerText = i; d.onclick = () => { selectedYear = i; setViewState('month'); }; c.appendChild(d);
        }
    } else if (viewState === 'month') {
        c.className = 'grid-months'; t.innerText = selectedYear;
        monthNames.forEach((n, i) => {
            const d = document.createElement('div'); d.className = `grid-item ${i === selectedMonth ? 'selected' : ''}`; d.innerText = n; d.onclick = () => { selectedMonth = i; setViewState('day'); }; c.appendChild(d);
        });
    } else {
        c.className = 'calendar-grid'; t.innerText = `${monthNames[selectedMonth]} ${selectedYear}`;
        const days = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        for (let i = 1; i <= days; i++) {
            const ds = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const div = document.createElement('div'); div.className = 'day-card';
            if(ds === todayStr) div.classList.add('is-today');

            const dt = tasks.filter(tk => tk.date === ds);
            if(dt.length > 0) {
                const imps = dt.map(tk => tk.importance);
                if(imps.includes('high')) div.classList.add('has-high'); else if(imps.includes('medium')) div.classList.add('has-medium'); else div.classList.add('has-low');
            }
            div.onclick = () => openCalendarDayModal(i, monthNames[selectedMonth], selectedYear, dt);
            div.innerHTML = `<span style="font-size:0.6rem; opacity:0.5; display:block;">${dayInitials[new Date(selectedYear, selectedMonth, i).getDay()]}</span><b>${i}</b>`;
            c.appendChild(div);
        }
    }
}

function openCalendarDayModal(day, monthName, year, dayTasks) {
    document.getElementById('cal-modal-date-title').innerText = `${day} ${monthName} ${year}`;
    const container = document.getElementById('cal-modal-tasks-container'); container.innerHTML = '';
    if(dayTasks.length === 0) { container.innerHTML = '<p style="text-align:center; opacity:0.5; font-style:italic;">Aucune tâche</p>'; } 
    else {
        dayTasks.forEach(t => { container.innerHTML += `
            <div style="padding: 12px; border-radius: 12px; border-left: 6px solid var(--${t.importance === 'high'?'danger':t.importance==='medium'?'warning':'success'}); background: rgba(128,128,128,0.05); text-align:left;"><strong style="${t.completed ? 'text-decoration:line-through; opacity:0.5;' : ''}">${t.name}</strong>${t.time ? `<span style="float:right; font-size:0.85rem; opacity:0.7;">⏰ ${t.time}</span>`:''}</div>`; 
        });
    }
    document.getElementById('calendar-day-modal').style.display = 'flex';
}

// --- ONGLET : TO-DO LIST ---
function setTodoMode(m) { todoMode = m; renderTodo(); }
function renderTodo() {
    const c = document.getElementById('todo-content'); if (!c) return;
    document.querySelectorAll('#todo-page .bubble').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${todoMode}`).classList.add('active');
    
    if(todoMode === 'daily') {
        document.getElementById('todo-today-date').innerText = new Date().toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'});
        c.innerHTML = '<div class="weekly-container"></div>'; const wc = c.querySelector('.weekly-container');
        
        for (let h = 8; h <= 20; h++) {
            const currentHourStr = `${h.toString().padStart(2, '0')}:00`;
            let items = dailyTodo.filter(it => it.date === todayStr && parseInt(it.time.split(':')[0]) === h);
            let weeklyItems = weeklyTodo.filter(it => parseInt(it.dayOfWeek) === currentDayOfWeek && parseInt(it.time.split(':')[0]) === h);
            let combinedItems = [...items, ...weeklyItems]; combinedItems.sort((a,b) => a.time.localeCompare(b.time));

            const hourCard = document.createElement('div'); hourCard.className = 'weekly-day-card';
            hourCard.innerHTML = `
                <div class="weekly-day-header">
                    <span class="weekly-day-title">${currentHourStr}</span>
                    <button onclick="openTodoModal('${h.toString().padStart(2,'0')}:00', false)" style="background:var(--primary); border:none; color:white; border-radius:50%; width:25px; height:25px; font-weight:bold; cursor:pointer;">+</button>
                </div>
                <div class="weekly-subtasks">
                    ${combinedItems.map(it => {
                        const isWeekly = it.hasOwnProperty('dayOfWeek'); const checkFunc = isWeekly ? `toggleWeeklyTodo('${it.id}', ${it.completed})` : `toggleTodo('${it.id}', ${it.completed})`; const delFunc = isWeekly ? `deleteWeeklyTodo('${it.id}')` : `deleteDailyTodo('${it.id}')`;
                        return `
                            <div class="weekly-item">
                                <span onclick="event.stopPropagation(); ${checkFunc}" style="cursor:pointer;" class="${it.completed ? 'todo-completed' : ''}">
                                    <b>${it.time}</b> : ${it.name} ${isWeekly ? '<small style="opacity:0.5;">(Hebdo)</small>':''}
                                </span>
                                <div>
                                    <button onclick="editTodoItem('${it.id}', '${it.name}', '${it.time}', ${isWeekly}, ${isWeekly ? it.dayOfWeek : 0})" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-right:5px;">✎</button>
                                    <button onclick="${delFunc}" style="background:none; border:none; color:var(--danger); cursor:pointer;">×</button>
                                </div>
                            </div>`;
                    }).join('') || '<span style="opacity:0.3; font-style:italic; font-size:0.85rem;">Aucun événement</span>'}
                </div>`;
            wc.appendChild(hourCard);
        }
    } else {
        document.getElementById('todo-today-date').innerText = "Planification Hebdomadaire";
        c.innerHTML = '<div class="weekly-container"></div>'; const wc = c.querySelector('.weekly-container');
        const weeklyOrder = [1, 2, 3, 4, 5, 6, 0];
        
        weeklyOrder.forEach(dayNum => {
            const dayTasks = weeklyTodo.filter(it => parseInt(it.dayOfWeek) === dayNum); dayTasks.sort((a,b) => a.time.localeCompare(b.time));
            const dayCard = document.createElement('div'); dayCard.className = 'weekly-day-card';
            dayCard.innerHTML = `
                <div class="weekly-day-header">
                    <span class="weekly-day-title">${dayNamesFr[dayNum]}</span>
                    <button onclick="openTodoModal('12:00', true, ${dayNum})" style="background:var(--primary); border:none; color:white; border-radius:50%; width:25px; height:25px; font-weight:bold; cursor:pointer;">+</button>
                </div>
                <div class="weekly-subtasks">
                    ${dayTasks.map(it => `
                        <div class="weekly-item">
                            <span onclick="toggleWeeklyTodo('${it.id}', ${it.completed})" style="cursor:pointer;" class="${it.completed ? 'todo-completed' : ''}">
                                <b>${it.time}</b> : ${it.name}
                            </span>
                            <div>
                                <button onclick="editTodoItem('${it.id}', '${it.name}', '${it.time}', true, ${dayNum})" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-right:5px;">✎</button>
                                <button onclick="deleteWeeklyTodo('${it.id}')" style="background:none; border:none; color:var(--danger); cursor:pointer;">×</button>
                            </div>
                        </div>`).join('') || '<span style="opacity:0.3; font-style:italic; font-size:0.85rem;">Aucune activité planifiée</span>'}
                </div>`;
            wc.appendChild(dayCard);
        });
    }
}

function openTodoModal(time, isWeekly, dayNum = 1) { editingTodoId = null; document.getElementById('todo-time').value = time; document.getElementById('todo-task-name').value = ''; document.getElementById('todo-modal-title').innerText = "Ajouter à la To-Do List"; if(isWeekly) { document.getElementById('todo-day-select').value = dayNum; } document.getElementById('save-todo').setAttribute('data-weekly-mode', isWeekly); document.getElementById('todo-modal').style.display = 'flex'; }
function editTodoItem(id, name, time, isWeekly, dayNum = 1) { editingTodoId = id; document.getElementById('todo-time').value = time; document.getElementById('todo-task-name').value = name; document.getElementById('todo-modal-title').innerText = "Modifier la To-Do List"; if(isWeekly) document.getElementById('todo-day-select').value = dayNum; document.getElementById('save-todo').setAttribute('data-weekly-mode', isWeekly); document.getElementById('todo-modal').style.display = 'flex'; }

function toggleTodo(id, currentStatus) { db.collection("dailyTodo").doc(id).update({ completed: !currentStatus }); }
function toggleWeeklyTodo(id, currentStatus) { db.collection("weeklyTodo").doc(id).update({ completed: !currentStatus }); }
function deleteWeeklyTodo(id) { db.collection("weeklyTodo").doc(id).delete(); }
function deleteDailyTodo(id) { db.collection("dailyTodo").doc(id).delete(); }

// --- ACTION ENREGISTRER DANS LA TO-DO LIST (CORRIGÉE CHIRURGICALEMENT) ---
document.getElementById('save-todo').onclick = () => {
    const n = document.getElementById('todo-task-name').value.trim(); 
    const t = document.getElementById('todo-time').value;
    const isWeekly = document.getElementById('save-todo').getAttribute('data-weekly-mode') === 'true';
    
    if(n && t && currentUser) { 
        if(editingTodoId) {
            let collection = isWeekly ? "weeklyTodo" : "dailyTodo"; 
            let updateData = { name: n, time: t };
            if(isWeekly) updateData.dayOfWeek = document.getElementById('todo-day-select').value;
            db.collection(collection).doc(editingTodoId).update(updateData).then(() => {
                showToast("Activité modifiée ! ✎");
            });
            editingTodoId = null;
        } else {
            if(isWeekly) { 
                db.collection("weeklyTodo").add({ name: n, time: t, dayOfWeek: document.getElementById('todo-day-select').value, completed: false, userId: currentUser.uid }).then(() => {
                    showToast("Activité hebdomadaire ajoutée ! 🗓️");
                }); 
            } else { 
                db.collection("dailyTodo").add({ name: n, time: t, date: todayStr, completed: false, userId: currentUser.uid }).then(() => {
                    showToast("Activité ajoutée ! ✨");
                }); 
            }
        }
        document.getElementById('todo-modal').style.display = 'none'; 
        document.getElementById('todo-task-name').value = '';
    }
};

// --- INITIALISATION GENERALE ---
document.getElementById('add-task-btn').onclick = () => { editingId = null; document.getElementById('task-name').value = ""; document.getElementById('task-time').value = ""; setSelectedRemindersToBadges([]); document.getElementById('task-date').value = todayStr; document.getElementById('modal-title').innerText = "Nouvelle Tâche"; document.getElementById('task-modal').style.display = 'flex'; };
document.getElementById('close-modal').onclick = () => document.getElementById('task-modal').style.display = 'none';
document.getElementById('close-todo-modal').onclick = () => document.getElementById('todo-modal').style.display = 'none';

window.onclick = (e) => { if(e.target.className.includes('modal')) { document.getElementById('task-modal').style.display = 'none'; document.getElementById('todo-modal').style.display = 'none'; document.getElementById('calendar-day-modal').style.display = 'none'; document.getElementById('welcome-modal').style.display = 'none'; } };
