function showPage(p) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(`${p}-page`); if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-bubble').forEach(btn => btn.classList.remove('active'));
    const currentNavBtn = document.getElementById(`nav-btn-${p}`); if (currentNavBtn) currentNavBtn.classList.add('active');
    
    if(p === 'calendar' && typeof renderCalendar === 'function') renderCalendar(); 
    if(p === 'todo' && typeof renderTodo === 'function') renderTodo(); 
    if(p === 'tasks' && typeof renderTasks === 'function') renderTasks();
    if(p === 'shopping') { 
        if(typeof renderShoppingCategories === 'function') renderShoppingCategories(); 
        if(typeof renderShoppingTabs === 'function') renderShoppingTabs(); 
        if(typeof syncCurrentShoppingItems === 'function') syncCurrentShoppingItems(); 
    }
}

function switchTaskSubView(view) {
    taskSubView = view; document.querySelectorAll('.sub-menu-tab').forEach(b => b.classList.remove('active'));
    const actionBar = document.getElementById('tasks-action-bar'), archiveSearch = document.getElementById('archive-search-bar');
    if(view === 'active') { document.getElementById('sub-btn-active-tasks').classList.add('active'); if(actionBar) actionBar.style.display = 'flex'; if(archiveSearch) archiveSearch.style.display = 'none'; } 
    else { document.getElementById('sub-btn-archived-tasks').classList.add('active'); if(actionBar) actionBar.style.display = 'none'; if(archiveSearch) archiveSearch.style.display = 'flex'; }
    if(typeof renderTasks === 'function') renderTasks();
}

function changeTheme(t) { document.body.className = `theme-${t}`; localStorage.setItem('listme_theme', t); }
