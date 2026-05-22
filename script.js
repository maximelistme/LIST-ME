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
    if(view === 'active') {
        document.getElementById('sub-btn-active-tasks').classList.add('active');
    } else {
        document.getElementById('sub-btn-archived-tasks').classList.add('active');
    }
    renderTasks();
}

// --- SURVEILLANCE DE L'ÉTAT DE CONNEXION ---
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('main-nav').style.display = 'flex';
        document.getElementById('profile-user-email').innerText = user.email;
        
        db.collection("users").doc(user.uid).get().then((doc) => {
            if (doc.exists && doc.data().nickname) {
                userNickname = doc.data().nickname;
                document.getElementById('profile-nickname').value = userNickname;
            }
            startRealtimeSync(user.uid); 
            showPage('tasks');
        }).catch(() => { startRealtimeSync(user.uid); showPage('tasks'); });
    } else {
        currentUser = null; userNickname = "";
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
            showToast("Surnom enregistré ! ✨");
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
                tasks.push(data); 
            });
            renderTasks(); 
            if(viewState === 'day') renderCalendar();
        });
    unsubscribeDaily = db.collection("dailyTodo").where("userId", "==", userId).onSnapshot((snapshot) => { dailyTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; dailyTodo.push(data); }); renderTodo(); });
    unsubscribeWeekly = db.collection("weeklyTodo").where("userId", "==", userId).onSnapshot((snapshot) => { weeklyTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; weeklyTodo.push(data); }); renderTodo(); });
}

function stopRealtimeSync() { if (unsubscribeTasks) unsubscribeTasks(); if (unsubscribeDaily) unsubscribeDaily(); if (unsubscribeWeekly) unsubscribeWeekly(); tasks = []; dailyTodo = []; weeklyTodo = []; }

// --- ONGLET : MES TÂCHES ---
function renderTasks() {
    const c = document.getElementById('task-list'); if (!c) return; c.innerHTML = '';
    let filteredList = tasks.filter(t => (taskSubView === "active") ? !t.completed : t.completed);

    if(filteredList.length === 0) {
        c.innerHTML = `<p style="text-align:center; opacity:0.4; font-style:italic; margin-top:30px;">Aucune tâche</p>`; return;
    }

    filteredList.forEach(t => {
        const d = document.createElement('div'); d.className = `task-card ${t.importance} ${t.completed ? 'completed' : ''}`;
        d.innerHTML = `
            <div style="flex:1" onclick="toggleTaskCheck('${t.id}', ${t.completed})">
                <strong style="${t.completed ? 'text-decoration:line-through; opacity:0.5;' : ''}">${t.name}</strong><br>
                <small>📅 ${t.date} ${t.time ? '⏰ ' + t.time : ''}</small>
            </div>
            <div class="task-actions">
                ${taskSubView === 'active' ? `<button onclick="editTask('${t.id}')" style="background:none; border:none; color:var(--primary); font-size:1.3rem; cursor:pointer;">✎</button>` : ''}
                <button onclick="deleteTask('${t.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>
            </div>`;
        c.appendChild(d);
    });
}

function toggleTaskCheck(id, currentStatus) { db.collection("tasks").doc(id).update({ completed: !currentStatus }); }
function deleteTask(id) { db.collection("tasks").doc(id).delete().then(() => { showToast("Tâche supprimée ! 🗑️"); }); }

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if(task) {
        editingId = id;
        document.getElementById('task-name').value = task.name; document.getElementById('task-date').value = task.date; document.getElementById('task-time').value = task.time || "";
        document.getElementById('task-importance').value = task.importance;
        document.getElementById('modal-title').innerText = "Modifier la tâche"; document.getElementById('task-modal').style.display = 'flex';
    }
}

document.getElementById('save-task').onclick = () => {
    const n = document.getElementById('task-name').value; const d = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value; const imp = document.getElementById('task-importance').value;
    if(n && d && currentUser) {
        let taskData = { name: n, date: d, time: time, importance: imp };
        if(editingId) { db.collection("tasks").doc(editingId).update(taskData); editingId = null; showToast("Tâche modifiée ! ✎"); } 
        else { taskData.completed = false; taskData.userId = currentUser.uid; db.collection("tasks").add(taskData); showToast("Tâche ajoutée ! ✨"); }
        document.getElementById('task-modal').style.display = 'none';
    }
};

// --- AUTHENTIFICATION BOUTONS ---
document.getElementById('btn-login').onclick = () => {
    const email = document.getElementById('auth-email').value; const pass = document.getElementById('auth-pass').value;
    if(email && pass) auth.signInWithEmailAndPassword(email, pass).catch(err => showToast("Erreur : " + err.message));
};
document.getElementById('btn-register').onclick = () => {
    const email = document.getElementById('auth-email').value; const pass = document.getElementById('auth-pass').value;
    if(email && pass) auth.createUserWithEmailAndPassword(email, pass).then(() => showToast("Compte créé ! 🎉")).catch(err => showToast("Erreur : " + err.message));
};
document.getElementById('btn-logout').onclick = () => { auth.signOut(); };

// --- ONGLETS : CALENDRIER ---
function setViewState(s) { viewState = s; renderCalendar(); }
function renderCalendar() {
    const c = document.getElementById('calendar-content'); const t = document.getElementById('calendar-title'); c.innerHTML = ''; if (!c) return;
    t.innerText = `${monthNames[selectedMonth]} ${selectedYear}`;
    const days = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    for (let i = 1; i <= days; i++) {
        const div = document.createElement('div'); div.className = 'day-card';
        div.innerHTML = `<b>${i}</b>`;
        c.appendChild(div);
    }
}

// --- ONGLET : TO-DO LIST ---
function setTodoMode(m) { todoMode = m; renderTodo(); }
function renderTodo() {
    const c = document.getElementById('todo-content'); if (!c) return;
    
    if(todoMode === 'daily') {
        document.getElementById('todo-today-date').innerText = new Date().toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'});
        c.innerHTML = '<div class="weekly-container"></div>'; const wc = c.querySelector('.weekly-container');
        
        for (let h = 8; h <= 20; h++) {
            const currentHourStr = `${h.toString().padStart(2, '0')}:00`;
            let items = dailyTodo.filter(it => it.date === todayStr && parseInt(it.time.split(':')[0]) === h);
            let weeklyItems = weeklyTodo.filter(it => parseInt(it.dayOfWeek) === currentDayOfWeek && parseInt(it.time.split(':')[0]) === h);
            let combinedItems = [...items, ...weeklyItems];

            const hourCard = document.createElement('div'); hourCard.className = 'weekly-day-card';
            hourCard.innerHTML = `
                <div class="weekly-day-header">
                    <span class="weekly-day-title">${currentHourStr}</span>
                    <button class="btn-add-todo-time" data-time="${currentHourStr}" data-weekly="false" style="background:var(--primary); border:none; color:white; border-radius:50%; width:25px; height:25px; font-weight:bold; cursor:pointer;">+</button>
                </div>
                <div class="weekly-subtasks">
                    ${combinedItems.map(it => {
                        const isWeekly = it.hasOwnProperty('dayOfWeek'); const checkFunc = isWeekly ? `toggleWeeklyTodo('${it.id}', ${it.completed})` : `toggleTodo('${it.id}', ${it.completed})`; const delFunc = isWeekly ? `deleteWeeklyTodo('${it.id}')` : `deleteDailyTodo('${it.id}')`;
                        return `
                            <div class="weekly-item">
                                <span onclick="event.stopPropagation(); ${checkFunc}" style="cursor:pointer;" class="${it.completed ? 'todo-completed' : ''}">
                                    <b>${it.time}</b> : ${it.name}
                                </span>
                                <div>
                                    <button onclick="editTodoItem('${it.id}', '${it.name}', '${it.time}', ${isWeekly}, ${isWeekly ? it.dayOfWeek : 0})" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-right:5px;">✎</button>
                                    <button onclick="${delFunc}" style="background:none; border:none; color:var(--danger); cursor:pointer;">×</button>
                                </div>
                            </div>`;
                    }).join('') || '<span style="opacity:0.3;">Aucun événement</span>'}
                </div>`;
            wc.appendChild(hourCard);
        }
    } else {
        document.getElementById('todo-today-date').innerText = "Planification Hebdomadaire";
        c.innerHTML = '<div class="weekly-container"></div>'; const wc = c.querySelector('.weekly-container');
        const weeklyOrder = [1, 2, 3, 4, 5, 6, 0];
        
        weeklyOrder.forEach(dayNum => {
            const dayTasks = weeklyTodo.filter(it => parseInt(it.dayOfWeek) === dayNum);
            const dayCard = document.createElement('div'); dayCard.className = 'weekly-day-card';
            dayCard.innerHTML = `
                <div class="weekly-day-header">
                    <span class="weekly-day-title">${dayNamesFr[dayNum]}</span>
                    <button class="btn-add-todo-time" data-time="12:00" data-weekly="true" data-day="${dayNum}" style="background:var(--primary); border:none; color:white; border-radius:50%; width:25px; height:25px; font-weight:bold; cursor:pointer;">+</button>
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
                        </div>`).join('') || '<span style="opacity:0.3;">Aucune activité</span>'}
                </div>`;
            wc.appendChild(dayCard);
        });
    }
}

function editTodoItem(id, name, time, isWeekly, dayNum = 1) { 
    editingTodoId = id; document.getElementById('todo-time').value = time; document.getElementById('todo-task-name').value = name; 
    const selectorBlock = document.getElementById('todo-day-selector-block');
    if(isWeekly) { document.getElementById('todo-day-select').value = dayNum; if(selectorBlock) selectorBlock.style.display = 'flex'; } 
    else { if(selectorBlock) selectorBlock.style.display = 'none'; } 
    document.getElementById('save-todo').setAttribute('data-weekly-mode', isWeekly); document.getElementById('todo-modal').style.display = 'flex'; 
}

function toggleTodo(id, currentStatus) { db.collection("dailyTodo").doc(id).update({ completed: !currentStatus }); }
function toggleWeeklyTodo(id, currentStatus) { db.collection("weeklyTodo").doc(id).update({ completed: !currentStatus }); }
function deleteWeeklyTodo(id) { db.collection("weeklyTodo").doc(id).delete().then(() => { showToast("Activité supprimée ! 🗑️"); }); }
function deleteDailyTodo(id) { db.collection("dailyTodo").doc(id).delete().then(() => { showToast("Activité supprimée ! 🗑️"); }); }

// --- ACTION ENREGISTRER DANS LA TO-DO LIST ---
document.getElementById('save-todo').onclick = () => {
    const n = document.getElementById('todo-task-name').value.trim(); const t = document.getElementById('todo-time').value;
    const isWeekly = document.getElementById('save-todo').getAttribute('data-weekly-mode') === 'true';
    if(n && t && currentUser) { 
        if(editingTodoId) {
            let collection = isWeekly ? "weeklyTodo" : "dailyTodo"; let updateData = { name: n, time: t };
            if(isWeekly) updateData.dayOfWeek = document.getElementById('todo-day-select').value;
            db.collection(collection).doc(editingTodoId).update(updateData).then(() => { showToast("Activité modifiée ! ✎"); }); editingTodoId = null;
        } else {
            if(isWeekly) { db.collection("weeklyTodo").add({ name: n, time: t, dayOfWeek: document.getElementById('todo-day-select').value, completed: false, userId: currentUser.uid }).then(() => { showToast("Activité hebdomadaire ajoutée ! 🗓️"); }); } 
            else { db.collection("dailyTodo").add({ name: n, time: t, date: todayStr, completed: false, userId: currentUser.uid }).then(() => { showToast("Activité ajoutée ! ✨"); }); }
        }
        document.getElementById('todo-modal').style.display = 'none'; document.getElementById('todo-task-name').value = '';
    }
};

// --- INITIALISATION GENERALE ET ÉCOUTEURS DIRECTS ---
document.getElementById('add-task-btn').onclick = () => { editingId = null; document.getElementById('task-name').value = ""; document.getElementById('task-date').value = todayStr; document.getElementById('modal-title').innerText = "Nouvelle Tâche"; document.getElementById('task-modal').style.display = 'flex'; };
document.getElementById('close-modal').onclick = () => document.getElementById('task-modal').style.display = 'none';
document.getElementById('close-todo-modal').onclick = () => document.getElementById('todo-modal').style.display = 'none';

// ÉCOUTEUR DIRECT INTELLIGENT (CALQUÉ SUR LA MÉTHODE DU BOUTON DES TÂCHES)
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('btn-add-todo-time')) {
        const time = e.target.getAttribute('data-time');
        const isWeekly = e.target.getAttribute('data-weekly') === 'true';
        const dayNum = parseInt(e.target.getAttribute('data-day') || "1");
        
        editingTodoId = null; 
        document.getElementById('todo-time').value = time; 
        document.getElementById('todo-task-name').value = ''; 
        document.getElementById('todo-modal-title').innerText = "Ajouter à la To-Do List"; 
        
        const selectorBlock = document.getElementById('todo-day-selector-block');
        if (isWeekly) { 
            document.getElementById('todo-day-select').value = dayNum; 
            if (selectorBlock) selectorBlock.style.display = 'flex';
        } else {
            if (selectorBlock) selectorBlock.style.display = 'none';
        } 
        
        document.getElementById('save-todo').setAttribute('data-weekly-mode', isWeekly); 
        document.getElementById('todo-modal').style.display = 'flex';
    }
});

window.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('modal')) {
        document.getElementById('task-modal').style.display = 'none';
        document.getElementById('todo-modal').style.display = 'none';
    }
});
