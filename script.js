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
let routineTodo = [];
let currentUser = null; 
let userNickname = ""; 
let hasShownWelcomeThisSession = false; 
let taskSubView = "active"; 
let unsubscribeTasks, unsubscribeDaily, unsubscribeWeekly, unsubscribeRoutine; 

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

let todayStr = new Date().toISOString().split('T')[0];
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

// --- UTILITAIRE DE RÉACTIVATION ET NETTOYAGE DES CHAMPS SÉCURISÉ ---
function unlockModalFields() {
    const nameField = document.getElementById('task-name');
    const descField = document.getElementById('task-desc');
    const impField = document.getElementById('task-importance');
    const timeField = document.getElementById('task-time');
    const labelField = document.getElementById('date-input-label');

    if(nameField) nameField.disabled = false;
    if(descField) descField.disabled = false;
    if(impField) impField.disabled = false;
    if(timeField) timeField.disabled = false;
    if(labelField) labelField.innerText = "Date";
    
    const badges = document.querySelectorAll('.reminder-badge');
    badges.forEach(b => {
        b.style.pointerEvents = 'auto';
        b.classList.remove('disabled-frozen');
    });
    
    const duplicateTags = document.getElementById('duplicate-dates-tags');
    if(duplicateTags) duplicateTags.innerHTML = "";
}

// --- ONGLET : NAVIGATION PRINCIPALE ---
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
    const archiveSearch = document.getElementById('archive-search-bar');
    
    if(view === 'active') {
        document.getElementById('sub-btn-active-tasks').classList.add('active');
        if(actionBar) actionBar.style.display = 'flex';
        if(archiveSearch) archiveSearch.style.display = 'none';
    } else {
        document.getElementById('sub-btn-archived-tasks').classList.add('active');
        if(actionBar) actionBar.style.display = 'none';
        if(archiveSearch) archiveSearch.style.display = 'flex';
    }
    renderTasks();
}

// --- GESTIONNAIRE D'ARCHIVAGE AUTOMATIQUE SÉCURISÉ ---
let isArchiving = false;
function processMidnightAutoArchive() {
    if(isArchiving || !currentUser) return;
    isArchiving = true;
    
    const today = new Date().toISOString().split('T')[0];
    let operations = [];
    
    tasks.forEach(t => {
        if (t.completed) return; 
        
        let ghosts = Array.isArray(t.duplicateDays) ? t.duplicateDays : [];
        ghosts = ghosts.map(g => typeof g === 'string' ? {date: g, time: t.time} : g); 
        
        if (ghosts.length > 0) {
            let allOccurrences = [{date: t.date, time: t.time || ""}, ...ghosts];
            allOccurrences.sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return (a.time || "").localeCompare(b.time || "");
            });
            
            let pastDates = allOccurrences.filter(o => o.date < today);
            let remainingDates = allOccurrences.filter(o => o.date >= today);
            
            if (pastDates.length > 0) {
                pastDates.forEach(pastOcc => {
                    operations.push(
                        db.collection("tasks").add({
                            name: t.name, desc: t.desc || "", date: pastOcc.date, time: pastOcc.time, reminders: t.reminders || [],
                            importance: t.importance, completed: true, completedAtStr: pastOcc.date, 
                            userId: t.userId, createdAt: t.createdAt || Date.now(), duplicateDays: []
                        })
                    );
                });
                
                if (remainingDates.length > 0) {
                    let nextMain = remainingDates.shift();
                    operations.push(
                        db.collection("tasks").doc(t.id).update({ date: nextMain.date, time: nextMain.time, duplicateDays: remainingDates })
                    );
                } else {
                    operations.push(db.collection("tasks").doc(t.id).delete());
                }
            }
        } else {
            if (t.date < today) {
                operations.push(
                    db.collection("tasks").doc(t.id).update({ completed: true, completedAtStr: t.date })
                );
            }
        }
    });
    
    Promise.all(operations).then(() => { isArchiving = false; }).catch(() => { isArchiving = false; });
}

// --- MOTEUR DE VÉRIFICATION EN CONTINU (+ CLÔTURE AUTO À 30 MIN) ---
let lastCheckedDayStr = new Date().toISOString().split('T')[0];

function runNotificationEngine() {
    const now = new Date();
    todayStr = now.toISOString().split('T')[0];

    // Vérif minuit
    if (todayStr !== lastCheckedDayStr) {
        lastCheckedDayStr = todayStr;
        processMidnightAutoArchive();
    }

    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay();

    if (dayOfWeek === 0 && hour === 18 && minute === 0) {
        const key = `recap-${todayStr}`;
        let heavyNotificationsSent = JSON.parse(localStorage.getItem('listme_sent_notifs')) || {};
        if (!heavyNotificationsSent[key]) {
            const activeTasksCount = tasks.filter(t => !t.completed).length;
            sendNotification("📋 LIST'ME : Récap de ta semaine", activeTasksCount > 0 ? `Tu as ${activeTasksCount} tâches prévues cette semaine.` : "Aucune tâche critique de planifiée.");
            heavyNotificationsSent[key] = true;
            localStorage.setItem('listme_sent_notifs', JSON.stringify(heavyNotificationsSent));
        }
    }

    tasks.forEach(t => {
        if (t.completed) return;

        let displayDate = t.date;
        let displayTime = t.time;

        if (t.duplicateDays && t.duplicateDays.length > 0) {
            let allOcc = [{date: t.date, time: t.time || ""}];
            t.duplicateDays.forEach(g => {
                if (typeof g === 'string') allOcc.push({date: g, time: t.time || ""});
                else allOcc.push(g);
            });
            allOcc.sort((a,b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time));
            let futureOcc = allOcc.filter(o => o.date >= todayStr);
            let currentOcc = futureOcc.length > 0 ? futureOcc[0] : allOcc[allOcc.length - 1];
            displayDate = currentOcc.date;
            displayTime = currentOcc.time;
        }

        // --- NOUVEAU : Auto-Clôture +30 minutes ---
        if (displayDate === todayStr && displayTime) {
            const [tHour, tMin] = displayTime.split(':').map(Number);
            const taskTimeObj = new Date();
            taskTimeObj.setHours(tHour, tMin, 0, 0);
            
            const diffMinutes = (now - taskTimeObj) / 60000;
            
            if (diffMinutes >= 30) {
                toggleTaskCheck(t.id, false, displayDate);
                return; 
            }
        }

        const taskDateObj = new Date(displayDate);
        const diffTime = taskDateObj - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1 && hour === 20 && minute === 0) {
            const key = `veille-${t.id}-${displayDate}`;
            let heavyNotificationsSent = JSON.parse(localStorage.getItem('listme_sent_notifs')) || {};
            if (!heavyNotificationsSent[key]) {
                sendNotification("⏰ Rappel : C'est pour demain !", `Ne pas oublier : "${t.name}" prévu demain.`);
                heavyNotificationsSent[key] = true;
                localStorage.setItem('listme_sent_notifs', JSON.stringify(heavyNotificationsSent));
            }
        }

        if (displayTime && t.reminders && t.reminders.length > 0) {
            const [tHour, tMin] = displayTime.split(':').map(Number);
            const taskDateTime = new Date(displayDate);
            taskDateTime.setHours(tHour, tMin, 0, 0);
            const minutesRemaining = Math.round((taskDateTime - now) / 60000);

            t.reminders.forEach(reminderMinutes => {
                if (minutesRemaining === Number(reminderMinutes)) {
                    const key = `custom-${t.id}-${displayDate}-${reminderMinutes}`;
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

    if(document.getElementById('tasks-page').style.display === 'block') { renderTasks(); }
}
setInterval(runNotificationEngine, 30000);

function requestNotificationPermission() { if ("Notification" in window) { Notification.requestPermission(); } }

function sendNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, { body: body, icon: "https://cdn-icons-png.flaticon.com/512/906/906334.png" });
            });
        } else {
            new Notification(title, { body: body, icon: "https://cdn-icons-png.flaticon.com/512/906/906334.png" });
        }
    }
}

// --- BADGES DE RAPPEL ---
document.querySelectorAll('.reminder-badge').forEach(badge => { badge.onclick = () => { if(!badge.classList.contains('disabled-frozen')) { badge.classList.toggle('active'); } }; });
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
            } else { userNickname = ""; }
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
let initialSyncDone = false;

function startRealtimeSync(userId) {
    initialSyncDone = false; 
    
    unsubscribeTasks = db.collection("tasks").where("userId", "==", userId)
        .onSnapshot((snapshot) => {
            tasks = []; 
            snapshot.forEach((doc) => { 
                let data = doc.data(); data.id = doc.id; 
                if (!data.createdAt) { data.createdAt = 0; } else if (data.createdAt.seconds) { data.createdAt = data.createdAt.seconds * 1000; }
                tasks.push(data); 
            });

            if (!initialSyncDone && tasks.length > 0) {
                initialSyncDone = true;
                setTimeout(processMidnightAutoArchive, 1500); 
            }

            renderTasks(); 
            if (!hasShownWelcomeThisSession) { triggerWelcomeModal(); hasShownWelcomeThisSession = true; }
            if(viewState === 'day') renderCalendar();
        });
        
    unsubscribeDaily = db.collection("dailyTodo").where("userId", "==", userId).onSnapshot((snapshot) => { dailyTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; dailyTodo.push(data); }); renderTodo(); });
    unsubscribeWeekly = db.collection("weeklyTodo").where("userId", "==", userId).onSnapshot((snapshot) => { weeklyTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; weeklyTodo.push(data); }); renderTodo(); });
    unsubscribeRoutine = db.collection("routineTodo").where("userId", "==", userId).onSnapshot((snapshot) => { routineTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; routineTodo.push(data); }); renderTodo(); });
}

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

function stopRealtimeSync() { 
    if (unsubscribeTasks) unsubscribeTasks(); 
    if (unsubscribeDaily) unsubscribeDaily(); 
    if (unsubscribeWeekly) unsubscribeWeekly(); 
    if (unsubscribeRoutine) unsubscribeRoutine(); 
    tasks = []; dailyTodo = []; weeklyTodo = []; routineTodo = []; 
}

// --- MINI-MODAL GHOST ---
function openGhostModal(id) {
    const task = tasks.find(t => t.id === id);
    if(!task || !task.duplicateDays) return;
    
    let modal = document.getElementById('ghost-modal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'ghost-modal';
        modal.className = 'modal modal-center';
        modal.style.zIndex = "10005"; 
        modal.innerHTML = `
            <div class="modal-content content-center" style="max-height: 75vh; overflow-y: auto; padding: 20px;">
                <h3 style="color: var(--primary); text-align: center; margin-bottom: 15px;">🗓️ Dates Prévues</h3>
                <div id="ghost-modal-list" style="display: flex; flex-direction: column; gap: 10px;"></div>
                <button onclick="document.getElementById('ghost-modal').style.display='none'" class="btn-secondary" style="margin-top: 15px; width: 100%;">Fermer</button>
            </div>`;
        document.body.appendChild(modal);
    }
    
    const list = document.getElementById('ghost-modal-list');
    list.innerHTML = "";
    
    let ghosts = task.duplicateDays.map(g => typeof g === 'string' ? {date: g, time: task.time} : g);
    ghosts.sort((a,b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || "").localeCompare(b.time || "");
    });
    
    ghosts.forEach((g, index) => {
        const dFr = g.date.split('-').reverse().join('/');
        list.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(128,128,128,0.08); border-radius:12px;">
                <span style="font-size: 0.95rem;">📅 <b>${dFr}</b> ${g.time ? `<span style="opacity:0.6; margin:0 5px;">|</span> ⏰ <b>${g.time}</b>` : ''}</span>
                <button onclick="removeGhostDate('${task.id}', ${index})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.5rem; display:flex; align-items:center; line-height:1; padding:0 5px;">×</button>
            </div>`;
    });
    
    modal.style.display = 'flex';
}

function removeGhostDate(taskId, ghostIndex) {
    const task = tasks.find(t => t.id === taskId);
    if(task && task.duplicateDays) {
        let ghosts = task.duplicateDays.map(g => typeof g === 'string' ? {date: g, time: task.time} : g);
        ghosts.splice(ghostIndex, 1);
        db.collection("tasks").doc(taskId).update({ duplicateDays: ghosts }).then(() => {
            showToast("Date supprimée ! 🗑️");
            openGhostModal(taskId);
            if(ghosts.length === 0) document.getElementById('ghost-modal').style.display='none';
        });
    }
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

    if (taskSubView === "archive") {
        const archiveSort = document.getElementById('archive-sort-filter').value;
        filteredList.sort((a,b) => {
            const dateA = a.completedAtStr || a.date;
            const dateB = b.completedAtStr || b.date;
            if (archiveSort === 'desc') {
                if (dateA !== dateB) return dateB.localeCompare(dateA);
                return b.createdAt - a.createdAt;
            } else {
                if (dateA !== dateB) return dateA.localeCompare(dateB);
                return a.createdAt - b.createdAt;
            }
        });
    }

    if (taskSubView === "active") {
        const sortMode = document.getElementById('task-sort-filter').value;
        let imminentTasks = []; let standardTasks = []; let completedTodayTasks = [];

        filteredList.forEach(t => {
            t.currentDisplayDate = t.date;
            t.currentDisplayTime = t.time;
            
            if (!t.completed && t.duplicateDays && t.duplicateDays.length > 0) {
                let allOcc = [{date: t.date, time: t.time || ""}];
                t.duplicateDays.forEach(g => {
                    if (typeof g === 'string') allOcc.push({date: g, time: t.time || ""});
                    else allOcc.push(g);
                });
                allOcc.sort((a,b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time));
                let futureOcc = allOcc.filter(o => o.date >= todayStr);
                let currentOcc = futureOcc.length > 0 ? futureOcc[0] : allOcc[allOcc.length - 1];
                
                t.currentDisplayDate = currentOcc.date;
                t.currentDisplayTime = currentOcc.time;
            }

            if(t.completed) { completedTodayTasks.push(t); return; }
            
            if(t.currentDisplayDate === todayStr && t.currentDisplayTime) {
                const [tHour, tMin] = t.currentDisplayTime.split(':').map(Number);
                const taskTimeObj = new Date(); taskTimeObj.setHours(tHour, tMin, 0, 0);
                const remainingMinutes = (taskTimeObj - now) / 60000;
                if(remainingMinutes > 0 && remainingMinutes <= 60) {
                    t.isImminent = true; t.minutesLeft = Math.round(remainingMinutes); imminentTasks.push(t); return;
                }
            }
            t.isImminent = false; standardTasks.push(t);
        });

        const chronoSort = (a, b) => { 
            let dateA = a.currentDisplayDate || a.date;
            let dateB = b.currentDisplayDate || b.date;
            if (dateA !== dateB) return dateA.localeCompare(dateB); 
            
            let timeA = a.currentDisplayTime || "";
            let timeB = b.currentDisplayTime || "";
            if (!timeA) return -1; if (!timeB) return 1; 
            return timeA.localeCompare(timeB); 
        };
        const creationSort = (a, b) => b.createdAt - a.createdAt;

        if (sortMode === 'chrono') { standardTasks.sort(chronoSort); completedTodayTasks.sort(chronoSort); } 
        else { standardTasks.sort(creationSort); completedTodayTasks.sort(creationSort); }
        imminentTasks.sort((a,b) => a.minutesLeft - b.minutesLeft);
        filteredList = [...imminentTasks, ...standardTasks, ...completedTodayTasks];
    }

    if(filteredList.length === 0) {
        c.innerHTML = `<p style="text-align:center; opacity:0.4; font-style:italic; margin-top:30px;">${taskSubView==='active'?'Aucune tâche active !':'Aucune archive ne correspond'}</p>`; return;
    }

    let separatorDrawn = false;

    filteredList.forEach(t => {
        if (t.completed && taskSubView === "active" && !separatorDrawn) {
            const separator = document.createElement('div');
            separator.className = 'task-section-separator';
            separator.innerHTML = '<span>Tâches terminées</span>';
            c.appendChild(separator);
            separatorDrawn = true;
        }

        let ghosts = Array.isArray(t.duplicateDays) ? t.duplicateDays : [];
        const isMultiDate = (!t.completed && ghosts.length > 0);
        const cardStyleClass = isMultiDate ? 'task-card stacked-task' : 'task-card';
        
        const displayDateStr = t.currentDisplayDate || t.date;
        const displayTimeStr = t.currentDisplayTime || t.time || "";
        const displayDateFR = displayDateStr ? displayDateStr.split('-').reverse().join('/') : '';
        
        // CORRECTION : Pas d'émoji pour le descriptif
        let descHtml = t.desc ? `<div style="flex:1; font-size: 0.85rem; opacity: 0.7; font-style: italic; white-space: pre-wrap; line-height: 1.3; margin-left: 10px; padding-left: 10px; border-left: 1px dashed rgba(128,128,128,0.3); display: flex; align-items: center;">${t.desc}</div>` : '';
        
        let ghostHtml = "";
        if (isMultiDate) {
            ghostHtml = `<span onclick="event.stopPropagation(); openGhostModal('${t.id}')" style="display:inline-block; margin-top:8px; font-size:0.75rem; color:var(--primary); background:rgba(0,206,209,0.1); padding:4px 10px; border-radius:12px; cursor:pointer; font-weight:bold;">🗓️ + ${ghosts.length} date(s) prévue(s)</span>`;
        }

        const d = document.createElement('div');
        
        if (t.completed) {
            d.className = `task-card completed-bubble`;
            d.innerHTML = `
                <div style="flex:1; display:flex; align-items:center;" onclick="toggleTaskCheck('${t.id}', ${t.completed}, '${displayDateStr}')">
                    <div style="flex:1;">
                        <span class="badge-finished">✨ Fini !</span><br>
                        <strong style="text-decoration:line-through; opacity:0.5;">${t.name}</strong>
                        <small style="display:block; opacity:0.5; margin-top:2px;">📅 ${displayDateFR} ${displayTimeStr ? '⏰ ' + displayTimeStr : ''}</small>
                    </div>
                    ${t.desc ? `<div style="flex:1; font-size: 0.85rem; opacity: 0.4; font-style: italic; margin-left: 10px; padding-left: 10px; border-left: 1px dashed rgba(128,128,128,0.2); display: flex; align-items: center; text-decoration:line-through;">${t.desc}</div>` : ''}
                </div>
                <div class="task-actions">
                    <button onclick="deleteTask('${t.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>
                </div>`;
        } else {
            d.className = `${cardStyleClass} ${t.importance} ${t.isImminent ? 'is-imminent' : ''}`;
            let remindersText = "Aucun"; if(t.reminders && t.reminders.length > 0) { remindersText = t.reminders.map(r => `${r} min avant`).join(', '); }
            
            d.innerHTML = `
                <div style="flex:1; display:flex; align-items:center;" onclick="toggleTaskCheck('${t.id}', ${t.completed}, '${displayDateStr}')">
                    <div style="flex:${t.desc ? '1' : 'auto'};">
                        <strong style="${t.completed ? 'text-decoration:line-through; opacity:0.5;' : ''}">${t.name}</strong>
                        <small style="display:block; margin-top:2px;">📅 ${displayDateFR} ${displayTimeStr ? '⏰ ' + displayTimeStr : ''}</small>
                        ${t.isImminent ? `<small class="time-alert" style="display:block; margin-top:2px;">⚠️ ÉCHÉANCE PROCHE : Reste ${t.minutesLeft} min !</small>` : `<small style="color:var(--primary-dark); display:block; margin-top:2px;">🔔 Rappels : ${remindersText}</small>`}
                        ${ghostHtml}
                    </div>
                    ${descHtml}
                </div>
                <div class="task-actions">
                    ${taskSubView === 'active' ? `<button onclick="duplicateTask('${t.id}')" style="background:none; border:none; color:var(--primary); font-size:1.2rem; cursor:pointer; margin-right:5px;">📑</button>` : ''}
                    ${taskSubView === 'active' ? `<button onclick="editTask('${t.id}')" style="background:none; border:none; color:var(--primary); font-size:1.3rem; cursor:pointer;">✎</button>` : ''}
                    <button onclick="deleteTask('${t.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>
                </div>`;
        }
        c.appendChild(d);
    });
}

// --- COCHER / DÉCOCHER UNE TÂCHE ---
function toggleTaskCheck(id, currentStatus, specificDate) { 
    const task = tasks.find(t => t.id === id);
    if(!task) return;

    if(!currentStatus) {
        let isMultiDate = (task.duplicateDays && task.duplicateDays.length > 0);

        if (isMultiDate && specificDate) {
            let allDates = [task.date, ...task.duplicateDays].sort();
            let remainingDates = allDates.filter(d => typeof d === 'string' ? d !== specificDate : d.date !== specificDate);

            if (remainingDates.length > 0) {
                db.collection("tasks").add({
                    name: task.name, desc: task.desc || "", date: specificDate, time: task.time || "",
                    reminders: task.reminders || [], importance: task.importance,
                    completed: true, completedAtStr: todayStr, userId: task.userId,
                    createdAt: task.createdAt || Date.now(), duplicateDays: []
                });

                let nextMainDate = remainingDates.shift();
                db.collection("tasks").doc(id).update({
                    date: nextMainDate.date || nextMainDate, 
                    time: nextMainDate.time || task.time || "",
                    duplicateDays: remainingDates
                });
                showToast("Instance terminée et archivée ! ✨");
                return; 
            }
        }
        db.collection("tasks").doc(id).update({ completed: true, completedAtStr: todayStr }); 
    } else {
        db.collection("tasks").doc(id).update({ completed: false, completedAtStr: firebase.firestore.FieldValue.delete() }); 
    }
}

function toggleTodo(id, currentStatus) { db.collection("dailyTodo").doc(id).update({ completed: !currentStatus }); }
function toggleWeeklyTodo(id, currentStatus) { db.collection("weeklyTodo").doc(id).update({ completed: !currentStatus }); }
function toggleRoutineTodo(id, currentStatus) { db.collection("routineTodo").doc(id).update({ completed: !currentStatus }); }

function deleteTask(id) { db.collection("tasks").doc(id).delete().then(() => { showToast("Tâche supprimée ! 🗑️"); }); }
function deleteWeeklyTodo(id) { db.collection("weeklyTodo").doc(id).delete().then(() => showToast("Supprimé !")); }
function deleteDailyTodo(id) { db.collection("dailyTodo").doc(id).delete().then(() => showToast("Supprimé !")); }
function deleteRoutineTodo(id) { db.collection("routineTodo").doc(id).delete().then(() => showToast("Supprimé de la semaine type !")); }

// --- MODIFIER UNE TÂCHE ---
function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if(task) {
        editingId = id;
        unlockModalFields();
        
        if(document.getElementById('task-name')) document.getElementById('task-name').value = task.name; 
        if(document.getElementById('task-desc')) document.getElementById('task-desc').value = task.desc || ""; 
        if(document.getElementById('task-date')) document.getElementById('task-date').value = task.date; 
        if(document.getElementById('task-time')) document.getElementById('task-time').value = task.time || "";
        setSelectedRemindersToBadges(task.reminders || []); 
        if(document.getElementById('task-importance')) document.getElementById('task-importance').value = task.importance;
        
        document.getElementById('modal-title').innerText = "Modifier la tâche"; 
        document.getElementById('task-modal').style.display = 'flex';
    }
}

// --- CLIQUE ENREGISTRER TÂCHE ---
document.getElementById('save-task').onclick = () => {
    const n = document.getElementById('task-name').value.trim(); 
    const dStr = document.getElementById('task-desc').value.trim(); 
    const singleDate = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value; 
    const imp = document.getElementById('task-importance').value;
    const reminders = getSelectedRemindersFromBadges(); 
    
    if(n && currentUser) {
        if(document.getElementById('modal-title').innerText === "Dupliquer la tâche" && editingId) {
            const task = tasks.find(t => t.id === editingId);
            if (task && singleDate) {
                let allOccurrences = [{date: task.date, time: task.time || ""}];
                let currentGhosts = Array.isArray(task.duplicateDays) ? task.duplicateDays : [];
                
                currentGhosts.forEach(g => {
                    allOccurrences.push(typeof g === 'string' ? {date: g, time: task.time} : g);
                });
                allOccurrences.push({date: singleDate, time: time});
                
                allOccurrences.sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return (a.time || "").localeCompare(b.time || "");
                });
                
                let nextMain = allOccurrences.shift();
                
                db.collection("tasks").doc(editingId).update({
                    date: nextMain.date, time: nextMain.time || "", desc: task.desc || "", duplicateDays: allOccurrences
                });
                
                editingId = null;
                showToast("Date planifiée avec succès ! 🗓️");
            }
        }
        else if(editingId && singleDate) { 
            let taskData = { name: n, desc: dStr, date: singleDate, time: time, reminders: reminders, importance: imp };
            db.collection("tasks").doc(editingId).update(taskData); 
            editingId = null; 
            showToast("Tâche modifiée ! ✎"); 
        } 
        else if (singleDate) {
            let taskData = { name: n, desc: dStr, date: singleDate, time: time, reminders: reminders, importance: imp, completed: false, userId: currentUser.uid, createdAt: Date.now(), duplicateDays: [] };
            db.collection("tasks").add(taskData); 
            showToast("Tâche enregistrée ! ✨"); 
        }
        
        unlockModalFields();
        document.getElementById('task-modal').style.display = 'none';
    }
};

// --- ONGLET : CALENDRIER MULTI-DATES ---
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

            const dt = tasks.filter(tk => {
                if (tk.date === ds) return true;
                if (tk.duplicateDays) {
                    return tk.duplicateDays.some(g => {
                        let gDate = typeof g === 'string' ? g : g.date;
                        return gDate === ds;
                    });
                }
                return false;
            });
            
            let countHtml = "";
            if(dt.length > 0) {
                const imps = dt.map(tk => tk.importance);
                if(imps.includes('high')) div.classList.add('has-high'); else if(imps.includes('medium')) div.classList.add('has-medium'); else div.classList.add('has-low');
                
                countHtml = `<span style="position:absolute; top:2px; right:4px; font-size:0.65rem; font-weight:bold; color:var(--primary-dark); background:rgba(0, 206, 209, 0.15); border-radius:10px; padding:2px 4px;">+${dt.length}</span>`;
            }
            
            div.onclick = () => openCalendarDayModal(i, monthNames[selectedMonth], selectedYear, dt, ds);
            div.innerHTML = `${countHtml}<span style="font-size:0.6rem; opacity:0.5; display:block; margin-top: ${dt.length>0 ? '6px' : '0'};">${dayInitials[new Date(selectedYear, selectedMonth, i).getDay()]}</span><b>${i}</b>`;
            c.appendChild(div);
        }
    }
}

function openCalendarDayModal(day, monthName, year, dayTasks, currentFullDate) {
    document.getElementById('cal-modal-date-title').innerText = `${day} ${monthName} ${year}`;
    const container = document.getElementById('cal-modal-tasks-container'); container.innerHTML = '';
    if(dayTasks.length === 0) { container.innerHTML = '<p style="text-align:center; opacity:0.5; font-style:italic;">Aucune tâche</p>'; } 
    else {
        dayTasks.forEach(t => {
            let specificTime = t.time;
            let isCopy = false;
            
            if (t.date !== currentFullDate) {
                isCopy = true;
                let ghost = t.duplicateDays.find(g => (typeof g === 'string' ? g : g.date) === currentFullDate);
                if (ghost && ghost.time) specificTime = ghost.time;
            }
            
            const isCopyTag = isCopy ? ' <small style="opacity:0.6; font-size:0.75rem;">(Prévu 🗓️)</small>' : '';
            container.innerHTML += `
                <div style="padding: 12px; border-radius: 12px; border-left: 6px solid var(--${t.importance === 'high'?'danger':t.importance==='medium'?'warning':'success'}); background: rgba(128,128,128,0.05); text-align:left;"><strong style="${t.completed ? 'text-decoration:line-through; opacity:0.5;' : ''}">${t.name}</strong>${isCopyTag}${specificTime ? `<span style="float:right; font-size:0.85rem; opacity:0.7;">⏰ ${specificTime}</span>`:''}</div>`; 
        });
    }
    document.getElementById('calendar-day-modal').style.display = 'flex';
}

// --- ONGLET : TO-DO LIST & AUTOMATIONS ---
function setTodoMode(m) { todoMode = m; renderTodo(); }
function renderTodo() {
    const c = document.getElementById('todo-content'); if (!c) return;
    document.querySelectorAll('#todo-page .bubble').forEach(b => b.classList.remove('active'));
    
    if (todoMode === 'daily') document.getElementById('btn-daily').classList.add('active');
    else if (todoMode === 'weekly') document.getElementById('btn-weekly').classList.add('active');
    else if (todoMode === 'routine') document.getElementById('btn-routine').classList.add('active');
    
    if(todoMode === 'daily') {
        document.getElementById('todo-today-date').innerText = new Date().toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'});
        c.innerHTML = '<div class="weekly-container"></div>'; const wc = c.querySelector('.weekly-container');
        
        for (let h = 8; h <= 20; h++) {
            const currentHourStr = `${h.toString().padStart(2, '0')}:00`;
            let items = dailyTodo.filter(it => it.date === todayStr && parseInt(it.time.split(':')[0]) === h);
            let weeklyItems = weeklyTodo.filter(it => parseInt(it.dayOfWeek) === currentDayOfWeek && parseInt(it.time.split(':')[0]) === h);
            let routineItems = routineTodo.filter(it => parseInt(it.dayOfWeek) === currentDayOfWeek && parseInt(it.time.split(':')[0]) === h);
            
            let combinedItems = [...items, ...weeklyItems, ...routineItems]; 
            combinedItems.sort((a,b) => a.time.localeCompare(b.time));

            const hourCard = document.createElement('div'); hourCard.className = 'weekly-day-card';
            hourCard.innerHTML = `
                <div class="weekly-day-header">
                    <span class="weekly-day-title">${currentHourStr}</span>
                    <button onclick="openTodoModal('${h.toString().padStart(2,'0')}:00', false, 0, false)" class="weekly-add-btn">+</button>
                </div>
                <div class="weekly-subtasks">
                    ${combinedItems.map(it => {
                        const isWeekly = it.hasOwnProperty('dayOfWeek') && !it.hasOwnProperty('isRoutine');
                        const isRoutine = it.hasOwnProperty('isRoutine');
                        
                        let checkFunc = `toggleTodo('${it.id}', ${it.completed})`;
                        let delFunc = `deleteDailyTodo('${it.id}')`;
                        let labelSuffix = '';
                        
                        if (isWeekly) {
                            checkFunc = `toggleWeeklyTodo('${it.id}', ${it.completed})`;
                            delFunc = `deleteWeeklyTodo('${it.id}')`;
                            labelSuffix = ' <small style="opacity:0.5;">(Hebdo)</small>';
                        } else if (isRoutine) {
                            checkFunc = `toggleRoutineTodo('${it.id}', ${it.completed})`;
                            delFunc = `deleteRoutineTodo('${it.id}')`;
                            labelSuffix = ' <small style="opacity:0.5; color:var(--primary-dark);">(Type ⚙️)</small>';
                        }
                        
                        return `
                            <div class="weekly-item">
                                <span onclick="event.stopPropagation(); ${checkFunc}" style="cursor:pointer;" class="weekly-item-text ${it.completed ? 'todo-completed' : ''}">
                                    <b>${it.time}</b> : ${it.name}${labelSuffix}
                                </span>
                                <div class="weekly-item-actions">
                                    <button onclick="editTodoItem('${it.id}', '${it.name}', '${it.time}', ${(isWeekly || isRoutine)}, ${(isWeekly || isRoutine) ? it.dayOfWeek : 0}, ${isRoutine})" style="color:var(--primary);">✎</button>
                                    <button onclick="${delFunc}" style="color:var(--danger);">×</button>
                                </div>
                            </div>`;
                    }).join('') || '<span class="empty-subtasks-msg">Aucun événement</span>'}
                </div>`;
            wc.appendChild(hourCard);
        }
    } else if (todoMode === 'weekly') {
        document.getElementById('todo-today-date').innerText = "Planification Hebdomadaire";
        c.innerHTML = '<div class="weekly-container"></div>'; const wc = c.querySelector('.weekly-container');
        const presidentialOrder = [1, 2, 3, 4, 5, 6, 0];
        
        presidentialOrder.forEach(dayNum => {
            let dayTasks = weeklyTodo.filter(it => parseInt(it.dayOfWeek) === dayNum);
            let dayRoutine = routineTodo.filter(it => parseInt(it.dayOfWeek) === dayNum);
            
            let combinedTasks = [...dayTasks, ...dayRoutine];
            combinedTasks.sort((a,b) => a.time.localeCompare(b.time));
            
            const dayCard = document.createElement('div'); dayCard.className = 'weekly-day-card';
            dayCard.innerHTML = `
                <div class="weekly-day-header">
                    <span class="weekly-day-title">${dayNamesFr[dayNum]}</span>
                    <button onclick="openTodoModal('12:00', true, ${dayNum}, false)" class="weekly-add-btn">+</button>
                </div>
                <div class="weekly-subtasks">
                    ${combinedTasks.map(it => {
                        const isRoutine = it.hasOwnProperty('isRoutine') || routineTodo.some(r => r.id === it.id);
                        const checkFunc = isRoutine ? `toggleRoutineTodo('${it.id}', ${it.completed})` : `toggleWeeklyTodo('${it.id}', ${it.completed})`;
                        const delFunc = isRoutine ? `deleteRoutineTodo('${it.id}')` : `deleteWeeklyTodo('${it.id}')`;
                        
                        return `
                        <div class="weekly-item">
                            <span onclick="${checkFunc}" style="cursor:pointer;" class="weekly-item-text ${it.completed ? 'todo-completed' : ''}">
                                <b>${it.time}</b> : ${it.name} ${isRoutine ? '<small style="opacity:0.5; color:var(--primary-dark);">(Type ⚙️)</small>':''}
                            </span>
                            <div class="weekly-item-actions">
                                <button onclick="editTodoItem('${it.id}', '${it.name}', '${it.time}', true, ${dayNum}, ${isRoutine})" style="color:var(--primary);">✎</button>
                                <button onclick="${delFunc}" style="color:var(--danger);">×</button>
                            </div>
                        </div>`;
                    }).join('') || '<span class="empty-subtasks-msg">Aucune activité planifiée</span>'}
                </div>`;
            wc.appendChild(dayCard);
        });
    } else if (todoMode === 'routine') {
        document.getElementById('todo-today-date').innerText = "Configuration de la Semaine Type ⚙️";
        c.innerHTML = '<div class="weekly-container"></div>'; const wc = c.querySelector('.weekly-container');
        const presidentialOrder = [1, 2, 3, 4, 5, 6, 0];
        
        presidentialOrder.forEach(dayNum => {
            const dayTasks = routineTodo.filter(it => parseInt(it.dayOfWeek) === dayNum); 
            dayTasks.sort((a,b) => a.time.localeCompare(b.time));
            
            const dayCard = document.createElement('div'); dayCard.className = 'weekly-day-card';
            dayCard.innerHTML = `
                <div class="weekly-day-header">
                    <span class="weekly-day-title">${dayNamesFr[dayNum]}</span>
                    <button onclick="openTodoModal('12:00', true, ${dayNum}, true)" class="weekly-add-btn">+</button>
                </div>
                <div class="weekly-subtasks">
                    ${dayTasks.map(it => `
                        <div class="weekly-item">
                            <span class="weekly-item-text">
                                <b>${it.time}</b> : ${it.name}
                            </span>
                            <div class="weekly-item-actions">
                                <button onclick="editTodoItem('${it.id}', '${it.name}', '${it.time}', true, ${dayNum}, true)" style="color:var(--primary);">✎</button>
                                <button onclick="deleteRoutineTodo('${it.id}')" style="color:var(--danger);">×</button>
                            </div>
                        </div>`).join('') || '<span class="empty-subtasks-msg">Aucune tâche type définie</span>'}
                </div>`;
            wc.appendChild(dayCard);
        });
    }
}

function openTodoModal(time, isWeeklyOrRoutine, dayNum = 1, isRoutine = false) { 
    editingTodoId = null; 
    document.getElementById('todo-time').value = time; 
    document.getElementById('todo-task-name').value = ''; 
    document.getElementById('todo-modal-title').innerText = isRoutine ? "Ajouter à la Semaine Type" : "Ajouter à la To-Do List"; 
    
    if(isWeeklyOrRoutine) { 
        document.getElementById('todo-day-selector-block').style.display = 'flex';
        document.getElementById('todo-day-select').value = dayNum; 
    } else {
        document.getElementById('todo-day-selector-block').style.display = 'none';
    }
    
    document.getElementById('save-todo').setAttribute('data-weekly-mode', isWeeklyOrRoutine && !isRoutine); 
    document.getElementById('save-todo').setAttribute('data-routine-mode', isRoutine); 
    document.getElementById('todo-modal').style.display = 'flex'; 
}

function editTodoItem(id, name, time, isWeeklyOrRoutine, dayNum = 1, isRoutine = false) { 
    editingTodoId = id; 
    document.getElementById('todo-time').value = time; 
    document.getElementById('todo-task-name').value = name; 
    document.getElementById('todo-modal-title').innerText = isRoutine ? "Modifier la Semaine Type" : "Modifier la To-Do List"; 
    
    if(isWeeklyOrRoutine) {
        document.getElementById('todo-day-selector-block').style.display = 'flex';
        document.getElementById('todo-day-select').value = dayNum; 
    } else {
        document.getElementById('todo-day-selector-block').style.display = 'none';
    }
    
    document.getElementById('save-todo').setAttribute('data-weekly-mode', isWeeklyOrRoutine && !isRoutine); 
    document.getElementById('save-todo').setAttribute('data-routine-mode', isRoutine); 
    document.getElementById('todo-modal').style.display = 'flex'; 
}

document.getElementById('save-todo').onclick = () => {
    const n = document.getElementById('todo-task-name').value.trim(); 
    const t = document.getElementById('todo-time').value;
    const isWeekly = document.getElementById('save-todo').getAttribute('data-weekly-mode') === 'true';
    const isRoutine = document.getElementById('save-todo').getAttribute('data-routine-mode') === 'true';
    
    if(n && t && currentUser) { 
        let targetCollection = "dailyTodo";
        if (isWeekly) targetCollection = "weeklyTodo";
        else if (isRoutine) targetCollection = "routineTodo";

        if(editingTodoId) {
            let updateData = { name: n, time: t };
            if(isWeekly || isRoutine) updateData.dayOfWeek = document.getElementById('todo-day-select').value;
            db.collection(targetCollection).doc(editingTodoId).update(updateData).then(() => {
                showToast(isRoutine ? "Semaine type modifiée ! ⚙️" : "Activité modifiée ! ✎");
            });
            editingTodoId = null;
        } else {
            if(isRoutine) {
                db.collection("routineTodo").add({ name: n, time: t, dayOfWeek: document.getElementById('todo-day-select').value, completed: false, isRoutine: true, userId: currentUser.uid }).then(() => {
                    showToast("Ajouté à la semaine type ! ⚙️");
                });
            } else if(isWeekly) { 
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

// --- INITIALISATION GENERALE ET BOUTONS ---
document.getElementById('add-task-btn').onclick = () => { 
    editingId = null; 
    unlockModalFields();
    if(document.getElementById('task-name')) document.getElementById('task-name').value = ""; 
    if(document.getElementById('task-desc')) document.getElementById('task-desc').value = ""; 
    if(document.getElementById('task-time')) document.getElementById('task-time').value = ""; 
    setSelectedRemindersToBadges([]); 
    if(document.getElementById('task-date')) document.getElementById('task-date').value = todayStr; 
    document.getElementById('modal-title').innerText = "Nouvelle Tâche"; 
    document.getElementById('task-modal').style.display = 'flex'; 
};
document.getElementById('close-modal').onclick = () => { unlockModalFields(); document.getElementById('task-modal').style.display = 'none'; };
document.getElementById('close-todo-modal').onclick = () => document.getElementById('todo-modal').style.display = 'none';

// CORRECTION VISUELLE : window.onclick utilise maintenant match de classe rigoureux
window.onclick = (e) => { 
    if(e.target.classList && e.target.classList.contains('modal')) { 
        unlockModalFields(); 
        document.getElementById('task-modal').style.display = 'none'; 
        document.getElementById('todo-modal').style.display = 'none'; 
        document.getElementById('calendar-day-modal').style.display = 'none'; 
        document.getElementById('welcome-modal').style.display = 'none'; 
        if(document.getElementById('ghost-modal')) document.getElementById('ghost-modal').style.display = 'none';
    } 
};

// --- LOGIQUE DE DUPLICATION DANS LA SÉRIE ---
function duplicateTask(id) {
    const task = tasks.find(t => t.id === id);
    if(task) {
        editingId = id; 
        unlockModalFields(); 
        
        if(document.getElementById('task-name')) document.getElementById('task-name').value = task.name;
        if(document.getElementById('task-desc')) document.getElementById('task-desc').value = task.desc || "";
        if(document.getElementById('task-date')) document.getElementById('task-date').value = ""; 
        if(document.getElementById('task-time')) document.getElementById('task-time').value = ""; 
        if(document.getElementById('task-importance')) document.getElementById('task-importance').value = task.importance;
        setSelectedRemindersToBadges(task.reminders || []);
        
        if(document.getElementById('task-name')) document.getElementById('task-name').disabled = true;
        if(document.getElementById('task-desc')) document.getElementById('task-desc').disabled = true;
        if(document.getElementById('task-importance')) document.getElementById('task-importance').disabled = true;
        if(document.getElementById('date-input-label')) document.getElementById('date-input-label').innerText = "Nouvelle Date Prévue";
        
        document.querySelectorAll('.reminder-badge').forEach(b => {
            b.style.pointerEvents = 'none';
            b.classList.add('disabled-frozen');
        });
        
        document.getElementById('modal-title').innerText = "Dupliquer la tâche";
        document.getElementById('task-modal').style.display = 'flex';
    }
}

// --- ENREGISTREMENT DU SERVICE WORKER ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('Service Worker enregistré avec succès !', registration.scope);
            })
            .catch(err => {
                console.log('Échec de l\'enregistrement du Service Worker :', err);
            });
    });
}
