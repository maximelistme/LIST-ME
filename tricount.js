// tricount.js

let tricountGroups = [];
let tricountExpensesMap = {};
let unsubTricountGroups = null;
let unsubTricountExpensesMap = {};
let tricountMembersList = [];
let tricountMembersUids = {};
let tricountSettlements = {}; // groupId -> settlements[]
let unsubSettlementsMap = {};
let _tricountActiveGroupId = null;

// ---- INIT ----
function initTricount() {
    if (!currentUser) return;
    if (unsubTricountGroups) unsubTricountGroups();
    unsubTricountGroups = db.collection("tricountGroups")
        .where("members", "array-contains", currentUser.uid)
        .onSnapshot(snap => {
            tricountGroups = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            tricountGroups.forEach(g => { subscribeGroupExpenses(g); subscribeGroupSettlements(g); });
            renderTricountList();
            if (_tricountActiveGroupId) renderTricountDetail(_tricountActiveGroupId);
        }, err => showToast("Erreur Tricount : " + err.message));

    // Notifications pour ce membre
    db.collection("tricountNotifs")
        .where("toUid", "==", currentUser.uid)
        .where("read", "==", false)
        .get().then(snap => {
            snap.docs.forEach(doc => {
                const n = doc.data();
                showToast(n.message);
                doc.ref.update({ read: true });
            });
        });
}

function subscribeGroupSettlements(group) {
    if (unsubSettlementsMap[group.id]) return;
    unsubSettlementsMap[group.id] = db.collection("tricountSettlements")
        .where("groupId", "==", group.id)
        .onSnapshot(snap => {
            tricountSettlements[group.id] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (_tricountActiveGroupId === group.id) renderTricountDetail(group.id);
        }, () => { tricountSettlements[group.id] = []; });
}

function subscribeGroupExpenses(group) {
    if (unsubTricountExpensesMap[group.id]) return;
    unsubTricountExpensesMap[group.id] = db.collection("tricountExpenses")
        .where("groupId", "==", group.id)
        .onSnapshot(snap => {
            tricountExpensesMap[group.id] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            tricountExpensesMap[group.id].sort((a, b) => b.createdAt - a.createdAt);
            renderTricountList();
            if (_tricountActiveGroupId === group.id) renderTricountDetail(group.id);
        }, () => { tricountExpensesMap[group.id] = []; });
}

let _tricountShowArchived = false;

// ---- VUE LISTE ----
function renderTricountList() {
    const list = document.getElementById('tricount-groups-list');
    const archivedList = document.getElementById('tricount-archived-list');
    const archiveBtn = document.getElementById('tricount-archive-toggle-btn');
    if (!list) return;

    const active = tricountGroups.filter(g => !g.archived);
    const archived = tricountGroups.filter(g => g.archived);

    if (active.length === 0) {
        list.innerHTML = `<p style="text-align:center; opacity:0.45; font-style:italic; margin-top:40px;">Aucun groupe.<br>Crée ton premier groupe !</p>`;
    } else {
        list.innerHTML = active.map(g => renderGroupCard(g, false)).join('');
    }

    if (archived.length > 0) {
        archiveBtn.style.display = 'block';
        archiveBtn.textContent = _tricountShowArchived ? '📦 Masquer les archivés' : `📦 Voir les groupes archivés (${archived.length})`;
        archivedList.innerHTML = archived.map(g => renderGroupCard(g, true)).join('');
    } else {
        archiveBtn.style.display = 'none';
        archivedList.style.display = 'none';
    }
}

function renderGroupCard(g, isArchived) {
    const expenses = tricountExpensesMap[g.id] || [];
    const cur = g.currency || '€';
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const members = g.memberNames || [];
    const dateRange = (g.dateStart && g.dateEnd) ? `<br>📅 ${g.dateStart} → ${g.dateEnd}` : '';
    const archivedStyle = isArchived ? 'opacity:0.6;' : '';
    const isCreator = g.userId === currentUser?.uid;
    const adminBtns = isCreator ? `
        <div style="display:flex; flex-direction:column; gap:5px; flex-shrink:0;">
            <button onclick="event.stopPropagation(); archiveTricountGroupById('${g.id}', ${isArchived})" title="${isArchived ? 'Désarchiver' : 'Archiver'}" style="background:rgba(128,128,128,0.12); border:none; border-radius:10px; padding:5px 8px; cursor:pointer; font-size:0.85rem;">${isArchived ? '📂' : '📦'}</button>
            <button onclick="event.stopPropagation(); deleteTricountGroupById('${g.id}')" title="Supprimer" style="background:rgba(231,76,60,0.1); border:none; border-radius:10px; padding:5px 8px; cursor:pointer; font-size:0.85rem;">🗑️</button>
        </div>` : '';
    return `
    <div style="${archivedStyle}background:var(--card-bg); border-radius:18px; padding:14px 18px; margin-bottom:12px; border:1px solid rgba(128,128,128,0.15); display:flex; align-items:center; justify-content:space-between; gap:10px; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <div onclick="openTricountGroup('${g.id}')" style="flex:1; min-width:0; cursor:pointer;">
            <div style="font-family:'Mogra',cursive; font-weight:normal; font-size:1rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${isArchived ? '📦 ' : ''}${g.name}${isCreator ? '' : ' <span style="font-size:0.65rem; opacity:0.45;">membre</span>'}</div>
            <div style="font-size:0.78rem; opacity:0.5; margin-top:3px;">👥 ${members.length} · 🔑 ${g.code || '—'} · <span style="color:var(--primary-dark);">${total.toFixed(2)} ${cur}</span> · ${expenses.length} dép.${dateRange}</div>
        </div>
        ${adminBtns}
    </div>`;
}

function toggleTricountArchived() {
    _tricountShowArchived = !_tricountShowArchived;
    const archivedList = document.getElementById('tricount-archived-list');
    archivedList.style.display = _tricountShowArchived ? 'block' : 'none';
    renderTricountList();
}

// ---- OUVRIR DÉTAIL ----
function openTricountGroup(groupId) {
    _tricountActiveGroupId = groupId;
    document.getElementById('tricount-home').style.display = 'none';
    document.getElementById('tricount-detail').style.display = 'block';
    // S'assurer que la subscription settlements est active
    const g = tricountGroups.find(x => x.id === groupId);
    if (g) subscribeGroupSettlements(g);
    renderTricountDetail(groupId);
}

function closeTricountGroup() {
    _tricountActiveGroupId = null;
    document.getElementById('tricount-detail').style.display = 'none';
    document.getElementById('tricount-home').style.display = 'block';
}

// ---- VUE DÉTAIL ----
function renderTricountDetail(groupId) {
    const g = tricountGroups.find(x => x.id === groupId);
    if (!g) return;

    const expenses = tricountExpensesMap[groupId] || [];
    const cur = g.currency || '€';
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const members = g.memberNames || [];

    // Bouton archiver dynamique
    const archiveBtn = document.querySelector('[onclick="archiveTricountGroup()"]');
    if (archiveBtn) archiveBtn.title = g.archived ? 'Désarchiver' : 'Archiver';
    if (archiveBtn) archiveBtn.textContent = g.archived ? '📂' : '📦';

    // Bandeau
    document.getElementById('tricount-banner-name').textContent = g.name;
    document.getElementById('tricount-banner-members').textContent = `👥 ${members.length} participant(s)`;
    document.getElementById('tricount-banner-code').textContent = `🔑 ${g.code || '—'}`;
    document.getElementById('tricount-banner-total').textContent = `Total : ${total.toFixed(2)} ${cur}`;
    const dateEl = document.getElementById('tricount-banner-dates');
    if (dateEl) dateEl.textContent = (g.dateStart && g.dateEnd) ? `📅 ${g.dateStart} → ${g.dateEnd}` : '';
    if (dateEl) dateEl.style.display = (g.dateStart && g.dateEnd) ? 'inline-block' : 'none';
    const sel = document.getElementById('tricount-currency-select');
    if (sel) sel.value = cur;

    // Soldes
    const balances = {};
    members.forEach(m => balances[m] = 0);
    expenses.forEach(e => {
        balances[e.paidByName] = (balances[e.paidByName] || 0) + e.amount;
        const among = e.splitAmong || members;
        if (e.splitAmounts) {
            among.forEach(m => { balances[m] = (balances[m] || 0) - (e.splitAmounts[m] || 0); });
        } else if (e.splitPercentages) {
            among.forEach(m => { balances[m] = (balances[m] || 0) - (e.amount * (e.splitPercentages[m] || 0) / 100); });
        } else {
            const share = e.amount / among.length;
            among.forEach(m => { balances[m] = (balances[m] || 0) - share; });
        }
    });
    // Appliquer les remboursements
    (tricountSettlements[groupId] || []).forEach(s => {
        balances[s.from] = (balances[s.from] || 0) + s.amount;
        balances[s.to]   = (balances[s.to]   || 0) - s.amount;
    });

    // Dépenses par participant
    const depenses = {};
    members.forEach(m => depenses[m] = 0);
    expenses.forEach(e => { depenses[e.paidByName] = (depenses[e.paidByName] || 0) + e.amount; });

    // Graphiques
    if (expenses.length > 0) {
        document.getElementById('tricount-charts-section').style.display = 'block';
        setTimeout(() => {
            drawTricountChart('tricount-chart-depenses', members, members.map(m => depenses[m] || 0), cur, false);
        }, 120);
    } else {
        document.getElementById('tricount-charts-section').style.display = 'none';
    }

    // Boutons remboursements
    const remboursSection = document.getElementById('tricount-remboursements-section');
    const remboursbtns = document.getElementById('tricount-remboursements-btns');
    const transactions = simplifyDebts(balances);
    // Regrouper par débiteur
    const debtorMap = {};
    transactions.forEach(t => {
        if (!debtorMap[t.from]) debtorMap[t.from] = [];
        debtorMap[t.from].push(t);
    });
    const debtors = Object.keys(debtorMap);
    if (remboursSection && remboursbtns) {
        if (debtors.length > 0) {
            remboursSection.style.display = 'block';
            remboursbtns.innerHTML = debtors.map(name => `
                <button onclick="openTricountRembours('${groupId}', '${name}')"
                    style="background:linear-gradient(135deg,var(--primary),var(--primary-dark)); border:none; color:white; border-radius:20px; padding:8px 16px; font-size:0.85rem; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.2);">
                    💸 ${name}
                </button>`).join('');
        } else {
            remboursSection.style.display = 'none';
        }
    }

    // Soldes "qui doit à qui" — calculés SUR les balances déjà nettes (avec settlements)
    const soldesEl = document.getElementById('tricount-soldes-list');
    if (soldesEl) {
        if (transactions.length === 0) {
            soldesEl.innerHTML = `<div style="text-align:center; opacity:0.4; font-style:italic; font-size:0.82rem;">Tout le monde est à l'équilibre ✅</div>`;
        } else {
            soldesEl.innerHTML = transactions.map(t => `
                <div onclick="openTricountDebtDetail('${t.from}','${t.to}','${groupId}')"
                    style="display:flex; align-items:center; justify-content:space-between; font-size:0.85rem; padding:9px 8px; border-radius:10px; cursor:pointer; transition:background .15s;"
                    onmouseover="this.style.background='rgba(128,128,128,0.08)'" onmouseout="this.style.background='none'">
                    <span>
                        <span style="color:var(--danger); font-weight:bold;">${t.from}</span>
                        <span style="opacity:0.5;"> → </span>
                        <span style="color:#2ecc71; font-weight:bold;">${t.to}</span>
                        <span style="font-size:0.7rem; opacity:0.4; margin-left:6px;">▶ détail</span>
                    </span>
                    <span style="color:var(--primary-dark); font-family:'Mogra',cursive; font-weight:normal; white-space:nowrap;">${t.amount.toFixed(2)} ${cur}</span>
                </div>`).join('');
        }
    }

    // Filtre participants
    const filterMember = document.getElementById('tricount-filter-member');
    if (filterMember) {
        const currentVal = filterMember.value;
        filterMember.innerHTML = `<option value="">Tous les participants</option>` +
            members.map(m => `<option value="${m}" ${currentVal === m ? 'selected' : ''}>${m}</option>`).join('');
    }

    renderTricountHistory();
}

function renderTricountHistory() {
    const groupId = _tricountActiveGroupId;
    if (!groupId) return;
    const g = tricountGroups.find(x => x.id === groupId);
    if (!g) return;
    const cur = g.currency || '€';
    let expenses = [...(tricountExpensesMap[groupId] || [])];

    const filterMember = document.getElementById('tricount-filter-member')?.value || '';
    const sortVal = document.getElementById('tricount-filter-sort')?.value || 'date-desc';

    if (filterMember) expenses = expenses.filter(e => e.paidByName === filterMember);

    expenses.sort((a, b) => {
        if (sortVal === 'date-desc') return (b.expenseDate || b.createdAt) > (a.expenseDate || a.createdAt) ? 1 : -1;
        if (sortVal === 'date-asc')  return (a.expenseDate || a.createdAt) > (b.expenseDate || b.createdAt) ? 1 : -1;
        if (sortVal === 'amount-desc') return b.amount - a.amount;
        if (sortVal === 'amount-asc')  return a.amount - b.amount;
        return 0;
    });

    const histoEl = document.getElementById('tricount-expenses-list');
    if (!histoEl) return;
    histoEl.innerHTML = expenses.length === 0
        ? `<p style="text-align:center; opacity:0.4; font-style:italic; font-size:0.85rem;">Aucune dépense</p>`
        : expenses.map(e => {
            const dateLabel = e.expenseDate ? ` · ${e.expenseDate}` : '';
            const splitCount = (e.splitAmong || []).length;
            return `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:10px 14px; background:var(--card-bg); border-radius:12px; border:1px solid rgba(128,128,128,0.15); margin-bottom:8px;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:0.9rem; font-weight:bold;">${e.description}</div>
                    <div style="font-size:0.75rem; opacity:0.5;">Payé par ${e.paidByName}${dateLabel} · ${splitCount} participant(s)</div>
                </div>
                <div style="text-align:right; flex-shrink:0; margin-left:10px;">
                    <div style="color:var(--primary-dark); font-family:'Mogra',cursive; font-weight:normal;">${e.amount.toFixed(2)} ${cur}</div>
                    <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:3px;">
                        <button onclick="openEditTricountExpense('${e.id}')" style="background:none; border:none; color:var(--primary-dark); font-size:0.72rem; cursor:pointer; padding:0;">✏️ Modifier</button>
                        <button onclick="deleteTricountExpense('${e.id}')" style="background:none; border:none; color:var(--danger); font-size:0.72rem; cursor:pointer; padding:0;">Supprimer</button>
                    </div>
                </div>
            </div>`;
        }).join('');
}

// ---- CALCUL DETTES SIMPLIFIÉES ----
function simplifyDebts(balances) {
    const creditors = [], debtors = [];
    Object.entries(balances).forEach(([name, bal]) => {
        const b = Math.round(bal * 100) / 100;
        if (b > 0.01) creditors.push({ name, amount: b });
        else if (b < -0.01) debtors.push({ name, amount: -b });
    });
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
        const amount = Math.min(creditors[i].amount, debtors[j].amount);
        transactions.push({ from: debtors[j].name, to: creditors[i].name, amount: Math.round(amount * 100) / 100 });
        creditors[i].amount -= amount;
        debtors[j].amount -= amount;
        if (creditors[i].amount < 0.01) i++;
        if (debtors[j].amount < 0.01) j++;
    }
    return transactions;
}

// ---- GRAPHIQUES ----
const CHART_COLORS = [
    'rgba(0,206,209,0.8)', 'rgba(155,89,182,0.8)', 'rgba(52,152,219,0.8)',
    'rgba(230,126,34,0.8)', 'rgba(46,204,113,0.8)', 'rgba(231,76,60,0.8)'
];

function drawTricountChart(canvasId, labels, data, cur, isBalance) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const key = `_chart_${canvasId}`;
    if (window[key]) window[key].destroy();
    window[key] = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: isBalance
                    ? data.map(v => v >= 0 ? 'rgba(46,204,113,0.75)' : 'rgba(231,76,60,0.75)')
                    : labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                borderRadius: 8,
                barPercentage: 0.45,
                categoryPercentage: 0.6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { callback: v => `${v} ${cur}` } },
                x: { ticks: { font: { size: 11 } } }
            }
        }
    });
}

function drawTricountPie(canvasId, labels, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const key = `_chart_${canvasId}`;
    if (window[key]) window[key].destroy();
    window[key] = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                borderWidth: 2,
                borderColor: 'rgba(0,0,0,0.15)',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { color: 'rgba(200,200,200,0.85)', font: { size: 11 } } }
            }
        }
    });
}

// ---- DEVISE ----
function changeTricountCurrency(val) {
    if (!_tricountActiveGroupId) return;
    db.collection("tricountGroups").doc(_tricountActiveGroupId).update({ currency: val });
}

// ---- MODAL PARTICIPANTS ----
function openTricountMembersModal() {
    const group = tricountGroups.find(g => g.id === _tricountActiveGroupId);
    if (!group) return;
    document.getElementById('tricount-members-modal-list').innerHTML =
        (group.memberNames || []).map(m => `<div style="padding:10px 14px; background:var(--card-bg); border-radius:12px; border:1px solid rgba(128,128,128,0.15);">👤 ${m}</div>`).join('');
    document.getElementById('tricount-members-modal').style.display = 'flex';
}

// ---- ARCHIVER / SUPPRIMER UN GROUPE ----
function _notifyGroupMembers(g, message) {
    const otherMembers = (g.members || []).filter(uid => uid !== currentUser.uid);
    const batch = db.batch();
    otherMembers.forEach(uid => {
        const ref = db.collection("tricountNotifs").doc();
        batch.set(ref, {
            toUid: uid, groupId: g.id, groupName: g.name,
            message, createdAt: Date.now(), read: false
        });
    });
    return batch.commit();
}

function archiveTricountGroupById(id, isArchived) {
    const g = tricountGroups.find(x => x.id === id);
    if (!g) return;
    db.collection("tricountGroups").doc(id).update({ archived: !isArchived }).then(() => {
        const msg = isArchived ? `Le groupe "${g.name}" a été désarchivé.` : `Le groupe "${g.name}" a été archivé par le créateur.`;
        _notifyGroupMembers(g, msg);
        showToast(isArchived ? "Groupe désarchivé ! 📂" : "Groupe archivé ! 📦");
    });
}

let _pendingDeleteGroupId = null;

function deleteTricountGroupById(id) {
    const g = tricountGroups.find(x => x.id === id);
    if (!g) return;
    _pendingDeleteGroupId = id;
    document.getElementById('tricount-delete-name').textContent = `"${g.name}"`;
    document.getElementById('tricount-delete-modal').style.display = 'flex';
}

function confirmDeleteTricountGroup() {
    const id = _pendingDeleteGroupId;
    const g = tricountGroups.find(x => x.id === id);
    if (!id || !g) return;
    document.getElementById('tricount-delete-modal').style.display = 'none';
    _notifyGroupMembers(g, `Le groupe "${g.name}" a été supprimé par le créateur.`).then(() => {
        db.collection("tricountExpenses").where("groupId", "==", id).get().then(snap => {
            const batch = db.batch();
            snap.docs.forEach(d => batch.delete(d.ref));
            batch.delete(db.collection("tricountGroups").doc(id));
            return batch.commit();
        }).then(() => {
            delete unsubTricountExpensesMap[id];
            delete tricountExpensesMap[id];
            _pendingDeleteGroupId = null;
            showToast("Groupe supprimé ! 🗑️");
        });
    }).catch(err => showToast("Erreur : " + err.message));
}

// ---- REJOINDRE UN GROUPE ----
function openTricountJoinModal() {
    document.getElementById('tricount-join-code').value = '';
    document.getElementById('tricount-join-modal').style.display = 'flex';
}

function joinTricountGroup() {
    const code = document.getElementById('tricount-join-code').value.trim().toUpperCase();
    if (!code || code.length !== 6) { showToast("Code invalide ⚠️"); return; }
    if (!currentUser) return;

    db.collection("tricountGroups").where("code", "==", code).get().then(snap => {
        if (snap.empty) { showToast("Aucun groupe trouvé pour ce code ❌"); return; }
        const doc = snap.docs[0];
        const data = doc.data();
        const myName = userNickname || currentUser.email || 'Moi';

        // Vérifier si déjà membre
        if ((data.members || []).includes(currentUser.uid)) {
            showToast("Tu es déjà membre de ce groupe ! 👋"); return;
        }

        // Ajouter l'uid et le nom
        db.collection("tricountGroups").doc(doc.id).update({
            members: firebase.firestore.FieldValue.arrayUnion(currentUser.uid),
            memberNames: firebase.firestore.FieldValue.arrayUnion(myName),
        }).then(() => {
            document.getElementById('tricount-join-modal').style.display = 'none';
            showToast(`Groupe "${data.name}" rejoint ! 🎉`);
        });
    }).catch(err => showToast("Erreur : " + err.message));
}

// ---- CRÉER UN GROUPE ----
function openTricountCreateModal() {
    tricountMembersList = [];
    tricountMembersUids = {};
    document.getElementById('tricount-create-modal').style.display = 'flex';
    document.getElementById('tricount-group-name-input').value = '';
    document.getElementById('tricount-group-date-start').value = '';
    document.getElementById('tricount-group-date-end').value = '';
    document.getElementById('tricount-members-input').value = '';
    document.getElementById('tricount-members-tags').innerHTML = '';
}

function filterTricountFriends() {
    const input = document.getElementById('tricount-members-input').value.trim().toLowerCase();
    const suggestions = document.getElementById('tricount-friends-suggestions');
    if (!input || !friends.length) { suggestions.style.display = 'none'; return; }

    const filtered = friends.filter(f =>
        f.nickname && f.nickname.toLowerCase().startsWith(input) && !tricountMembersList.includes(f.nickname)
    );

    if (filtered.length === 0) { suggestions.style.display = 'none'; return; }

    suggestions.innerHTML = filtered.map(f => `
        <div onclick="selectTricountFriend('${f.nickname}')" style="padding:10px 14px; cursor:pointer; font-size:0.9rem; border-bottom:1px solid rgba(128,128,128,0.1);"
             onmouseover="this.style.background='rgba(0,206,209,0.1)'" onmouseout="this.style.background='none'">
            👤 ${f.nickname}
        </div>
    `).join('');
    suggestions.style.display = 'block';
}

function selectTricountFriend(nickname) {
    // Stocker l'uid de cet ami pour l'ajouter à members
    const friend = friends.find(f => f.nickname === nickname);
    if (friend && friend.uid) tricountMembersUids[nickname] = friend.uid;
    document.getElementById('tricount-members-input').value = nickname;
    document.getElementById('tricount-friends-suggestions').style.display = 'none';
    addTricountMember();
}

function addTricountMember() {
    const input = document.getElementById('tricount-members-input');
    const name = input.value.trim();
    if (!name || tricountMembersList.includes(name)) { input.value = ''; return; }
    tricountMembersList.push(name);
    input.value = '';
    document.getElementById('tricount-friends-suggestions').style.display = 'none';
    const tags = document.getElementById('tricount-members-tags');
    const tag = document.createElement('div');
    tag.style.cssText = 'display:flex; align-items:center; gap:6px; background:rgba(0,206,209,0.15); color:var(--primary-dark); padding:5px 12px; border-radius:20px; font-size:0.85rem;';
    tag.innerHTML = `${name} <span onclick="removeTricountMember('${name}', this)" style="cursor:pointer; font-size:1rem;">×</span>`;
    tags.appendChild(tag);
    input.focus();
}

function removeTricountMember(name, el) {
    tricountMembersList = tricountMembersList.filter(m => m !== name);
    el.parentElement.remove();
}

function saveTricountGroup() {
    const name = document.getElementById('tricount-group-name-input').value.trim();
    if (!name || !currentUser) { showToast("Nom du groupe requis ⚠️"); return; }
    const memberNames = [userNickname || currentUser.email || 'Moi', ...tricountMembersList];
    const memberUids = [...new Set([currentUser.uid, ...Object.values(tricountMembersUids)])];
    const dateStart = document.getElementById('tricount-group-date-start').value;
    const dateEnd = document.getElementById('tricount-group-date-end').value;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    db.collection("tricountGroups").add({
        name, memberNames, members: memberUids,
        code, currency: '€', dateStart, dateEnd, createdAt: Date.now(), userId: currentUser.uid
    }).then(() => {
        document.getElementById('tricount-create-modal').style.display = 'none';
        showToast("Groupe créé ! 💰");
    }).catch(err => showToast("Erreur : " + err.message));
}

// ---- AJOUTER UNE DÉPENSE ----
function openTricountAddExpense() {
    const group = tricountGroups.find(g => g.id === _tricountActiveGroupId);
    if (!group) return;
    const members = group.memberNames || [];

    document.getElementById('tricount-paid-by').innerHTML = members.map(m => `<option value="${m}">${m}</option>`).join('');
    document.getElementById('tricount-expense-desc').value = '';
    document.getElementById('tricount-expense-amount').value = '';
    document.getElementById('tricount-expense-date').value = new Date().toISOString().split('T')[0];

    _editingExpenseId = null;
    _splitMode = 'equal';
    setSplitMode('equal');

    // Pills répartition (tous sélectionnés par défaut)
    _renderTricountPills('tricount-split-pills', members, members, 'tricount-split-info');


    updateTricountSplitInfo();
    document.getElementById('tricount-expense-modal').style.display = 'flex';
}

function _renderTricountPills(containerId, members, selected, infoId) {
    const container = document.getElementById(containerId);
    container.innerHTML = members.map(m => {
        const isSelected = selected.includes(m);
        return `<div onclick="toggleTricountPill(this, '${containerId}', '${infoId}')"
            data-name="${m}"
            style="padding:5px 12px; border-radius:20px; font-size:0.82rem; cursor:pointer; transition:all 0.15s;
            background:${isSelected ? 'var(--primary)' : 'rgba(128,128,128,0.12)'};
            color:${isSelected ? 'white' : 'var(--text-color)'};">
            ${m}${isSelected ? ' ✓' : ''}
        </div>`;
    }).join('');
}

function toggleTricountPill(el, containerId, infoId) {
    const isActive = el.style.background.includes('var(--primary)') || el.style.background.includes('rgb(0, 206, 209)');
    el.style.background = isActive ? 'rgba(128,128,128,0.12)' : 'var(--primary)';
    el.style.color = isActive ? 'var(--text-color)' : 'white';
    el.dataset.name && (el.textContent = isActive ? el.dataset.name : el.dataset.name + ' ✓');
    updateTricountSplitInfo();
}

function _getSelectedPills(containerId) {
    return [...document.querySelectorAll(`#${containerId} div`)]
        .filter(el => el.style.background.includes('var(--primary)') || el.style.background.includes('rgb(0, 206, 209)'))
        .map(el => el.dataset.name);
}

let _splitMode = 'equal';

function setSplitMode(mode) {
    _splitMode = mode;
    document.querySelectorAll('.split-mode-btn').forEach(btn => {
        btn.style.background = 'var(--card-bg)';
        btn.style.color = 'var(--text-color)';
        btn.style.border = '1px solid rgba(128,128,128,0.3)';
    });
    const active = document.getElementById(`split-mode-${mode}`);
    if (active) { active.style.background = 'var(--primary)'; active.style.color = 'white'; active.style.border = '1px solid rgba(0,206,209,0.4)'; }

    document.getElementById('split-section-equal').style.display  = mode === 'equal'  ? 'block' : 'none';
    document.getElementById('split-section-custom').style.display = mode !== 'equal'  ? 'block' : 'none';

    if (mode !== 'equal') renderSplitCustomRows();
    updateTricountSplitInfo();
}

function renderSplitCustomRows() {
    const group = tricountGroups.find(g => g.id === _tricountActiveGroupId);
    if (!group) return;
    const members = group.memberNames || [];
    const amount = parseFloat(document.getElementById('tricount-expense-amount').value) || 0;
    const rows = document.getElementById('tricount-split-custom-rows');
    const isPercent = _splitMode === 'percent';
    const defaultVal = isPercent
        ? (members.length > 0 ? (100 / members.length).toFixed(1) : '0')
        : (members.length > 0 ? (amount / members.length).toFixed(2) : '0');

    // Garder les valeurs existantes si déjà rendues
    const existing = {};
    rows.querySelectorAll('input[data-member]').forEach(inp => { existing[inp.dataset.member] = inp.value; });

    rows.innerHTML = members.map(m => `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
            <span style="font-size:0.88rem; flex:1;">${m}</span>
            <div style="display:flex; align-items:center; gap:4px;">
                <input type="text" data-member="${m}" id="split-custom-${m.replace(/\s/g,'_')}"
                    value="${existing[m] || defaultVal}"
                    oninput="updateTricountSplitInfo()"
                    style="width:80px; text-align:right; padding:6px 10px; border-radius:10px; border:1px solid rgba(128,128,128,0.3); background:var(--card-bg); color:var(--text-color); font-size:0.88rem;">
                <span style="font-size:0.82rem; opacity:0.6; min-width:16px;">${isPercent ? '%' : '€'}</span>
            </div>
        </div>
    `).join('');
    updateTricountSplitInfo();
}

function updateTricountSplitInfo() {
    const amount = parseFloat(document.getElementById('tricount-expense-amount').value) || 0;

    if (_splitMode === 'equal') {
        const splitSelected = _getSelectedPills('tricount-split-pills');
        const infoEl = document.getElementById('tricount-split-info');
        if (infoEl) infoEl.textContent = (splitSelected.length > 0 && amount > 0)
            ? `${amount.toFixed(2)} € ÷ ${splitSelected.length} = ${(amount / splitSelected.length).toFixed(2)} € / pers.`
            : '';
    } else {
        const infoEl = document.getElementById('tricount-split-custom-info');
        if (!infoEl) return;
        const inputs = document.querySelectorAll('#tricount-split-custom-rows input[data-member]');
        if (_splitMode === 'percent') {
            const total = [...inputs].reduce((s, inp) => s + (parseFloat(inp.value) || 0), 0);
        const diff = Math.round((100 - total) * 10) / 10;
            infoEl.textContent = `Total : ${total.toFixed(1)}%`;
            infoEl.style.color = Math.abs(diff) < 0.1 ? '#2ecc71' : 'var(--danger)';
            if (Math.abs(diff) >= 0.1) infoEl.textContent += ` (manque ${diff.toFixed(1)}%)`;
        } else {
            const total = [...inputs].reduce((s, inp) => s + (parseFloat(inp.value) || 0), 0);
            const diff = Math.round((amount - total) * 100) / 100;
            infoEl.textContent = `Total : ${total.toFixed(2)} € / ${amount.toFixed(2)} €`;
            infoEl.style.color = Math.abs(diff) < 0.01 ? '#2ecc71' : 'var(--danger)';
            if (Math.abs(diff) >= 0.01) infoEl.textContent += ` (écart ${diff.toFixed(2)} €)`;
        }
    }
}

// ---- ÉVALUATEUR D'EXPRESSIONS ----
function evalTricountExprValue(raw, max) {
    const str = raw.trim();
    if (!str) return 0;
    try {
        // Autoriser uniquement chiffres, opérateurs, point, virgule, parenthèses
        const sanitized = str.replace(',', '.').replace(/[^0-9+\-*/().\s]/g, '');
        const result = Function('"use strict"; return (' + sanitized + ')')();
        if (!isFinite(result) || isNaN(result)) return 0;
        return Math.min(Math.max(0, Math.round(result * 100) / 100), max);
    } catch {
        return 0;
    }
}

function evalTricountExpr(input, max) {
    const idx = input.id.split('-').pop();
    const preview = document.getElementById(`rembours-preview-${idx}`);
    const val = evalTricountExprValue(input.value, max);
    if (preview) {
        const raw = input.value.trim();
        const isExpr = raw && isNaN(raw.replace(',', '.'));
        preview.textContent = isExpr ? `= ${val.toFixed(2)}` : '';
    }
}

// ---- REMBOURSEMENTS ----
let _remboursPending = []; // [{ from, to, maxAmount }]

function openTricountRembours(groupId, debtorName) {
    const g = tricountGroups.find(x => x.id === groupId);
    if (!g) return;
    const expenses = tricountExpensesMap[groupId] || [];
    const members = g.memberNames || [];
    const cur = g.currency || '€';

    // Recalculer les balances + transactions
    const balances = {};
    members.forEach(m => balances[m] = 0);
    expenses.forEach(e => {
        balances[e.paidByName] = (balances[e.paidByName] || 0) + e.amount;
        const among = e.splitAmong || members;
        if (e.splitAmounts) {
            among.forEach(m => { balances[m] = (balances[m] || 0) - (e.splitAmounts[m] || 0); });
        } else if (e.splitPercentages) {
            among.forEach(m => { balances[m] = (balances[m] || 0) - (e.amount * (e.splitPercentages[m] || 0) / 100); });
        } else {
            const share = e.amount / among.length;
            among.forEach(m => { balances[m] = (balances[m] || 0) - share; });
        }
    });

    // Appliquer les remboursements déjà effectués
    (tricountSettlements[groupId] || []).forEach(s => {
        balances[s.from] = (balances[s.from] || 0) + s.amount;
        balances[s.to]   = (balances[s.to]   || 0) - s.amount;
    });

    const transactions = simplifyDebts(balances).filter(t => t.from === debtorName);

    _remboursPending = transactions.map(t => ({ ...t, cur }));

    document.getElementById('tricount-rembours-lines').innerHTML = transactions.map((t, i) => `
        <div style="padding:10px 0; border-bottom:1px solid rgba(128,128,128,0.1);">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="font-size:0.88rem;">
                    <span style="color:var(--danger); font-weight:bold;">${t.from}</span>
                    <span style="opacity:0.5;"> → </span>
                    <span style="color:#2ecc71; font-weight:bold;">${t.to}</span>
                    <div style="font-size:0.75rem; opacity:0.45; margin-top:2px;">Max : ${t.amount.toFixed(2)} ${cur}</div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px;">
                    <input type="text" id="rembours-input-${i}" value="${t.amount.toFixed(2)}"
                        oninput="evalTricountExpr(this, ${t.amount})"
                        style="width:110px; text-align:right; padding:8px 10px; border-radius:12px; border:1px solid rgba(128,128,128,0.3); background:var(--card-bg); color:var(--text-color); font-size:0.9rem; font-family:monospace;">
                    <span id="rembours-preview-${i}" style="font-size:0.72rem; color:var(--primary-dark); min-height:14px;"></span>
                </div>
            </div>
        </div>
    `).join('');

    document.getElementById('tricount-rembours-modal').style.display = 'flex';
}

function saveTricountRemboursement() {
    const g = tricountGroups.find(x => x.id === _tricountActiveGroupId);
    if (!g || _remboursPending.length === 0) return;
    const cur = g.currency || '€';

    const batch = db.batch();
    _remboursPending.forEach((t, i) => {
        const input = document.getElementById(`rembours-input-${i}`);
        const amount = evalTricountExprValue(input?.value || '0', t.amount);
        if (amount > 0) {
            const ref = db.collection("tricountSettlements").doc();
            batch.set(ref, {
                groupId: _tricountActiveGroupId,
                from: t.from, to: t.to, amount,
                createdAt: Date.now(), userId: currentUser.uid
            });
        }
    });

    // Évaluer les expressions avant de sauvegarder
    _remboursPending.forEach((t, i) => {
        const input = document.getElementById(`rembours-input-${i}`);
        if (input) input.value = evalTricountExprValue(input.value, t.amount);
    });

    batch.commit().then(() => {
        document.getElementById('tricount-rembours-modal').style.display = 'none';
        showToast("Remboursement enregistré ! ✅");
        // Forcer rechargement des settlements et re-render
        db.collection("tricountSettlements")
            .where("groupId", "==", _tricountActiveGroupId)
            .get().then(snap => {
                tricountSettlements[_tricountActiveGroupId] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderTricountDetail(_tricountActiveGroupId);
            });
    }).catch(err => showToast("Erreur : " + err.message));
}

// ---- DÉTAIL D'UNE DETTE ----
function openTricountDebtDetail(from, to, groupId) {
    const g = tricountGroups.find(x => x.id === groupId);
    if (!g) return;
    const expenses = tricountExpensesMap[groupId] || [];
    const cur = g.currency || '€';
    const members = g.memberNames || [];

    // Pour chaque dépense, calculer la contribution nette de "from" envers "to"
    const lines = [];

    expenses.forEach(e => {
        const among = e.splitAmong || members;

        // Part de "from" dans cette dépense
        let fromShare = 0;
        if (among.includes(from)) {
            if (e.splitAmounts)      fromShare = e.splitAmounts[from] || 0;
            else if (e.splitPercentages) fromShare = e.amount * (e.splitPercentages[from] || 0) / 100;
            else                     fromShare = e.amount / among.length;
        }

        // Part de "to" dans cette dépense
        let toShare = 0;
        if (among.includes(to)) {
            if (e.splitAmounts)      toShare = e.splitAmounts[to] || 0;
            else if (e.splitPercentages) toShare = e.amount * (e.splitPercentages[to] || 0) / 100;
            else                     toShare = e.amount / among.length;
        }

        // Contribution nette "from doit à to" pour cette dépense
        let net = 0;
        if (e.paidByName === to && among.includes(from))   net = +fromShare;   // to a payé, from doit sa part
        if (e.paidByName === from && among.includes(to))   net = -toShare;     // from a payé, to lui doit sa part

        if (Math.abs(net) > 0.005) {
            lines.push({ desc: e.description, date: e.expenseDate || '', amount: e.amount, net, paidBy: e.paidByName });
        }
    });

    // Total net
    const totalNet = lines.reduce((s, l) => s + l.net, 0);

    document.getElementById('tricount-debt-detail-title').innerHTML =
        `<span style="color:var(--danger);">${from}</span> <span style="opacity:0.5;">→</span> <span style="color:#2ecc71;">${to}</span>`;
    document.getElementById('tricount-debt-detail-total').textContent = `${Math.max(0, totalNet).toFixed(2)} ${cur}`;

    const listEl = document.getElementById('tricount-debt-detail-list');
    if (lines.length === 0) {
        listEl.innerHTML = `<p style="text-align:center; opacity:0.45; font-style:italic; font-size:0.85rem;">Aucune dépense directe trouvée.</p>`;
    } else {
        listEl.innerHTML = lines.map(l => {
            const isDebt = l.net > 0;
            const dateLabel = l.date ? ` · ${l.date}` : '';
            return `
            <div style="background:var(--card-bg); border-radius:12px; padding:10px 14px; border:1px solid rgba(128,128,128,0.12); display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div style="flex:1; min-width:0;">
                    <div style="font-size:0.88rem; font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${l.desc}</div>
                    <div style="font-size:0.73rem; opacity:0.45; margin-top:2px;">Payé par ${l.paidBy}${dateLabel} · Total ${l.amount.toFixed(2)} ${cur}</div>
                </div>
                <div style="text-align:right; flex-shrink:0;">
                    <div style="font-family:'Mogra',cursive; font-weight:normal; color:${isDebt ? 'var(--danger)' : '#2ecc71'}; font-size:0.95rem;">
                        ${isDebt ? '+' : '−'}${Math.abs(l.net).toFixed(2)} ${cur}
                    </div>
                    <div style="font-size:0.7rem; opacity:0.4;">${isDebt ? `${from} doit` : `${from} a payé`}</div>
                </div>
            </div>`;
        }).join('');
    }

    document.getElementById('tricount-debt-detail-modal').style.display = 'flex';
}

function deleteTricountExpense(id) {
    db.collection("tricountExpenses").doc(id).delete().then(() => showToast("Supprimé ! 🗑️"));
}

let _editingExpenseId = null;

function openEditTricountExpense(id) {
    const group = tricountGroups.find(g => g.id === _tricountActiveGroupId);
    const expenses = tricountExpensesMap[_tricountActiveGroupId] || [];
    const e = expenses.find(x => x.id === id);
    if (!e || !group) return;

    _editingExpenseId = id;
    const members = group.memberNames || [];

    document.getElementById('tricount-paid-by').innerHTML = members.map(m => `<option value="${m}" ${m === e.paidByName ? 'selected' : ''}>${m}</option>`).join('');
    document.getElementById('tricount-expense-desc').value = e.description;
    document.getElementById('tricount-expense-amount').value = e.amount;
    document.getElementById('tricount-expense-date').value = e.expenseDate || '';

    // Restaurer le mode de répartition
    const mode = e.splitAmounts ? 'fixed' : (e.splitPercentages ? 'percent' : 'equal');
    _splitMode = mode;
    setSplitMode(mode);
    _renderTricountPills('tricount-split-pills', members, e.splitAmong || members, 'tricount-split-info');

    // Pré-remplir les valeurs custom si besoin
    if (mode !== 'equal') {
        setTimeout(() => {
            members.forEach(m => {
                const inp = document.getElementById(`split-custom-${m.replace(/\s/g, '_')}`);
                if (!inp) return;
                if (mode === 'percent' && e.splitPercentages) inp.value = e.splitPercentages[m] || 0;
                if (mode === 'fixed' && e.splitAmounts) inp.value = e.splitAmounts[m] || 0;
            });
            updateTricountSplitInfo();
        }, 30);
    }

    updateTricountSplitInfo();
    document.getElementById('tricount-expense-modal').style.display = 'flex';
}

function saveTricountExpense() {
    const desc = document.getElementById('tricount-expense-desc').value.trim();
    const amount = parseFloat(document.getElementById('tricount-expense-amount').value);
    const paidByName = document.getElementById('tricount-paid-by').value;
    const expenseDate = document.getElementById('tricount-expense-date').value;
    const group = tricountGroups.find(g => g.id === _tricountActiveGroupId);
    if (!desc || isNaN(amount) || amount <= 0 || !group) { showToast("Remplissez tous les champs ⚠️"); return; }

    let splitAmong, splitAmounts = null, splitPercentages = null;

    if (_splitMode === 'equal') {
        splitAmong = _getSelectedPills('tricount-split-pills');
        if (splitAmong.length === 0) { showToast("Sélectionne au moins un participant ⚠️"); return; }
    } else {
        const inputs = [...document.querySelectorAll('#tricount-split-custom-rows input[data-member]')];
        splitAmong = inputs.map(i => i.dataset.member);
        if (_splitMode === 'percent') {
            const total = inputs.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
            if (Math.abs(total - 100) > 0.1) { showToast("Le total des % doit être 100% ⚠️"); return; }
            splitPercentages = {};
            inputs.forEach(i => { splitPercentages[i.dataset.member] = parseFloat(i.value) || 0; });
        } else {
            const total = inputs.reduce((s, i) => s + (parseFloat(i.value) || 0), 0);
            if (Math.abs(total - amount) > 0.01) { showToast(`Le total (${total.toFixed(2)}€) doit égaler le montant ⚠️`); return; }
            splitAmounts = {};
            inputs.forEach(i => { splitAmounts[i.dataset.member] = parseFloat(i.value) || 0; });
        }
    }

    const data = { description: desc, amount, paidByName, expenseDate, splitAmong,
        splitPercentages: splitPercentages || null, splitAmounts: splitAmounts || null };

    if (_editingExpenseId) {
        db.collection("tricountExpenses").doc(_editingExpenseId).update(data).then(() => {
            _editingExpenseId = null;
            document.getElementById('tricount-expense-modal').style.display = 'none';
            showToast("Dépense modifiée ! ✅");
        }).catch(err => showToast("Erreur : " + err.message));
    } else {
        db.collection("tricountExpenses").add({
            ...data, groupId: _tricountActiveGroupId, createdAt: Date.now(), userId: currentUser.uid
        }).then(() => {
            document.getElementById('tricount-expense-modal').style.display = 'none';
            showToast("Dépense ajoutée ! ✅");
        }).catch(err => showToast("Erreur : " + err.message));
    }
}
