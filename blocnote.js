// blocnote.js

let blocNotes = [];
let blocNoteFolders = [];
let blocNoteFragments = [];
let unsubBlocNotes = null;
let unsubBlocFolders = null;
let unsubBlocFragments = null;
let _editingNoteId = null;
let _selectedFolderId = null;
let _savedSelection = null;
let _selectedNoteIds = new Set();   // sélection dans "Toutes"
let _selectedFragIds = new Set();   // sélection dans un dossier
let _editingFolderId = null;
let _editingFragmentId = null;
let _selectedMergedNoteIds = new Set();
let _bnSearch = '';
let _bnSort = 'recent';
let _pendingFolderId = null;
let _pendingFolderColor = null;

// ---- RECHERCHE & TRI ----
function setBnSearch(val) {
    _bnSearch = val.toLowerCase();
    renderBlocNoteList();
}
function setBnSort(val) {
    _bnSort = val;
    renderBlocNoteList();
}
function _sortItems(items, textFn, dateFn) {
    return [...items].sort((a, b) => {
        if (_bnSort === 'alpha') return textFn(a).localeCompare(textFn(b), 'fr');
        if (_bnSort === 'oldest') return (dateFn(a) || 0) - (dateFn(b) || 0);
        return (dateFn(b) || 0) - (dateFn(a) || 0);
    });
}

// ---- FORMATAGE ----
function formatText(cmd) {
    const editor = document.getElementById('blocnote-editor-content');
    editor.focus();
    if (cmd === 'h2') {
        document.execCommand('formatBlock', false, '<h2>');
    } else if (cmd === 'p') {
        document.execCommand('formatBlock', false, '<p>');
    } else {
        document.execCommand(cmd, false, null);
    }
    updateFormatButtons();
}

function openHighlightPicker() {
    const modal = document.getElementById('highlight-picker-modal');
    if (modal) modal.style.display = 'flex';
}

function applyTextHighlight(color) {
    document.getElementById('highlight-picker-modal').style.display = 'none';
    const editor = document.getElementById('blocnote-editor-content');
    editor.focus();
    document.execCommand('backColor', false, color);
}

function updateFormatButtons() {
    const map = {
        'bn-fmt-bold':      () => document.queryCommandState('bold'),
        'bn-fmt-italic':    () => document.queryCommandState('italic'),
        'bn-fmt-underline': () => document.queryCommandState('underline'),
        'bn-fmt-ul':        () => document.queryCommandState('insertUnorderedList'),
        'bn-fmt-ol':        () => document.queryCommandState('insertOrderedList'),
        'bn-fmt-h2':        () => document.queryCommandValue('formatBlock').toLowerCase() === 'h2',
        'bn-fmt-p':         () => { const v = document.queryCommandValue('formatBlock').toLowerCase(); return v === 'p' || v === ''; },
    };
    Object.entries(map).forEach(([id, check]) => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.toggle('active', check());
    });
}

// ---- MODALE CONFIRMATION ----
function showConfirmModal(message, onConfirm, { title = 'Supprimer ?', icon = '🗑️', okLabel = 'Supprimer' } = {}) {
    document.getElementById('confirm-modal-icon').textContent = icon;
    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-msg').textContent = message;
    const okBtn = document.getElementById('confirm-modal-ok');
    okBtn.textContent = okLabel;
    okBtn.onclick = () => { closeConfirmModal(); onConfirm(); };
    document.getElementById('confirm-modal').style.display = 'flex';
}
function closeConfirmModal() {
    document.getElementById('confirm-modal').style.display = 'none';
}

// ---- INIT ----
function initBlocNote() {
    if (!currentUser) return;

    if (unsubBlocFolders) unsubBlocFolders();
    unsubBlocFolders = db.collection("blocNoteFolders")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snap => {
            blocNoteFolders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            renderFolderTabs();
            renderHighlightBar();
            renderBlocNoteList();
        });

    if (unsubBlocNotes) unsubBlocNotes();
    unsubBlocNotes = db.collection("blocNotes")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snap => {
            blocNotes = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
            renderBlocNoteList();
        });

    if (unsubBlocFragments) unsubBlocFragments();
    unsubBlocFragments = db.collection("blocNoteFragments")
        .where("userId", "==", currentUser.uid)
        .onSnapshot(snap => {
            blocNoteFragments = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            renderBlocNoteList();
        });
}

// ---- ONGLETS DOSSIERS ----
function renderFolderTabs() {
    const container = document.getElementById('blocnote-folder-tabs');
    if (!container) return;
    container.innerHTML = blocNoteFolders.map(f => {
        const isActive = _selectedFolderId === f.id;
        return `<div style="display:flex; align-items:center; gap:0; background:${isActive ? f.color : 'rgba(128,128,128,0.1)'}; border-radius:20px; overflow:hidden;">
            <button onclick="selectBlocNoteFolder('${f.id}')"
                style="background:none; border:none; color:${isActive ? '#fff' : 'var(--text-color)'}; padding:6px 10px 6px 12px; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:5px;">
                <span style="width:8px; height:8px; border-radius:50%; background:${isActive ? '#fff' : f.color}; display:inline-block; flex-shrink:0;"></span>${f.name}
            </button>
            <button onclick="openEditFolderModal('${f.id}')" title="Modifier"
                style="background:none; border:none; color:${isActive ? '#ffffffaa' : 'rgba(128,128,128,0.5)'}; padding:0 4px; cursor:pointer; font-size:0.75rem; line-height:1;">✏️</button>
            <button onclick="deleteFolder('${f.id}')" title="Supprimer"
                style="background:none; border:none; color:${isActive ? '#ffffffaa' : 'rgba(128,128,128,0.5)'}; padding:0 8px 0 2px; cursor:pointer; font-size:0.75rem; line-height:1;">×</button>
        </div>`;
    }).join('');

    const allBtn = document.getElementById('folder-btn-all');
    if (allBtn) {
        allBtn.style.background = _selectedFolderId === null ? 'var(--primary)' : 'rgba(128,128,128,0.1)';
        allBtn.style.color = _selectedFolderId === null ? '#fff' : 'var(--text-color)';
    }
}

function selectBlocNoteFolder(folderId) {
    _selectedFolderId = folderId;
    _selectedNoteIds.clear();
    _selectedFragIds.clear();
    _selectedMergedNoteIds.clear();
    _updateToolbar();
    renderFolderTabs();
    renderBlocNoteList();
}

// ---- TOOLBAR CONTEXTUELLE ----
function _updateToolbar() {
    const inFolder = !!_selectedFolderId;
    const selCount = inFolder ? _selectedFragIds.size + _selectedMergedNoteIds.size : _selectedNoteIds.size;

    const btnModifier  = document.getElementById('bn-btn-modifier');
    const btnFusionner = document.getElementById('bn-btn-fusionner');
    const btnSupprimer = document.getElementById('bn-btn-supprimer');
    const btnExporter  = document.getElementById('bn-btn-exporter');

    const canModify  = selCount === 1;
    const canMerge   = inFolder && selCount >= 2;
    const canDelete  = selCount >= 1;
    const canExport  = selCount >= 1 || inFolder;

    _setBtn(btnModifier,  canModify);
    _setBtn(btnFusionner, canMerge);
    _setBtn(btnSupprimer, canDelete);
    _setBtn(btnExporter,  canExport);
}

function _setBtn(btn, enabled) {
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.4';
}

function blocNoteAction(action) {
    const inFolder = !!_selectedFolderId;

    if (action === 'modifier') {
        if (inFolder) {
            if (_selectedMergedNoteIds.size === 1) {
                openNote([..._selectedMergedNoteIds][0]);
            } else {
                const id = [..._selectedFragIds][0];
                openEditFragmentModal(id);
            }
        } else {
            const id = [..._selectedNoteIds][0];
            openNote(id);
        }
    } else if (action === 'fusionner') {
        mergeFragments();
    } else if (action === 'supprimer') {
        if (inFolder) deleteSelectedFragments();
        else deleteSelectedNotes();
    } else if (action === 'exporter') {
        if (inFolder) {
            if (_selectedFragIds.size === 1) {
                exportBlocNotePdf('fragment', [..._selectedFragIds][0]);
            } else if (_selectedFragIds.size > 1) {
                exportBlocNotePdfMultiFrags([..._selectedFragIds]);
            } else {
                exportBlocNotePdf('folder', _selectedFolderId);
            }
        } else {
            if (_selectedNoteIds.size === 1) {
                exportBlocNotePdf('note', [..._selectedNoteIds][0]);
            } else if (_selectedNoteIds.size > 1) {
                exportBlocNotePdfMultiNotes([..._selectedNoteIds]);
            }
        }
    }
}

// ---- SÉLECTION NOTES (vue Toutes) ----
function toggleNoteSelect(noteId) {
    if (_selectedNoteIds.has(noteId)) _selectedNoteIds.delete(noteId);
    else _selectedNoteIds.add(noteId);
    _updateToolbar();
    renderBlocNoteList();
}

function deleteSelectedNotes() {
    if (!_selectedNoteIds.size) return;
    showConfirmModal(`Supprimer ${_selectedNoteIds.size} note(s) ?`, () => {
        const batch = db.batch();
        _selectedNoteIds.forEach(id => batch.delete(db.collection("blocNotes").doc(id)));
        batch.commit().then(() => { _selectedNoteIds.clear(); _updateToolbar(); showToast("Note(s) supprimée(s) !"); });
    });
}

// ---- SÉLECTION FRAGMENTS (vue dossier) ----
function toggleFragSelect(fragId) {
    if (_selectedFragIds.has(fragId)) _selectedFragIds.delete(fragId);
    else _selectedFragIds.add(fragId);
    _updateToolbar();
    renderBlocNoteList();
}

function deleteSelectedFragments() {
    const total = _selectedFragIds.size + _selectedMergedNoteIds.size;
    if (!total) return;
    showConfirmModal(`Supprimer ${total} élément(s) ?`, () => {
        const batch = db.batch();
        _selectedFragIds.forEach(id => batch.delete(db.collection("blocNoteFragments").doc(id)));
        _selectedMergedNoteIds.forEach(id => batch.delete(db.collection("blocNotes").doc(id)));
        batch.commit().then(() => {
            _selectedFragIds.clear();
            _selectedMergedNoteIds.clear();
            _updateToolbar();
            showToast("Élément(s) supprimé(s) !");
        });
    });
}

function toggleMergedNoteSelect(noteId) {
    if (_selectedMergedNoteIds.has(noteId)) _selectedMergedNoteIds.delete(noteId);
    else _selectedMergedNoteIds.add(noteId);
    _updateToolbar();
    renderBlocNoteList();
}

// ---- FUSIONNER FRAGMENTS + NOTES → NOTE ----
function mergeFragments() {
    const total = _selectedFragIds.size + _selectedMergedNoteIds.size;
    if (total < 2) return;

    const selectedFrags = [..._selectedFragIds].map(id => blocNoteFragments.find(f => f.id === id)).filter(Boolean);
    const selectedNotes = [..._selectedMergedNoteIds].map(id => blocNotes.find(n => n.id === id)).filter(Boolean);
    const titledItems = [...selectedFrags, ...selectedNotes].filter(x => x.title);

    if (titledItems.length >= 2) {
        openMergeTitleModal();
        return;
    }
    const autoTitle = titledItems.length === 1 ? titledItems[0].title : '';
    _doMerge(autoTitle);
}

function openMergeTitleModal() {
    document.getElementById('merge-title-input').value = '';
    document.getElementById('merge-title-modal').style.display = 'flex';
}

function confirmMergeWithTitle() {
    const title = (document.getElementById('merge-title-input').value || '').trim();
    document.getElementById('merge-title-modal').style.display = 'none';
    _doMerge(title);
}

function _doMerge(title) {
    const folderId = _selectedFolderId;
    const fragsContent = [..._selectedFragIds].map(id => blocNoteFragments.find(f => f.id === id)).filter(Boolean).map(f => f.text);
    const notesContent = [..._selectedMergedNoteIds].map(id => blocNotes.find(n => n.id === id)).filter(Boolean).map(n => n.content || '');
    const merged = [...fragsContent, ...notesContent].join('<p><br></p>');

    const batch = db.batch();
    _selectedFragIds.forEach(id => batch.delete(db.collection("blocNoteFragments").doc(id)));
    _selectedMergedNoteIds.forEach(id => batch.delete(db.collection("blocNotes").doc(id)));

    const noteRef = db.collection("blocNotes").doc();
    batch.set(noteRef, {
        content: merged,
        title: title || '',
        folders: [folderId],
        userId: currentUser.uid,
        createdAt: Date.now(),
        updatedAt: Date.now()
    });

    batch.commit().then(() => {
        _selectedFragIds.clear();
        _selectedMergedNoteIds.clear();
        _updateToolbar();
        showToast("Fusion réalisée ! ✅");
        openNote(noteRef.id);
    }).catch(err => showToast("Erreur : " + err.message));
}

// ---- LISTE ----
function renderBlocNoteList() {
    const container = document.getElementById('blocnote-list');
    if (!container) return;

    if (_selectedFolderId) {
        // Vue dossier → fragments + notes fusionnées
        const folder = blocNoteFolders.find(f => f.id === _selectedFolderId);
        let frags = blocNoteFragments.filter(f => f.folderId === _selectedFolderId);
        let mergedNotes = blocNotes.filter(n => Array.isArray(n.folders) && n.folders.includes(_selectedFolderId));

        if (_bnSearch) {
            frags = frags.filter(f => (f.title || '').toLowerCase().includes(_bnSearch) || (f.plainText || f.text || '').toLowerCase().includes(_bnSearch));
            mergedNotes = mergedNotes.filter(n => (n.title || '').toLowerCase().includes(_bnSearch) || _stripHtml(n.content || '').toLowerCase().includes(_bnSearch));
        }
        frags = _sortItems(frags, f => f.plainText || '', f => f.createdAt);
        mergedNotes = _sortItems(mergedNotes, n => _stripHtml(n.content || ''), n => n.updatedAt);

        if (frags.length === 0 && mergedNotes.length === 0) {
            container.innerHTML = `<p style="text-align:center; opacity:0.45; font-style:italic; margin-top:40px;">Aucun texte archivé dans ce dossier.</p>`;
            return;
        }

        const fragsHtml = frags.map(fr => {
            const date = fr.createdAt ? new Date(fr.createdAt).toLocaleDateString('fr-FR') : '';
            const sel = _selectedFragIds.has(fr.id);
            const mergedBadge = fr.merged
                ? `<span style="font-size:0.68rem; background:rgba(0,206,209,0.15); color:var(--primary-dark); border-radius:10px; padding:2px 7px; margin-left:6px;">🔗 Fusionné</span>`
                : '';
            return `<div onclick="toggleFragSelect('${fr.id}')"
                style="background:var(--card-bg); border-radius:16px; padding:14px 18px; margin-bottom:10px;
                       border-left:4px solid ${folder ? folder.color : 'var(--primary)'};
                       border:2px solid ${sel ? (folder ? folder.color : 'var(--primary)') : 'rgba(128,128,128,0.15)'};
                       border-left-width:4px;
                       cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.07); transition:border .15s;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                    <div style="flex:1; font-size:0.9rem; line-height:1.6;">
                        ${fr.title
                            ? `<div style="font-weight:600;">${fr.title}</div><div style="font-size:0.8rem; opacity:0.5; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${(fr.plainText || '').substring(0, 80)}</div>`
                            : _stripHighlightStyle(fr.text)
                        }${mergedBadge}
                    </div>
                    <div style="font-size:0.72rem; opacity:0.35; flex-shrink:0;">${date}</div>
                </div>
            </div>`;
        }).join('');

        const mergedNotesHtml = mergedNotes.map(n => {
            const preview = _stripHtml(n.content || '').replace(/\n/g, ' ').substring(0, 200);
            const date = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('fr-FR') : '';
            const sel = _selectedMergedNoteIds.has(n.id);
            return `<div onclick="toggleMergedNoteSelect('${n.id}')"
                style="background:var(--card-bg); border-radius:16px; padding:14px 18px; margin-bottom:10px;
                       border-left:4px solid ${folder ? folder.color : 'var(--primary)'};
                       border:2px solid ${sel ? (folder ? folder.color : 'var(--primary)') : 'rgba(128,128,128,0.15)'};
                       border-left-width:4px;
                       cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.07); transition:border .15s;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                    <div style="flex:1; font-size:0.9rem; line-height:1.6;">
                        ${n.title
                            ? `<div style="font-weight:600;">${n.title}</div><div style="font-size:0.8rem; opacity:0.5; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${preview}</div>`
                            : (preview || '—')
                        }
                        <span style="font-size:0.68rem; background:rgba(0,206,209,0.15); color:var(--primary-dark); border-radius:10px; padding:2px 7px; margin-left:6px;">📝 Note fusionnée</span>
                    </div>
                    <div style="font-size:0.72rem; opacity:0.35; flex-shrink:0;">${date}</div>
                </div>
            </div>`;
        }).join('');

        container.innerHTML = fragsHtml + mergedNotesHtml;
        return;
    }

    // Vue "Toutes" → notes normales uniquement (pas les notes fusionnées dans un dossier)
    let notesLibres = blocNotes.filter(n => !Array.isArray(n.folders) || n.folders.length === 0);
    if (_bnSearch) notesLibres = notesLibres.filter(n => (n.title || '').toLowerCase().includes(_bnSearch) || _stripHtml(n.content || '').toLowerCase().includes(_bnSearch));
    notesLibres = _sortItems(notesLibres, n => _stripHtml(n.content || ''), n => n.updatedAt);

    if (notesLibres.length === 0) {
        container.innerHTML = _bnSearch
            ? `<p style="text-align:center; opacity:0.45; font-style:italic; margin-top:40px;">Aucun résultat pour "<strong>${_bnSearch}</strong>"</p>`
            : `<p style="text-align:center; opacity:0.45; font-style:italic; margin-top:40px;">Aucune note.<br>Clique "+ Note" pour commencer !</p>`;
        return;
    }
    container.innerHTML = notesLibres.map(n => {
        const preview = _stripHtml(n.content || '').replace(/\n/g, ' ').substring(0, 100);
        const date = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('fr-FR') : '';
        const sel = _selectedNoteIds.has(n.id);
        const dots = _getFolderDots(n.content || '');
        return `<div onclick="toggleNoteSelect('${n.id}')" ondblclick="openNote('${n.id}')"
            style="background:var(--card-bg); border-radius:16px; padding:14px 18px; margin-bottom:10px;
                   border:2px solid ${sel ? 'var(--primary)' : 'rgba(128,128,128,0.15)'};
                   cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.07); transition:border .15s;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
                <div style="flex:1; min-width:0;">
                    ${n.title ? `<div style="font-weight:600; font-size:0.92rem; margin-bottom:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${n.title}</div>` : ''}
                    <div style="font-size:0.88rem; line-height:1.5; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; opacity:${n.title ? '0.65' : '1'};">${preview || '—'}</div>
                    ${dots ? `<div style="display:flex; gap:5px; margin-top:7px;">${dots}</div>` : ''}
                </div>
                <div style="font-size:0.72rem; opacity:0.35; flex-shrink:0;">${date}</div>
            </div>
        </div>`;
    }).join('');
}

function _stripHighlightStyle(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    // Supprime uniquement les backgrounds des éléments liés à un dossier
    // Les highlights décoratifs (bouton surligner) sans data-folder sont conservés
    d.querySelectorAll('[data-folder]').forEach(el => {
        el.style.backgroundColor = '';
        el.style.outline = '';
        el.style.borderRadius = '';
        if (!el.getAttribute('style') || !el.getAttribute('style').trim()) el.removeAttribute('style');
        el.removeAttribute('data-folder');
        el.removeAttribute('data-original-html');
    });
    return d.innerHTML;
}

function _stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || d.innerText || '';
}

function _getFolderDots(html) {
    return _extractFolderIds(html).map(fid => {
        const f = blocNoteFolders.find(x => x.id === fid);
        return f ? `<span title="${f.name}" style="width:9px; height:9px; border-radius:50%; background:${f.color}; display:inline-block;"></span>` : '';
    }).join('');
}

function _extractFolderIds(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return [...new Set([...tmp.querySelectorAll('[data-folder]')].map(s => s.getAttribute('data-folder')))];
}

// ---- ÉDITEUR NOTE ----

function _snapSelectionToWords(sel) {
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    let sNode = range.startContainer, sOff = range.startOffset;
    if (sNode.nodeType === Node.TEXT_NODE) {
        while (sOff > 0 && /\S/.test(sNode.textContent[sOff - 1])) sOff--;
    }

    let eNode = range.endContainer, eOff = range.endOffset;
    if (eNode.nodeType === Node.TEXT_NODE) {
        while (eOff < eNode.textContent.length && /\S/.test(eNode.textContent[eOff])) eOff++;
    }

    try {
        const r = document.createRange();
        r.setStart(sNode, sOff);
        r.setEnd(eNode, eOff);
        sel.removeAllRanges();
        sel.addRange(r);
    } catch(e) {}
}

function _initEditorSelectionListener() {
    document.addEventListener('selectionchange', () => {
        const editor = document.getElementById('blocnote-editor-content');
        if (editor && document.getElementById('blocnote-editor-view').style.display !== 'none') {
            updateFormatButtons();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        const editor = document.getElementById('blocnote-editor-content');
        if (!editor) return;

        // En mode association : snap mot par mot pendant le drag
        editor.addEventListener('mousemove', e => {
            if (e.buttons !== 1 || !_pendingFolderId) return;
            _snapSelectionToWords(window.getSelection());
        });

        editor.addEventListener('mouseup', () => {
            if (!_pendingFolderId) return;
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) return;
            _snapSelectionToWords(sel);
            applyHighlight(_pendingFolderId, _pendingFolderColor);
        });

        editor.addEventListener('touchmove', () => {
            if (!_pendingFolderId) return;
            _snapSelectionToWords(window.getSelection());
        }, { passive: true });

        editor.addEventListener('touchend', () => {
            if (!_pendingFolderId) return;
            const sel = window.getSelection();
            if (!sel || sel.isCollapsed) return;
            _snapSelectionToWords(sel);
            applyHighlight(_pendingFolderId, _pendingFolderColor);
        });
    });
}

function openNote(noteId) {
    const note = blocNotes.find(n => n.id === noteId);
    if (!note) return;
    _editingNoteId = noteId;
    const editor = document.getElementById('blocnote-editor-content');
    editor.innerHTML = note.content || '';
    const isMerged = Array.isArray(note.folders) && note.folders.length > 0;
    const titleEl = document.getElementById('blocnote-editor-title');
    titleEl.value = note.title || '';
    titleEl.style.display = isMerged ? '' : 'none';
    updateBlocNotePlaceholder(editor);
    document.getElementById('blocnote-list-view').style.display = 'none';
    document.getElementById('blocnote-editor-view').style.display = 'flex';
    updateFormatButtons();
}

function closeNote() {
    _editingNoteId = null;
    _editingFragmentId = null;
    _savedSelection = null;
    _pendingFolderId = null;
    _pendingFolderColor = null;
    document.getElementById('blocnote-editor-title').value = '';
    document.getElementById('blocnote-editor-view').style.display = 'none';
    document.getElementById('blocnote-list-view').style.display = 'block';
}

function newNote() {
    _editingNoteId = null;
    _editingFragmentId = null;
    _savedSelection = null;
    const editor = document.getElementById('blocnote-editor-content');
    editor.innerHTML = '';
    const titleEl = document.getElementById('blocnote-editor-title');
    titleEl.value = '';
    titleEl.style.display = 'none';
    updateBlocNotePlaceholder(editor);
    document.getElementById('blocnote-list-view').style.display = 'none';
    document.getElementById('blocnote-editor-view').style.display = 'flex';
    editor.focus();
}

function updateBlocNotePlaceholder(el) {
    if (!el) return;
    el.setAttribute('data-empty', (el.textContent || '').trim() === '' ? 'true' : 'false');
}

function saveNote() {
    if (_editingFragmentId) { saveFragmentEdit(); return; }
    const editor = document.getElementById('blocnote-editor-content');
    const title = (document.getElementById('blocnote-editor-title').value || '').trim();

    // Cloner le contenu pour traiter les spans sans toucher au DOM
    const tmp = document.createElement('div');
    tmp.innerHTML = editor.innerHTML;

    // Regrouper les éléments surlignés par folderId avant de sauvegarder
    const highlightedSpans = tmp.querySelectorAll('[data-folder]');
    const byFolder = new Map();
    highlightedSpans.forEach(span => {
        const fid = span.getAttribute('data-folder');
        if (!byFolder.has(fid)) byFolder.set(fid, []);
        byFolder.get(fid).push(span);
    });

    const batch = db.batch();
    let hasFragments = false;

    byFolder.forEach((spans, fid) => {
        const html = spans.map(s => {
            // Si un surlignage décoratif existait avant l'association, on le restaure dans le fragment
            const rawContent = s.hasAttribute('data-original-html')
                ? s.getAttribute('data-original-html')
                : s.innerHTML;
            const content = _stripHighlightStyle(rawContent);
            let el = s.parentElement;
            while (el && el !== tmp) {
                const tag = el.tagName.toLowerCase();
                if (['h1','h2','h3','h4','h5','h6'].includes(tag)) return `<${tag}>${content}</${tag}>`;
                el = el.parentElement;
            }
            return content;
        }).join('<p><br></p>');
        const plain = spans.map(s => (s.textContent || '').trim()).join('\n').trim();
        if (!plain) { spans.forEach(s => s.remove()); return; }
        const ref = db.collection("blocNoteFragments").doc();
        batch.set(ref, { text: html, plainText: plain, title: title || '', folderId: fid, userId: currentUser.uid, createdAt: Date.now() });
        spans.forEach(s => s.remove());
        hasFragments = true;
    });

    const remainingContent = tmp.innerHTML;
    const remainingText = (tmp.textContent || '').trim();

    const saveFragments = hasFragments ? batch.commit() : Promise.resolve();

    saveFragments.then(() => {
        if (remainingText) {
            const data = { content: remainingContent, title: title || '', updatedAt: Date.now(), userId: currentUser.uid };
            if (_editingNoteId) {
                return db.collection("blocNotes").doc(_editingNoteId).update(data);
            } else {
                return db.collection("blocNotes").add({ ...data, createdAt: Date.now() });
            }
        } else if (_editingNoteId) {
            return db.collection("blocNotes").doc(_editingNoteId).delete();
        }
    }).then(() => {
        const msg = hasFragments ? `Archivé dans les dossiers ! ✅` : `Note enregistrée ! ✅`;
        showToast(msg);
        closeNote();
    }).catch(err => showToast("Erreur : " + err.message));
}

function deleteNote() {
    if (!_editingNoteId) return;
    showConfirmModal("Supprimer cette note ?", () => {
        db.collection("blocNotes").doc(_editingNoteId).delete()
            .then(() => { showToast("Note supprimée !"); closeNote(); });
    });
}

// ---- SURLIGNAGE → ARCHIVAGE IMMÉDIAT ----
function renderHighlightBar() {
    const container = document.getElementById('blocnote-highlight-btns');
    if (!container) return;
    if (blocNoteFolders.length === 0) {
        container.innerHTML = `
            <span style="font-size:0.75rem; opacity:0.5; font-style:italic;">Aucun dossier —</span>
            <button onclick="openCreateFolderModal()" style="background:none; border:1.5px dashed rgba(128,128,128,0.4); border-radius:14px; padding:3px 10px; font-size:0.75rem; color:var(--primary); cursor:pointer; margin-left:4px;">+ Créer un dossier</button>`;
        return;
    }
    container.innerHTML = blocNoteFolders.map(f => {
        const active = _pendingFolderId === f.id;
        return `<button onmousedown="event.preventDefault()" onclick="selectFolderForHighlight('${f.id}', '${f.color}')"
            style="background:${active ? f.color + '55' : f.color + '22'}; border:${active ? '2px' : '1.5px'} solid ${f.color}; border-radius:16px; padding:5px 13px; font-size:0.78rem; color:var(--text-color); cursor:pointer; display:flex; align-items:center; gap:5px; ${active ? 'font-weight:600;box-shadow:0 0 0 3px ' + f.color + '44;' : ''}">
            <span style="width:8px; height:8px; border-radius:50%; background:${f.color}; display:inline-block;"></span>${f.name}
        </button>`;
    }).join('') +
    `<button onmousedown="event.preventDefault()" onclick="removeHighlight()"
        style="background:rgba(128,128,128,0.1); border:1.5px solid rgba(128,128,128,0.35); border-radius:16px; padding:5px 13px; font-size:0.78rem; color:var(--text-color); cursor:pointer; display:flex; align-items:center; gap:5px;">
        <span style="width:8px; height:8px; border-radius:50%; border:2px solid rgba(128,128,128,0.5); display:inline-block;"></span>Annuler
    </button>`;
}

function selectFolderForHighlight(folderId, color) {
    if (_pendingFolderId === folderId) {
        _pendingFolderId = null;
        _pendingFolderColor = null;
        showToast("Mode association désactivé");
    } else {
        _pendingFolderId = folderId;
        _pendingFolderColor = color;
        const folder = blocNoteFolders.find(f => f.id === folderId);
        showToast(`Sélectionne le texte à associer à "${folder ? folder.name : ''}"`);
    }
    renderHighlightBar();
}

function removeHighlight() {
    if (_pendingFolderId) {
        _pendingFolderId = null;
        _pendingFolderColor = null;
        renderHighlightBar();
        showToast("Mode association annulé");
        return;
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) {
        showToast("Sélectionne du texte surligné d'abord !");
        return;
    }
    const range = sel.getRangeAt(0);
    const editor = document.getElementById('blocnote-editor-content');
    const spans = [...editor.querySelectorAll('[data-folder]')];
    let removed = 0;
    spans.forEach(span => {
        if (range.intersectsNode(span)) {
            const parent = span.parentNode;
            while (span.firstChild) parent.insertBefore(span.firstChild, span);
            parent.removeChild(span);
            removed++;
        }
    });
    if (removed === 0) showToast("Aucun surlignage trouvé dans la sélection.");
    else showToast("Surlignage retiré ✕");
}

function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const editor = document.getElementById('blocnote-editor-content');
        if (editor.contains(range.commonAncestorContainer)) {
            _savedSelection = range.cloneRange();
        }
    }
}

function applyHighlight(folderId, color) {
    const editor = document.getElementById('blocnote-editor-content');
    const sel = window.getSelection();

    if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) {
        showToast("Sélectionne du texte d'abord !");
        return;
    }

    const folder = blocNoteFolders.find(f => f.id === folderId);
    if (!folder) return;

    const range = sel.getRangeAt(0);

    // Cherche si la sélection est entièrement à l'intérieur d'un élément
    // portant un surlignage décoratif (bouton ✏, sans data-folder)
    let ancestor = range.commonAncestorContainer;
    if (ancestor.nodeType === Node.TEXT_NODE) ancestor = ancestor.parentElement;
    let userHighlight = null;
    let el = ancestor;
    while (el && el !== editor) {
        if (el.style && el.style.backgroundColor && !el.hasAttribute('data-folder')) {
            userHighlight = el;
            break;
        }
        el = el.parentElement;
    }

    // Sauvegarde le surlignage décoratif existant (bouton ✏) avant que execCommand
    // ne le remplace, pour le restaurer dans le fragment sauvegardé
    const originalHtml = userHighlight
        ? `<span style="background-color:${userHighlight.style.backgroundColor};">${userHighlight.innerHTML}</span>`
        : null;

    const before = new Set(editor.querySelectorAll('[data-folder]'));
    document.execCommand('backColor', false, color);
    editor.querySelectorAll('[style*="background"]').forEach(el => {
        if (!before.has(el)) {
            el.setAttribute('data-folder', folderId);
            if (originalHtml) el.setAttribute('data-original-html', originalHtml);
        }
    });

    updateBlocNotePlaceholder(editor);
    showToast(`Associé à "${folder.name}" — clique Enregistrer pour archiver`);
}

// ---- ÉDITION D'UN FRAGMENT (dans l'éditeur principal) ----
function openEditFragmentModal(fragId) {
    const frag = blocNoteFragments.find(f => f.id === fragId);
    if (!frag) return;
    _editingFragmentId = fragId;
    _editingNoteId = null;
    const editor = document.getElementById('blocnote-editor-content');
    editor.innerHTML = frag.text || '';
    const titleEl = document.getElementById('blocnote-editor-title');
    titleEl.value = frag.title || '';
    titleEl.style.display = '';
    updateBlocNotePlaceholder(editor);
    document.getElementById('blocnote-list-view').style.display = 'none';
    document.getElementById('blocnote-editor-view').style.display = 'flex';
    updateFormatButtons();
}

function saveFragmentEdit() {
    if (!_editingFragmentId) return;
    const editor = document.getElementById('blocnote-editor-content');
    const newText = editor.innerHTML;
    const plainText = (editor.textContent || '').trim();
    const title = (document.getElementById('blocnote-editor-title').value || '').trim();
    db.collection("blocNoteFragments").doc(_editingFragmentId).update({ text: newText, plainText, title: title || '' })
        .then(() => {
            showToast("Fragment modifié ! ✅");
            _editingFragmentId = null;
            closeNote();
        }).catch(err => showToast("Erreur : " + err.message));
}

function deleteFragment(fragId) {
    showConfirmModal("Supprimer ce fragment ?", () => {
        db.collection("blocNoteFragments").doc(fragId).delete()
            .catch(err => showToast("Erreur : " + err.message));
    });
}

// ---- GESTION DOSSIERS ----
function openCreateFolderModal() {
    _editingFolderId = null;
    document.getElementById('blocnote-folder-modal-title').textContent = '📁 Nouveau dossier';
    document.getElementById('blocnote-folder-name').value = '';
    document.getElementById('blocnote-folder-color-picker').value = '#00CED1';
    document.getElementById('blocnote-folder-modal').style.display = 'flex';
}

function openEditFolderModal(folderId) {
    const folder = blocNoteFolders.find(f => f.id === folderId);
    if (!folder) return;
    _editingFolderId = folderId;
    document.getElementById('blocnote-folder-modal-title').textContent = '✏️ Modifier le dossier';
    document.getElementById('blocnote-folder-name').value = folder.name;
    document.getElementById('blocnote-folder-color-picker').value = folder.color;
    document.getElementById('blocnote-folder-modal').style.display = 'flex';
}

function saveFolder() {
    const name = document.getElementById('blocnote-folder-name').value.trim();
    if (!name) { showToast("Donne un nom au dossier !"); return; }
    const color = document.getElementById('blocnote-folder-color-picker').value;

    if (_editingFolderId) {
        db.collection("blocNoteFolders").doc(_editingFolderId).update({ name, color })
            .then(() => {
                showToast("Dossier modifié ! ✅");
                document.getElementById('blocnote-folder-modal').style.display = 'none';
                _editingFolderId = null;
            }).catch(err => showToast("Erreur : " + err.message));
    } else {
        db.collection("blocNoteFolders").add({ name, color, userId: currentUser.uid, createdAt: Date.now() })
            .then(() => {
                showToast(`Dossier "${name}" créé ! 📁`);
                document.getElementById('blocnote-folder-modal').style.display = 'none';
            }).catch(err => showToast("Erreur : " + err.message));
    }
}

function deleteFolder(folderId) {
    const folder = blocNoteFolders.find(f => f.id === folderId);
    if (!folder) return;
    showConfirmModal(
        `Le dossier "${folder.name}" et tous ses fragments archivés seront supprimés.`,
        () => {
            const batch = db.batch();
            batch.delete(db.collection("blocNoteFolders").doc(folderId));
            blocNoteFragments.filter(f => f.folderId === folderId)
                .forEach(f => batch.delete(db.collection("blocNoteFragments").doc(f.id)));
            blocNotes.filter(n => Array.isArray(n.folders) && n.folders.includes(folderId))
                .forEach(n => batch.delete(db.collection("blocNotes").doc(n.id)));
            batch.commit().then(() => {
                if (_selectedFolderId === folderId) selectBlocNoteFolder(null);
                showToast(`Dossier "${folder.name}" supprimé !`);
            }).catch(err => showToast("Erreur : " + err.message));
        },
        { title: `Supprimer "${folder.name}" ?`, icon: '📁' }
    );
}

// ---- EXPORT PDF ----
function _openPrintWindow(title, bodyHtml, accentColor) {
    accentColor = accentColor || '#00CED1';
    const win = window.open('', '_blank');
    if (!win) { showToast("Autorise les popups pour exporter en PDF !"); return; }
    win.document.write(`<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 40px auto; padding: 0 24px 60px; color: #1a1a1a; line-height: 1.85; font-size: 15px; }
  h1 { font-size: 1.5rem; color: ${accentColor}; border-bottom: 2px solid ${accentColor}; padding-bottom: 10px; margin-bottom: 24px; font-family: sans-serif; }
  .badge { display: inline-block; font-size: 0.7rem; background: ${accentColor}22; color: ${accentColor}; border-radius: 10px; padding: 2px 8px; margin-left: 6px; vertical-align: middle; font-family: sans-serif; }
  .item { margin: 0 0 24px; padding: 18px 20px; border-left: 4px solid ${accentColor}; background: #f9f9f9; border-radius: 0 8px 8px 0; }
  .item-date { font-size: 0.72rem; color: #888; margin-bottom: 8px; font-family: sans-serif; }
  hr.sep { border: none; border-top: 1px solid #e0e0e0; margin: 20px 0; }
  @media print { body { margin: 0; padding: 24px; max-width: 100%; } button { display: none !important; } }
  .print-btn { position: fixed; bottom: 20px; right: 20px; background: ${accentColor}; color: #fff; border: none; border-radius: 20px; padding: 10px 22px; font-size: 0.9rem; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.2); font-family: sans-serif; }
</style>
</head><body>
<h1>${title}</h1>
${bodyHtml}
<button class="print-btn" onclick="window.print()">🖨 Imprimer / Enregistrer en PDF</button>
</body></html>`);
    win.document.close();
}

function exportBlocNotePdf(type, id) {
    if (type === 'note') {
        const note = blocNotes.find(n => n.id === id);
        if (!note) return;
        const date = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString('fr-FR') : '';
        const isMerged = Array.isArray(note.folders) && note.folders.length > 0;
        const badge = isMerged ? `<span class="badge">📝 Note fusionnée</span>` : '';
        const titleHtml = note.title ? `<h2 style="margin-bottom:8px;">${note.title}</h2>` : '';
        const body = `<div class="item"><div class="item-date">${date}</div>${titleHtml}${note.content || ''}${badge}</div>`;
        _openPrintWindow(note.title || 'Note — LIST\'ME', body);

    } else if (type === 'fragment') {
        const frag = blocNoteFragments.find(f => f.id === id);
        if (!frag) return;
        const folder = blocNoteFolders.find(f => f.id === frag.folderId);
        const color = folder ? folder.color : '#00CED1';
        const pdfTitle = frag.title || (folder ? `📁 ${folder.name}` : 'Fragment');
        const date = frag.createdAt ? new Date(frag.createdAt).toLocaleDateString('fr-FR') : '';
        const badge = frag.merged ? `<span class="badge">🔗 Fusionné</span>` : '';
        const titleHtml = frag.title ? `<h2 style="margin-bottom:8px;">${frag.title}</h2>` : '';
        const body = `<div class="item"><div class="item-date">${date}</div>${titleHtml}${frag.text}${badge}</div>`;
        _openPrintWindow(pdfTitle, body, color);

    } else if (type === 'folder') {
        const folder = blocNoteFolders.find(f => f.id === id);
        if (!folder) return;
        const frags = blocNoteFragments.filter(f => f.folderId === id);
        const mergedNotes = blocNotes.filter(n => Array.isArray(n.folders) && n.folders.includes(id));
        const fragsHtml = frags.map(fr => {
            const date = fr.createdAt ? new Date(fr.createdAt).toLocaleDateString('fr-FR') : '';
            const badge = fr.merged ? `<span class="badge">🔗 Fusionné</span>` : '';
            return `<div class="item"><div class="item-date">${date}</div>${fr.text}${badge}</div>`;
        }).join('');
        const notesHtml = mergedNotes.map(n => {
            const date = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('fr-FR') : '';
            return `<div class="item"><div class="item-date">${date}</div>${n.content || ''}<span class="badge">📝 Note fusionnée</span></div>`;
        }).join('');
        _openPrintWindow(`📁 ${folder.name} — LIST'ME`, fragsHtml + notesHtml, folder.color);
    }
}

function exportBlocNotePdfMultiFrags(ids) {
    const frags = ids.map(id => blocNoteFragments.find(f => f.id === id)).filter(Boolean);
    const folderId = frags[0] && frags[0].folderId;
    const folder = blocNoteFolders.find(f => f.id === folderId);
    const color = folder ? folder.color : '#00CED1';
    const body = frags.map(fr => {
        const date = fr.createdAt ? new Date(fr.createdAt).toLocaleDateString('fr-FR') : '';
        const badge = fr.merged ? `<span class="badge">🔗 Fusionné</span>` : '';
        return `<div class="item"><div class="item-date">${date}</div>${fr.text}${badge}</div>`;
    }).join('');
    _openPrintWindow(folder ? `📁 ${folder.name} (sélection)` : 'Sélection', body, color);
}

function exportBlocNotePdfMultiNotes(ids) {
    const notes = ids.map(id => blocNotes.find(n => n.id === id)).filter(Boolean);
    const body = notes.map(n => {
        const date = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('fr-FR') : '';
        const badge = Array.isArray(n.folders) && n.folders.length ? `<span class="badge">📝 Note fusionnée</span>` : '';
        return `<div class="item"><div class="item-date">${date}</div>${n.content || ''}${badge}</div>`;
    }).join('');
    _openPrintWindow(`Notes (${notes.length}) — LIST'ME`, body);
}

document.addEventListener('DOMContentLoaded', _initEditorSelectionListener);
