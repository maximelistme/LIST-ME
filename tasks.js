function switchTaskSubView(view) {
    taskSubView = view; document.querySelectorAll('.sub-menu-tab').forEach(b => b.classList.remove('active'));
    const actionBar = document.getElementById('tasks-action-bar'), archiveSearch = document.getElementById('archive-search-bar');
    if(view === 'active') { document.getElementById('sub-btn-active-tasks').classList.add('active'); if(actionBar) actionBar.style.display = 'flex'; if(archiveSearch) archiveSearch.style.display = 'none'; } 
    else { document.getElementById('sub-btn-archived-tasks').classList.add('active'); if(actionBar) actionBar.style.display = 'none'; if(archiveSearch) archiveSearch.style.display = 'flex'; }
    renderTasks();
}

function renderTasks() { 
    const c = document.getElementById('task-list'); if (!c) return; c.innerHTML = ''; const now = new Date(); 
    let activeList = [], archiveList = []; tasks.forEach(t => { if(t.completed) { if(t.completedAtStr && t.completedAtStr !== todayStr) { archiveList.push(t); } else { activeList.push(t); } } else { activeList.push(t); } }); 
    let filteredList = (taskSubView === "active") ? activeList : archiveList; 
    
    // --- ANTI-CRASH SÉCURISÉ DES TRIS ARCHIVES (IGNORANCE DATES VIDES) ---
    if (taskSubView === "archive") { 
        const archiveSort = document.getElementById('archive-sort-filter').value; 
        filteredList.sort((a,b) => { 
            const dateA = a.completedAtStr || a.date || "", dateB = b.completedAtStr || b.date || ""; 
            if (archiveSort === 'desc') { if (dateA !== dateB) return dateB.localeCompare(dateA); return b.createdAt - a.createdAt; } 
            else { if (dateA !== dateB) return dateA.localeCompare(dateB); return a.createdAt - b.createdAt; } 
        }); 
    } 
    const isChronoSort = (taskSubView === "archive") || (document.getElementById('task-sort-filter') && document.getElementById('task-sort-filter').value === 'chrono');
    
    if (taskSubView === "active") { 
        const sortMode = document.getElementById('task-sort-filter') ? document.getElementById('task-sort-filter').value : 'chrono'; 
        let imminentTasks = [], standardTasks = [], completedTodayTasks = []; 
        filteredList.forEach(t => { 
            t.currentDisplayDate = t.date; t.currentDisplayTime = t.time; 
            if (!t.completed && t.duplicateDays && t.duplicateDays.length > 0) { 
                let allOcc = [{date: t.date, time: t.time || ""}]; 
                t.duplicateDays.forEach(g => { if (typeof g === 'string') allOcc.push({date: g, time: t.time || ""}); else allOcc.push(g); }); 
                allOcc.sort((a,b) => (a.date || "").localeCompare(b.date || "") !== 0 ? (a.date || "").localeCompare(b.date || "") : (a.time || "").localeCompare(b.time || "")); 
                let futureOcc = allOcc.filter(o => o.date >= todayStr), currentOcc = futureOcc.length > 0 ? futureOcc[0] : allOcc[allOcc.length - 1]; 
                t.currentDisplayDate = currentOcc.date; t.currentDisplayTime = currentOcc.time; 
            } 
            if(t.completed) { completedTodayTasks.push(t); return; } 
            if(t.currentDisplayDate === todayStr && t.currentDisplayTime) { 
                const [tHour, tMin] = t.currentDisplayTime.split(':').map(Number); 
                const taskTimeObj = new Date(); taskTimeObj.setHours(tHour, tMin, 0, 0); 
                const remainingMinutes = (taskTimeObj - now) / 60000; 
                if(remainingMinutes > 0 && remainingMinutes <= 60) { t.isImminent = true; t.minutesLeft = Math.round(remainingMinutes); imminentTasks.push(t); return; } 
            } 
            t.isImminent = false; standardTasks.push(t); 
        }); 
        
        // --- ANTI-CRASH SÉCURISÉ CHRONOSORT ---
        const chronoSort = (a, b) => { 
            let dateA = a.currentDisplayDate || a.date || "", dateB = b.currentDisplayDate || b.date || ""; 
            if (dateA !== dateB) return dateA.localeCompare(dateB); 
            let timeA = a.currentDisplayTime || "", timeB = b.currentDisplayTime || ""; 
            if (!timeA) return -1; if (!timeB) return 1; return timeA.localeCompare(timeB); 
        }; 
        const creationSort = (a, b) => b.createdAt - a.createdAt; 
        if (sortMode === 'chrono') { standardTasks.sort(chronoSort); completedTodayTasks.sort(chronoSort); } 
        else { standardTasks.sort(creationSort); completedTodayTasks.sort(creationSort); } 
        imminentTasks.sort((a,b) => a.minutesLeft - b.minutesLeft); filteredList = [...imminentTasks, ...standardTasks, ...completedTodayTasks]; 
    } 
    
    if(filteredList.length === 0) { c.innerHTML = `<p style="text-align:center; opacity:0.4; font-style:italic; margin-top:30px;">${taskSubView==='active'?'Aucune tâche active !':'Aucune archive ne correspond'}</p>`; return; } 
    let separatorDrawn = false; let lastDateRendered = null;
    filteredList.forEach(t => { 
        if (t.completed && taskSubView === "active" && !separatorDrawn) { const separator = document.createElement('div'); separator.className = 'task-section-separator'; separator.innerHTML = '<span>Tâches terminées</span>'; c.appendChild(separator); separatorDrawn = true; lastDateRendered = null; } 
        let ghosts = Array.isArray(t.duplicateDays) ? t.duplicateDays : []; const isMultiDate = (!t.completed && ghosts.length > 0); const displayDateStr = t.currentDisplayDate || t.date, displayTimeStr = t.currentDisplayTime || t.time || "", displayDateFR = displayDateStr ? displayDateStr.split('-').reverse().join('/') : ''; 
        if (isChronoSort && displayDateStr !== lastDateRendered) { if (!t.completed || taskSubView === "archive") { const dateSep = document.createElement('div'); let dateLabel = displayDateStr === todayStr ? `Aujourd'hui (${displayDateFR})` : displayDateFR; dateSep.innerHTML = `<div style="text-align: center; margin: 18px 0 8px 0; font-size: 0.85rem; font-weight: bold; color: var(--primary); opacity: 0.7; letter-spacing: 1px;">— ${dateLabel} —</div>`; c.appendChild(dateSep); lastDateRendered = displayDateStr; } }
        let descHtml = t.desc ? `<div class="task-desc-text" style="flex:1; min-width:0; font-size: 0.85rem; opacity: 0.7; font-style: italic; white-space: pre-wrap; line-height: 1.3; margin-left: 10px; padding-left: 10px; border-left: 1px dashed rgba(128,128,128,0.3); display: flex; align-items: center; word-break: break-word; overflow-wrap: anywhere;">${t.desc}</div>` : ''; let ghostHtml = isMultiDate ? `<span onclick="event.stopPropagation(); openGhostModal('${t.id}')" style="display:inline-block; margin-top:8px; font-size:0.75rem; color:var(--primary); background:rgba(0,206,209,0.1); padding:4px 10px; border-radius:12px; cursor:pointer; font-weight:bold;">🗓️ + ${ghosts.length} date(s) prévue(s)</span>` : ""; const d = document.createElement('div'); 
        if (t.completed) { d.className = `task-card completed-bubble`; d.innerHTML = `<div style="flex:1; display:flex; align-items:center; min-width:0;" onclick="toggleTaskCheck('${t.id}', ${t.completed}, '${displayDateStr}')"><div style="flex:1; min-width:0; padding-right:8px;"><span class="badge-finished">✨ Fini !</span><br><strong style="text-decoration:line-through; opacity:0.5; display:block; word-break: break-word; overflow-wrap: anywhere;">${t.name}</strong><small style="display:block; opacity:0.5; margin-top:2px;">📅 ${displayDateFR} ${displayTimeStr ? '⏰ ' + displayTimeStr : ''}</small></div>${t.desc ? `<div class="task-desc-text" style="flex:1; min-width:0; font-size: 0.85rem; opacity: 0.4; font-style: italic; margin-left: 10px; padding-left: 10px; border-left: 1px dashed rgba(128,128,128,0.2); display: flex; align-items: center; text-decoration:line-through; word-break: break-word; overflow-wrap: anywhere;">${t.desc}</div>` : ''}</div><div class="task-actions" style="flex-shrink:0;"><button onclick="deleteTask('${t.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button></div>`; } 
        else { d.className = `${isMultiDate ? 'task-card stacked-task' : 'task-card'} ${t.importance} ${t.isImminent ? 'is-imminent' : ''}`; let remindersText = "Aucun"; if(t.reminders && t.reminders.length > 0) remindersText = t.reminders.map(r => `${r} min avant`).join(', '); d.innerHTML = `<div style="flex:1; display:flex; align-items:center; min-width:0;" onclick="toggleTaskCheck('${t.id}', ${t.completed}, '${displayDateStr}')"><div style="flex:${t.desc ? '1' : 'auto'}; min-width:0; padding-right:8px;"><strong style="${t.completed ? 'text-decoration:line-through; opacity:0.5;' : ''} display:block; word-break: break-word; overflow-wrap: anywhere;">${t.name}</strong><small style="display:block; margin-top:2px;">📅 ${displayDateFR} ${displayTimeStr ? '⏰ ' + displayTimeStr : ''}</small>${t.isImminent ? `<small class="time-alert" style="display:block; margin-top:2px;">⚠️ ÉCHÉANCE PROCHE : Reste ${t.minutesLeft} min !</small>` : `<small style="color:var(--primary-dark); display:block; margin-top:2px;">🔔 Rappels : ${remindersText}</small>`}${ghostHtml}</div>${descHtml}</div><div class="task-actions" style="flex-shrink:0;">${taskSubView === 'active' ? `<button onclick="duplicateTask('${t.id}')" style="background:none; border:none; color:var(--primary); font-size:1.2rem; cursor:pointer; margin-right:5px;">📑</button>` : ''}${taskSubView === 'active' ? `<button onclick="editTask('${t.id}')" style="background:none; border:none; color:var(--primary); font-size:1.3rem; cursor:pointer;">✎</button>` : ''}<button onclick="deleteTask('${t.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button></div>`; } c.appendChild(d); 
    }); 
}

function toggleTaskCheck(id, currentStatus, specificDate) { const task = tasks.find(t => t.id === id); if(!task) return; if(!currentStatus) { let isMultiDate = (task.duplicateDays && task.duplicateDays.length > 0); if (isMultiDate && specificDate) { let allDates = [task.date, ...task.duplicateDays].sort(); let remainingDates = allDates.filter(d => typeof d === 'string' ? d !== specificDate : d.date !== specificDate); if (remainingDates.length > 0) { db.collection("tasks").add({ name: task.name, desc: task.desc || "", date: specificDate, time: task.time || "", reminders: task.reminders || [], importance: task.importance, completed: true, completedAtStr: todayStr, userId: task.userId, createdAt: task.createdAt || Date.now(), duplicateDays: [] }); let nextMainDate = remainingDates.shift(); db.collection("tasks").doc(id).update({ date: nextMainDate.date || nextMainDate, time: nextMainDate.time || task.time || "", duplicateDays: remainingDates }); showToast("Instance terminée et archivée ! ✨"); return; } } db.collection("tasks").doc(id).update({ completed: true, completedAtStr: todayStr }); } else { db.collection("tasks").doc(id).update({ completed: false, completedAtStr: firebase.firestore.FieldValue.delete() }); } }
function toggleTodo(id, currentStatus) { db.collection("dailyTodo").doc(id).update({ completed: !currentStatus }); } function toggleWeeklyTodo(id, currentStatus) { db.collection("weeklyTodo").doc(id).update({ completed: !currentStatus }); } function toggleRoutineTodo(id, currentStatus) { db.collection("routineTodo").doc(id).update({ completed: !currentStatus }); }
function deleteTask(id) { db.collection("tasks").doc(id).delete().then(() => { showToast("Tâche supprimée ! 🗑️"); }); } function deleteWeeklyTodo(id) { db.collection("weeklyTodo").doc(id).delete().then(() => showToast("Supprimé !")); } function deleteDailyTodo(id) { db.collection("dailyTodo").doc(id).delete().then(() => showToast("Supprimé !")); } function deleteRoutineTodo(id) { db.collection("routineTodo").doc(id).delete().then(() => showToast("Supprimé de la semaine type !")); }

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
            let items = dailyTodo.filter(it => it.date === todayStr && parseInt(it.time.split(':')[0]) === h), weeklyItems = weeklyTodo.filter(it => parseInt(it.dayOfWeek) === currentDayOfWeek && parseInt(it.time.split(':')[0]) === h), routineItems = routineTodo.filter(it => parseInt(it.dayOfWeek) === currentDayOfWeek && parseInt(it.time.split(':')[0]) === h); 
            let combinedItems = [...items, ...weeklyItems, ...routineItems]; combinedItems.sort((a,b) => (a.time||"").localeCompare(b.time||"")); 
            const hourCard = document.createElement('div'); hourCard.className = 'weekly-day-card'; hourCard.innerHTML = `<div class="weekly-day-header"><span class="weekly-day-title">${currentHourStr}</span><button onclick="openTodoModal('${h.toString().padStart(2,'0')}:00', false, 0, false)" class="weekly-add-btn">+</button></div><div class="weekly-subtasks">${combinedItems.map(it => { const isWeekly = it.hasOwnProperty('dayOfWeek') && !it.hasOwnProperty('isRoutine'), isRoutine = it.hasOwnProperty('isRoutine'); let checkFunc = `toggleTodo('${it.id}', ${it.completed})`, delFunc = `deleteDailyTodo('${it.id}')`, labelSuffix = ''; if (isWeekly) { checkFunc = `toggleWeeklyTodo('${it.id}', ${it.completed})`; delFunc = `deleteWeeklyTodo('${it.id}')`; labelSuffix = ' <small style="opacity:0.5;">(Hebdo)</small>'; } else if (isRoutine) { checkFunc = `toggleRoutineTodo('${it.id}', ${it.completed})`; delFunc = `deleteRoutineTodo('${it.id}')`; labelSuffix = ' <small style="opacity:0.5; color:var(--primary-dark);">(Type ⚙️)</small>'; } return `<div class="weekly-item"><span onclick="event.stopPropagation(); ${checkFunc}" style="cursor:pointer;" class="weekly-item-text ${it.completed ? 'todo-completed' : ''}"><b>${it.time}</b> : ${it.name}${labelSuffix}</span><div class="weekly-item-actions"><button onclick="editTodoItem('${it.id}', '${it.name}', '${it.time}', ${(isWeekly || isRoutine)}, ${(isWeekly || isRoutine) ? it.dayOfWeek : 0}, ${isRoutine})" style="color:var(--primary);">✎</button><button onclick="${delFunc}" style="color:var(--danger);">×</button></div></div>`; }).join('') || '<span class="empty-subtasks-msg">Aucun événement</span>'}</div>`; wc.appendChild(hourCard); 
        } 
    } else if (todoMode === 'weekly' || todoMode === 'routine') { 
        document.getElementById('todo-today-date').innerText = todoMode === 'weekly' ? "Planification Hebdomadaire" : "Configuration de la Semaine Type ⚙️"; 
        c.innerHTML = '<div class="weekly-container"></div>'; const wc = c.querySelector('.weekly-container'); const presidentialOrder = [1, 2, 3, 4, 5, 6, 0]; 
        presidentialOrder.forEach(dayNum => { 
            let dayTasks = todoMode === 'weekly' ? [...weeklyTodo.filter(it => parseInt(it.dayOfWeek) === dayNum), ...routineTodo.filter(it => parseInt(it.dayOfWeek) === dayNum)] : routineTodo.filter(it => parseInt(it.dayOfWeek) === dayNum); 
            dayTasks.sort((a,b) => (a.time||"").localeCompare(b.time||"")); 
            const dayCard = document.createElement('div'); dayCard.className = 'weekly-day-card'; 
            dayCard.innerHTML = `<div class="weekly-day-header"><span class="weekly-day-title">${dayNamesFr[dayNum]}</span><button onclick="openTodoModal('12:00', true, ${dayNum}, ${todoMode==='routine'})" class="weekly-add-btn">+</button></div><div class="weekly-subtasks">${dayTasks.map(it => { const isRoutine = it.hasOwnProperty('isRoutine') || routineTodo.some(r => r.id === it.id); return `<div class="weekly-item"><span class="weekly-item-text ${it.completed ? 'todo-completed' : ''}"><b>${it.time}</b> : ${it.name} ${isRoutine ? '<small style="opacity:0.5; color:var(--primary-dark);">(Type ⚙️)</small>':''}</span><div class="weekly-item-actions"><button onclick="editTodoItem('${it.id}', '${it.name}', '${it.time}', true, ${dayNum}, ${isRoutine})" style="color:var(--primary);">✎</button><button onclick="${isRoutine?'deleteRoutineTodo':'deleteWeeklyTodo' }('${it.id}')" style="color:var(--danger);">×</button></div></div>`; }).join('') || '<span class="empty-subtasks-msg">Aucune tâche</span>'}</div>`; wc.appendChild(dayCard); 
        }); 
    } 
}

function processMidnightAutoArchive() {
    if(isArchiving || !currentUser) return; isArchiving = true;
    const today = new Date().toISOString().split('T')[0]; let operations = [];
    tasks.forEach(t => { 
        if (t.completed) return; 
        let ghosts = Array.isArray(t.duplicateDays) ? t.duplicateDays : []; 
        ghosts = ghosts.map(g => typeof g === 'string' ? {date: g, time: t.time} : g); 
        if (ghosts.length > 0) { 
            let allOccurrences = [{date: t.date, time: t.time || ""}, ...ghosts]; 
            allOccurrences.sort((a, b) => (a.date || "").localeCompare(b.date || "") !== 0 ? (a.date || "").localeCompare(b.date || "") : (a.time || "").localeCompare(b.time || "")); 
            let pastDates = allOccurrences.filter(o => o.date < today); let remainingDates = allOccurrences.filter(o => o.date >= today); 
            if (pastDates.length > 0) { 
                pastDates.forEach(pastOcc => { operations.push(db.collection("tasks").add({ name: t.name, desc: t.desc || "", date: pastOcc.date, time: pastOcc.time, reminders: t.reminders || [], importance: t.importance, completed: true, completedAtStr: pastOcc.date, userId: t.userId, createdAt: t.createdAt || Date.now(), duplicateDays: [] })); }); 
                if (remainingDates.length > 0) { let nextMain = remainingDates.shift(); operations.push(db.collection("tasks").doc(t.id).update({ date: nextMain.date, time: nextMain.time, duplicateDays: remainingDates })); } 
                else { operations.push(db.collection("tasks").doc(t.id).delete()); } 
            } 
        } else { if (t.date && t.date < today) operations.push(db.collection("tasks").doc(t.id).update({ completed: true, completedAtStr: t.date })); } 
    });
    Promise.all(operations).then(() => { isArchiving = false; }).catch(() => { isArchiving = false; });
}

function runNotificationEngine() {
    const now = new Date(); todayStr = now.toISOString().split('T')[0];
    if (todayStr !== lastCheckedDayStr) { lastCheckedDayStr = todayStr; processMidnightAutoArchive(); }
    const hour = now.getHours(), minute = now.getMinutes(), dayOfWeek = now.getDay(); 
    let todayMD = todayStr.substring(5), tomorrow = new Date(); tomorrow.setDate(now.getDate() + 1); let tomorrowMD = tomorrow.toISOString().split('T')[0].substring(5);
    if (hour === 9 && minute === 0) { 
        let todayBirthdays = birthdays.filter(b => (b.date||"").endsWith(todayMD)); todayBirthdays.forEach(b => { sendNotification("🎂 Joyeux Anniversaire !", `C'est l'anniversaire de ${b.name} aujourd'hui !`); }); 
    }
    tasks.forEach(t => { 
        if (t.completed) return; let displayDate = t.date, displayTime = t.time; 
        if (t.duplicateDays && t.duplicateDays.length > 0) { 
            let allOcc = [{date: t.date, time: t.time || ""}]; t.duplicateDays.forEach(g => { if (typeof g === 'string') allOcc.push({date: g, time: t.time || ""}); else allOcc.push(g); }); 
            allOcc.sort((a,b) => (a.date||"").localeCompare(b.date||"") !== 0 ? (a.date||"").localeCompare(b.date||"") : (a.time||"").localeCompare(b.time||"")); 
            let futureOcc = allOcc.filter(o => o.date >= todayStr); let currentOcc = futureOcc.length > 0 ? futureOcc[0] : allOcc[allOcc.length - 1]; 
            displayDate = currentOcc.date; displayTime = currentOcc.time; 
        } 
        if (displayDate === todayStr && displayTime) { 
            const [tHour, tMin] = displayTime.split(':').map(Number); const taskTimeObj = new Date(); taskTimeObj.setHours(tHour, tMin, 0, 0); 
            if ((now - taskTimeObj) / 60000 >= 30) { toggleTaskCheck(t.id, false, displayDate); } 
        } 
    });
    if(document.getElementById('tasks-page').style.display === 'block') { renderTasks(); }
}
setInterval(runNotificationEngine, 30000);

function requestNotificationPermission() { try { if ("Notification" in window && Notification.permission !== "granted") { Notification.requestPermission(); } } catch(e){} }
function sendNotification(title, body) { if ("Notification" in window && Notification.permission === "granted") { new Notification(title, { body: body }); } }

// --- ACTIONS CLICKS TÂCHES ---
let btnSaveTask = document.getElementById('save-task'); if (btnSaveTask) { btnSaveTask.onclick = () => { const n = document.getElementById('task-name').value.trim(), dStr = document.getElementById('task-desc').value.trim(), singleDate = document.getElementById('task-date').value, time = getCustomTime('task-time'), imp = document.getElementById('task-importance').value, reminders = getSelectedRemindersFromBadges(); if(n && currentUser) { if(document.getElementById('modal-title').innerText === "Dupliquer la tâche" && editingId) { const task = tasks.find(t => t.id === editingId); if (task && singleDate) { let allOccurrences = [{date: task.date, time: task.time || ""}], currentGhosts = Array.isArray(task.duplicateDays) ? task.duplicateDays : []; currentGhosts.forEach(g => { allOccurrences.push(typeof g === 'string' ? {date: g, time: task.time} : g); }); allOccurrences.push({date: singleDate, time: time}); allOccurrences.sort((a, b) => (a.date||"").localeCompare(b.date||"") !== 0 ? (a.date||"").localeCompare(b.date||"") : (a.time || "").localeCompare(b.time || "")); let nextMain = allOccurrences.shift(); db.collection("tasks").doc(editingId).update({ date: nextMain.date, time: nextMain.time || "", desc: task.desc || "", duplicateDays: allOccurrences }); editingId = null; showToast("Date planifiée ! 🗓️"); } } else if(editingId && singleDate) { db.collection("tasks").doc(editingId).update({ name: n, desc: dStr, date: singleDate, time: time, reminders: reminders, importance: imp }); editingId = null; showToast("Tâche modifiée ! ✎"); } else if (singleDate) { db.collection("tasks").add({ name: n, desc: dStr, date: singleDate, time: time, reminders: reminders, importance: imp, completed: false, userId: currentUser.uid, createdAt: Date.now(), duplicateDays: [] }); showToast("Tâche enregistrée ! ✨"); } unlockModalFields(); document.getElementById('task-modal').style.display = 'none'; } }; }
let btnSaveTodo = document.getElementById('save-todo'); if (btnSaveTodo) { btnSaveTodo.onclick = () => { const n = document.getElementById('todo-task-name').value.trim(), t = getCustomTime('todo-time'), isWeekly = document.getElementById('save-todo').getAttribute('data-weekly-mode') === 'true', isRoutine = document.getElementById('save-todo').getAttribute('data-routine-mode') === 'true'; if(n && t && currentUser) { let targetCollection = isRoutine ? "routineTodo" : (isWeekly ? "weeklyTodo" : "dailyTodo"); if(editingTodoId) { let updateData = { name: n, time: t }; if(isWeekly || isRoutine) updateData.dayOfWeek = document.getElementById('todo-day-select').value; db.collection(targetCollection).doc(editingTodoId).update(updateData); editingTodoId = null; } else { if(isRoutine) { db.collection("routineTodo").add({ name: n, time: t, dayOfWeek: document.getElementById('todo-day-select').value, completed: false, isRoutine: true, userId: currentUser.uid }); } else if(isWeekly) { db.collection("weeklyTodo").add({ name: n, time: t, dayOfWeek: document.getElementById('todo-day-select').value, completed: false, userId: currentUser.uid }); } else { db.collection("dailyTodo").add({ name: n, time: t, date: todayStr, completed: false, userId: currentUser.uid }); } } document.getElementById('todo-modal').style.display = 'none'; } }; }
