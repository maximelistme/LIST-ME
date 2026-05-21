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

// Initialisation Sécurisée
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// --- VARIABLES GLOBALES ---
let tasks = [];
let dailyTodo = [];
let weeklyTodo = [];
let currentUser = null; 
let userNickname = ""; 
let hasShownWelcomeThisSession = false; 
let taskSubView = "active"; 
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

// Charger le thème directement au boot
let currentTheme = localStorage.getItem('listme_theme') || 'pink';
document.body.className = `theme-${currentTheme}`;

// --- BOÎTE À OUTILS OUTILS ET TOAST ---
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

// --- ÉCOUTEUR FIREBASE PRINCIPAL ---
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
        }).catch(() => {
            startRealtimeSync(user.uid);
            showPage('tasks');
        });
    } else {
        currentUser = null;
        document.getElementById('main-nav').style.display = 'none';
        document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
        document.getElementById('auth-page').style.display = 'block';
    }
});

function startRealtimeSync(userId) {
    db.collection("tasks").where("userId", "==", userId).onSnapshot((snapshot) => {
        tasks = []; 
        snapshot.forEach(doc => { let d = doc.data(); d.id = doc.id; tasks.push(d); });
        renderTasks(); 
        if(viewState === 'day') renderCalendar();
    });
    db.collection("dailyTodo").where("userId", "==", userId).onSnapshot((snapshot) => {
        dailyTodo = []; snapshot.forEach(doc => { let d = doc.data(); d.id = doc.id; dailyTodo.push(d); });
        renderTodo();
    });
    db.collection("weeklyTodo").where("userId", "==", userId).onSnapshot((snapshot) => {
        weeklyTodo = []; snapshot.forEach(doc => { let d = doc.data(); d.id = doc.id; weeklyTodo.push(d); });
        renderTodo();
    });
}

// --- RENDU : ONGLETS DES TÂCHES ---
function renderTasks() {
    const c = document.getElementById('task-list'); if (!c) return; c.innerHTML = '';
    const sortMode = document.getElementById('task-sort-filter').value;
    
    let filteredList = tasks.filter(t => (taskSubView === "active") ? !t.completed : t.completed);

    if (sortMode === 'chrono') {
        filteredList.sort((a, b) => a.date.localeCompare(b.date));
    }

    if(filteredList.length === 0) {
        c.innerHTML = `<p style="text-align:center; opacity:0.5; font-style:italic; margin-top:30px;">Aucune tâche.</p>`; return;
    }

    filteredList.forEach(t => {
        const d = document.createElement('div'); d.className = `task-card ${t.importance}`;
        d.innerHTML = `
            <div style="flex:1" onclick="toggleTaskCheck('${t.id}', ${t.completed})">
                <strong style="${t.completed ? 'text-decoration:line-through; opacity:0.5;' : ''}">${t.name}</strong><br>
                <small>📅 ${t.date} ${t.time ? '⏰ ' + t.time : ''}</small>
            </div>
            <div class="task-actions">
                <button onclick="deleteTask('${t.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>
            </div>`;
        c.appendChild(d);
    });
}

function toggleTaskCheck(id, status) { db.collection("tasks").doc(id).update({ completed: !status }); }
function deleteTask(id) { db.collection("tasks").doc(id).delete(); }

// --- BOUTONS PROFIL ET AUTHENTIFICATION ---
document.getElementById('btn-save-nickname').onclick = () => {
    const nick = document.getElementById('profile-nickname').value.trim();
    if (nick && currentUser) {
        db.collection("users").doc(currentUser.uid).set({ nickname: nick }, { merge: true }).then(() => {
            userNickname = nick; showToast("Surnom enregistré ! ✨");
        });
    }
};

document.getElementById('btn-login').onclick = () => {
    const email = document.getElementById('auth-email').value; const pass = document.getElementById('auth-pass').value;
    if(email && pass) auth.signInWithEmailAndPassword(email, pass).catch(err => alert(err.message));
};
document.getElementById('btn-register').onclick = () => {
    const email = document.getElementById('auth-email').value; const pass = document.getElementById('auth-pass').value;
    if(email && pass) auth.createUserWithEmailAndPassword(email, pass).catch(err => alert(err.message));
};
document.getElementById('btn-google').onclick = () => { auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); };
document.getElementById('btn-logout').onclick = () => { auth.signOut(); };

// --- RENDU : CALENDRIER ---
function setViewState(s) { viewState = s; renderCalendar(); }
function renderCalendar() {
    const c = document.getElementById('calendar-content'); const t = document.getElementById('calendar-title'); if (!c) return; c.innerHTML = '';
    
    if (viewState === 'day') {
        c.className = 'calendar-grid'; t.innerText = `${monthNames[selectedMonth]} ${selectedYear}`;
        const days = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        for (let i = 1; i <= days; i++) {
            const ds = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const div = document.createElement('div'); div.className = 'day-card';
            if(ds === todayStr) div.classList.add('is-today');
            
            const dayTasks = tasks.filter(tk => tk.date === ds);
            if(dayTasks.length > 0) div.classList.add('has-high');

            div.innerHTML = `<span>${dayInitials[new Date(selectedYear, selectedMonth, i).getDay()]}</span><b>${i}</b>`;
            c.appendChild(div);
        }
    }
}

// --- RENDU : TO-DO LIST ---
function setTodoMode(m) { todoMode = m; renderTodo(); }
function renderTodo() {
    const c = document.getElementById('todo-content'); if (!c) return;
    if(todoMode === 'daily') {
        document.getElementById('todo-today-date').innerText = "Aujourd'hui";
        c.innerHTML = '<div style="padding:20px; text-align:center; opacity:0.5;">To-Do List Journalière active.</div>';
    }
}

// ACTION AJOUT TÂCHE
document.getElementById('add-task-btn').onclick = () => {
    document.getElementById('task-name').value = "";
    document.getElementById('task-date').value = todayStr;
    document.getElementById('task-modal').style.display = 'flex';
};
document.getElementById('close-modal').onclick = () => document.getElementById('task-modal').style.display = 'none';

document.getElementById('save-task').onclick = () => {
    const n = document.getElementById('task-name').value; const d = document.getElementById('task-date').value;
    const time = document.getElementById('task-time').value; const imp = document.getElementById('task-importance').value;
    if(n && d && currentUser) {
        db.collection("tasks").add({ name: n, date: d, time: time, importance: imp, completed: false, userId: currentUser.uid });
        document.getElementById('task-modal').style.display = 'none';
    }
};

// SÉCURITÉ ABSOLUE ANTI-ÉCRAN BLANC : Si après le chargement rien n'est affiché, on force l'activation visuelle
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!currentUser) {
            document.getElementById('auth-page').style.display = 'block';
        }
    }, 1500);
});
