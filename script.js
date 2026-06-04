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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(), auth = firebase.auth();

// --- VARIABLES D'ÉTAT LOCALES ---
let tasks = [], sharedTasks = [], dailyTodo = [], weeklyTodo = [], routineTodo = [], birthdays = [];
let shoppingItems = []; // Contient uniquement les produits de la liste active sélectionnée
let mySharedLists = []; // Liste des groupes/listes partagées de l'utilisateur
let customShoppingCards = []; 
let friends = []; 
let friendUnsubscribes = {};
let unsubscribeUser, sharedListsUnsubscribe, shoppingItemsUnsubscribe;
let currentUser = null, userNickname = "", hasShownWelcomeThisSession = false, taskSubView = "active"; 
let currentShoppingListId = "personal"; // Stocke "personal" ou l'ID Firebase de la liste partagée active
let myAgendaCode = ""; 

// --- VARIABLES DE CONTRÔLE ET RECHERCHE ---
let currentShoppingPath = []; 
let currentShareMode = 'agenda';
let isArchiving = false;
let shoppingSearchQuery = ""; 

let currentTheme = localStorage.getItem('listme_theme') || 'pink', viewState = 'day', todoMode = 'daily', editingId = null, editingTodoId = null; 
let selectedYear = new Date().getFullYear(), selectedMonth = new Date().getMonth();
let todayStr = new Date().toISOString().split('T')[0];
let lastCheckedDayStr = todayStr;
const currentDayOfWeek = new Date().getDay();
const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const dayInitials = ["D", "L", "M", "M", "J", "V", "S"], dayNamesFr = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
document.body.className = `theme-${currentTheme}`;

// --- DICTIONNAIRE DES COURSES ---
const foodCategories = {
    "🥩 Viandes": {
        "Volailles": {
            "Poulet": ["Entier (Poulet)", "Filet (Poulet)", "Cuisse (Poulet)", "Pilon (Poulet)", "Aiguillette (Poulet)"],
            "Dinde": ["Escalope (Dinde)", "Filet (Dinde)", "Rôti (Dinde)", "Cuisse (Dinde)"],
            "Canard": ["Magret (Canard)", "Cuisse (Canard)", "Entier (Canard)", "Aiguillette (Canard)"]
        },
        "Bœuf": ["Steak haché (Bœuf)", "Entrecôte (Bœuf)", "Faux-filet (Bœuf)", "Bavette (Bœuf)", "Onglet (Bœuf)", "Rôti (Bœuf)", "Paleron (Bœuf)", "Macreuse (Bœuf)"],
        "Porc": ["Côtes (Porc)", "Lardons (Porc)", "Poitrine fumée (Porc)", "Filet mignon (Porc)", "Rôti (Porc)", "Échine (Porc)"],
        "Veau": ["Escalope (Veau)", "Rôti (Veau)", "Paupiettes (Veau)", "Côtes (Veau)", "Tendron (Veau)", "Épaule (Veau)"],
        "Agneau": ["Côtelettes (Agneau)", "Gigot (Agneau)", "Épaule (Agneau)", "Souris (Agneau)", "Collier (Agneau)"]
    },
    "🐟 Poissons": {
        "Poissons Frais": ["Saumon", "Cabillaud", "Merlu", "Dorade", "Thon"],
        "Fruits de Mer": {
            "Coquillages": ["Moules", "Huîtres", "Coquilles Saint-Jacques", "Palourdes"],
            "Crustacés": ["Crevettes", "Langoustines", "Crabe", "Homard"]
        }
    },
    "🥦 Légumes": {
        "Légumes": [
            "Carottes", "Tomates", "Pommes de terre", "Oignons", "Salade", 
            "Courgettes", "Poireaux", "Concombres", "Poivrons", "Épinards", 
            "Brocolis", "Chou-fleur", "Haricots verts", "Petits pois", "Radis", 
            "Champignons", "Aubergines", "Asperges", "Céleri", "Ail", 
            "Échalotes", "Navets", "Chou de Bruxelles"
        ],
        "Courges": ["Potiron", "Butternut", "Potimarron", "Citrouille", "Courge spaghetti", "Pâtisson"],
        "Herbes diverses": ["Persil", "Ciboulette", "Basilic", "Menthe", "Coriandre", "Thym", "Romarin", "Aneth"]
    },
    "🍎 Fruits": {
        "Fruits": [
            "Pommes", "Bananes", "Oranges", "Citrons", "Kiwis", 
            "Poires", "Pêches", "Nectarines", "Abricots", "Melons", 
            "Pastèques", "Prunes", "Raisins", "Clémentines", "Pamplemousses", 
            "Figues", "Mandarines"
        ],
        "Fruits rouges": ["Fraises", "Framboises", "Myrtilles", "Mûres", "Cerises", "Groseilles", "Cassis"],
        "Fruits exotiques": ["Ananas", "Mangue", "Fruit de la passion", "Litchi", "Noix de coco", "Avocats", "Grenades", "Papayes", "Kaki"]
    },
    "🧀 Laitages": {
        "Fromages": [
            "Emmental râpé", "Camembert", "Chèvre", "Raclette", "Mozzarella",
            "Comté", "Roquefort", "Brie", "Coulommiers", "Reblochon", "Cantal", 
            "Gouda", "Parmesan", "Feta", "Boursin", "Kiri", "Tartare", 
            "Tomme de Savoie", "Saint-Nectaire", "Gruyère"
        ],
        "Crèmerie": ["Lait demi-écrémé", "Beurre doux", "Beurre salé", "Crème fraîche", "Oeufs"],
        "Desserts": ["Yaourts nature", "Yaourts aux fruits", "Crèmes dessert"]
    },
    "🍝 Épicerie Salée": {
        "Féculents": ["Riz", "Lentilles", "Quinoa", "Semoule"],
        "Pâtes": [
            "Coquillettes", "Spaghetti", "Penne", "Macaroni", "Tagliatelles", 
            "Farfalle", "Fusilli", "Nouilles", "Linguine", "Cannelloni", 
            "Vermicelles", "Crozets", "Rigatoni", "Orecchiette", "Pappardelle"
        ],
        "Conserves": ["Sauce tomate", "Haricots verts", "Thon en boîte", "Maïs"],
        "Condiments": [
            "Huile d'olive", "Vinaigre", "Sel", "Poivre", "Moutarde", 
            "Mayonnaise", "Ketchup", "Sauce Barbecue", "Sauce Burger", 
            "Sauce Béarnaise", "Sauce Soja"
        ]
    },
    "🥨 Apéritif": { 
        "Chips & Snacks": [
            "Chips", "Pringles", "Cacahuètes", "Pistaches", "Noix de cajou",
            "Olives", "Biscuits apéritifs", "Chips paysannes", "Doritos", "Curly"
        ],
        "Tartinables": ["Tapenade", "Guacamole", "Houmous"]
    },
    "🍪 Épicerie Sucrée": {
        "Petit-déjeuner": ["Céréales", "Confiture", "Pâte à tartiner", "Café", "Thé"],
        "Goûter": ["Gâteaux", "Chocolat", "Biscuits", "Bonbons"]
    },
    "❄️ Surgelés": {
        "Légumes": ["Frites", "Poêlée de légumes", "Épinards", "Haricots verts"],
        "Plats": ["Plat préparé", "Bâtonnets de poisson", "Lasagnes"],
        "Pizzas": ["Pizza 4 fromages", "Pizza Margherita", "Pizza Royale"],
        "Glaces": ["Bacs de glace", "Cônes", "Bâtonnets", "Sorbets"]
    },
    "🥤 Boissons": {
        "Eaux": ["Eau plate", "Eau gazeuse"],
        "Jus": [
            "Jus d'orange", "Jus de pomme", "Multifruits", "Jus de raisin", 
            "Jus d'ananas", "Jus de pamplemousse", "Jus de tomate", 
            "Jus de clémentine", "Jus de mandarine", "Jus de mangue", 
            "Nectar d'abricot", "Nectar de poire", "Jus de grenade", "Jus de citron"
        ],
        "Sirops": [
            "Sirop de grenadine", "Sirop de menthe", "Sirop de fraise", 
            "Sirop de pêche", "Sirop de citron", "Sirop d'orgeat", 
            "Sirop de cassis", "Sirop de framboise", "Sirop de cerise", 
            "Sirop de kiwi", "Sirop de pamplemousse", "Sirop de menthe glaciale", 
            "Sirop de violette"
        ],
        "Sodas": [
            "Coca-Cola", "Limonade", "Ice Tea", "Orangina", "Fanta", 
            "Oasis", "7Up", "Sprite", "Schweppes", "Red Bull"
        ]
    },
    "🍷 Cave": {
        "Vins": ["Vin rouge", "Vin blanc", "Vin rosé"],
        "Bières": [
            "Desperados", "Corona", "Skøll", "Bière blonde", 
            "Bière blanche", "Bière brune", "Pack de bières"
        ],
        "Spiritueux": [
            "Ricard", "Pastis", "Rhum", "Vodka", "Whisky", "Gin", 
            "Tequila", "Get 27", "Baileys", "Cognac", "Martini"
        ]
    },
    "🥖 Boulangerie": {
        "Pains": [
            "Baguette", "Baguette tradition", "Pain de mie", "Pain de campagne", 
            "Pain complet", "Pain aux céréales", "Pains Burger (Buns)", 
            "Pains Pita", "Wraps"
        ],
        "Viennoiseries": [
            "Croissants", "Pains au chocolat", "Brioches", "Chaussons aux pommes", 
            "Pains aux raisins", "Chouquettes", "Pains au lait", "Croissants aux amandes"
        ],
        "Pâtisserie": [
            "Tarte aux pommes", "Éclair au chocolat", "Mille-feuille", 
            "Paris-Brest", "Flan parisien", "Religieuse", "Tarte au citron", "Fraisier"
        ],
        "Aide à la pâtisserie": ["Farine", "Sucre", "Levure", "Extrait de vanille", "Pépites de chocolat"]
    },
    "🥓 Charcuterie": [
        "Jambon blanc", "Saucisson", "Chorizo", "Pâté", "Lardons", "Saucisses"
    ],
    "👶 Bébé": {
        "Repas": ["Lait en poudre", "Petits pots salés", "Compotes"],
        "Change & Soin": ["Couches", "Lingettes", "Coton", "Liniment"]
    },
    "🐾 Animaux": {
        "Chiens": ["Croquettes chien", "Pâtée chien", "Friandises chien"],
        "Chats": ["Croquettes chat", "Pâtée chat", "Litière"],
        "Rongeurs": ["Foin", "Granulés cobaye", "Litière chanvre"],
        "Oiseaux": ["Graines oiseaux", "Millet", "Fond de cage"],
        "Poissons": ["Flocons", "Granulés", "Filtre"]
    },
    "🧴 Soin & Beauté": {
        "Douche & Cheveux": ["Gel douche", "Shampoing", "Après-shampoing", "Savon"],
        "Hygiène & Visage": ["Dentifrice", "Brosse à dents", "Déodorant", "Crème visage", "Coton-tiges"]
    },
    "🧻 Entretien & Hygiène": {
        "Papier": ["Papier toilette", "Sopalin", "Mouchoirs"],
        "Ménage": ["Liquide vaisselle", "Lessive", "Adoucissant", "Éponge", "Nettoyant sol", "Javel"]
    }
};

// --- UTILITAIRES ---
function getCustomTime(prefix) { let h = document.getElementById(prefix + '-h'), m = document.getElementById(prefix + '-m'); if(!h || !m) return ""; let hVal = h.value.trim(), mVal = m.value.trim(); if(hVal) return `${hVal.padStart(2, '0')}:${mVal ? mVal.padStart(2, '0') : "00"}`; return ""; }
function setCustomTime(prefix, timeStr) { let h = document.getElementById(prefix + '-h'), m = document.getElementById(prefix + '-m'); if(!h || !m) return; if(timeStr) { let p = timeStr.split(':'); h.value = p[0]; m.value = p[1]; } else { h.value = ""; m.value = ""; } }
function disableCustomTime(prefix, disable) { let h = document.getElementById(prefix + '-h'), m = document.getElementById(prefix + '-m'); if(h) h.disabled = disable; if(m) m.disabled = disable; }
function getFrenchHolidays(year) { const holidays = []; const addDate = (m, d, name) => holidays.push({ date: `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, name: name }); addDate(1, 1, "Jour de l'An"); addDate(5, 1, "Fête du Travail"); addDate(5, 8, "Victoire 1945"); addDate(7, 14, "Fête Nationale"); addDate(8, 15, "Assomption"); addDate(11, 1, "Toussaint"); addDate(11, 11, "Armistice 1918"); addDate(12, 25, "Noël"); const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), n0 = (h + l + 7 * m + 114), n = Math.floor(n0 / 31) - 1, p = n0 % 31 + 1; let easter = new Date(year, n, p); let lundiPaques = new Date(easter); lundiPaques.setDate(easter.getDate() + 1); addDate(lundiPaques.getMonth() + 1, lundiPaques.getDate(), "Lundi de Pâques"); let ascension = new Date(easter); ascension.setDate(easter.getDate() + 39); addDate(ascension.getMonth() + 1, ascension.getDate(), "Ascension"); let lundiPentecote = new Date(easter); lundiPentecote.setDate(easter.getDate() + 50); addDate(lundiPentecote.getMonth() + 1, lundiPentecote.getDate(), "Lundi de Pentecôte"); return holidays; }
function showToast(message) { const toast = document.getElementById('toast-notification'); if (!toast) return; toast.innerText = message; toast.className = "toast-show"; setTimeout(() => { toast.className = "toast-hidden"; }, 3000); }
function changeTheme(t) { document.body.className = `theme-${t}`; localStorage.setItem('listme_theme', t); }
function unlockModalFields() { const nameF = document.getElementById('task-name'), descF = document.getElementById('task-desc'), impF = document.getElementById('task-importance'), labelF = document.getElementById('date-input-label'); if(nameF) nameF.disabled = false; if(descF) descF.disabled = false; if(impF) impF.disabled = false; if(labelF) labelF.innerText = "Date"; disableCustomTime('task-time', false); disableCustomTime('todo-time', false); document.querySelectorAll('.reminder-badge').forEach(b => { b.style.pointerEvents = 'auto'; b.classList.remove('disabled-frozen'); }); const duplicateTags = document.getElementById('duplicate-dates-tags'); if(duplicateTags) duplicateTags.innerHTML = ""; }

function showPage(p) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(`${p}-page`); if (target) target.style.display = 'block';
    document.querySelectorAll('.nav-bubble').forEach(btn => btn.classList.remove('active'));
    const currentNavBtn = document.getElementById(`nav-btn-${p}`); if (currentNavBtn) currentNavBtn.classList.add('active');
    
    if(p === 'calendar') renderCalendar(); 
    if(p === 'todo') renderTodo(); 
    if(p === 'tasks') renderTasks();
    if(p === 'shopping') { renderShoppingCategories(); renderShoppingTabs(); syncCurrentShoppingItems(); }
}

function switchTaskSubView(view) {
    taskSubView = view; document.querySelectorAll('.sub-menu-tab').forEach(b => b.classList.remove('active'));
    const actionBar = document.getElementById('tasks-action-bar'), archiveSearch = document.getElementById('archive-search-bar');
    if(view === 'active') { document.getElementById('sub-btn-active-tasks').classList.add('active'); if(actionBar) actionBar.style.display = 'flex'; if(archiveSearch) archiveSearch.style.display = 'none'; } 
    else { document.getElementById('sub-btn-archived-tasks').classList.add('active'); if(actionBar) actionBar.style.display = 'none'; if(archiveSearch) archiveSearch.style.display = 'flex'; }
    renderTasks();
}

// --- LOGIQUE DES COURSES & CARTES CUSTOM MÈRES ---
function shoppingNavigateTo(cat) { 
    shoppingSearchQuery = ""; 
    currentShoppingPath.push(cat); 
    renderShoppingCategories(); 
}

function formatProductDisplay(name) {
    return name.replace(/\(([^)]+)\)/g, '<span style="color:transparent; font-size:0; opacity:0; pointer-events:none;">($1)</span>');
}

function shoppingNavigateBack() { 
    shoppingSearchQuery = ""; 
    currentShoppingPath.pop(); 
    renderShoppingCategories(); 
}

function renderShoppingCategories() {
    const container = document.getElementById('shopping-categories');
    const breadcrumb = document.getElementById('shopping-breadcrumb');
    if(!container || !breadcrumb) return;

    let isFocused = (document.activeElement && document.activeElement.id === 'shopping-search');
    container.innerHTML = '';
    const currentPathStr = currentShoppingPath.join('/');

    if (currentShoppingPath.length === 0) { breadcrumb.innerText = ''; } 
    else { breadcrumb.innerText = currentShoppingPath[currentShoppingPath.length - 1]; }

    const isAtRoot = (currentShoppingPath.length === 0);

    let navRowHtml = `<div style="grid-column: 1 / -1; display: flex; gap: 10px; width: 100%; align-items: center; margin-bottom: 5px;">`;
    navRowHtml += `<div onclick="${isAtRoot ? '' : 'shoppingNavigateBack()'}" style="flex: 1; background:rgba(128,128,128,0.1); color:var(--text-color); padding:12px; border-radius:12px; text-align:center; font-weight:bold; white-space: nowrap; border: 1px dashed rgba(128,128,128,0.3); ${isAtRoot ? 'opacity: 0.3; cursor: default; pointer-events: none;' : 'cursor: pointer;'}-webkit-user-select: none; user-select: none;">⬅️ Retour</div>`;
    navRowHtml += `<input type="text" id="shopping-search" placeholder="🔍 Rechercher un produit..." oninput="handleShoppingSearch(this.value)" value="${shoppingSearchQuery}" style="flex: 2; padding: 12px; border-radius: 12px; border: 1px solid rgba(128,128,128,0.3); background: var(--card-bg); color: var(--text-color); font-size: 1rem; font-weight: bold; outline: none;">`;
    navRowHtml += `</div>`;
    
    container.innerHTML += navRowHtml;
    container.innerHTML += `<div onclick="openCustomCardModal()" style="grid-column: 1 / -1; background:var(--primary); color:white; padding:10px; border-radius:20px; text-align:center; font-weight:bold; cursor:pointer; width: 70%; margin: 0 auto 10px auto; box-shadow:0 4px 6px rgba(0,0,0,0.1);">+ Nouveau Produit</div>`;

    if (shoppingSearchQuery.trim() !== "") {
        let matches = [];
        let q = shoppingSearchQuery.toLowerCase().trim();

        function extractMatches(obj) {
            if (Array.isArray(obj)) {
                obj.forEach(p => {
                    if (p.toLowerCase().includes(q) && !matches.some(m => m.name === p)) {
                        matches.push({ name: p, isCustom: false });
                    }
                });
            } else if (typeof obj === 'object' && obj !== null) {
                for (let key in obj) { extractMatches(obj[key]); }
            }
        }
        extractMatches(foodCategories);

        customShoppingCards.forEach(card => {
            if (card.name.toLowerCase().includes(q) && !matches.some(m => m.id === card.id)) {
                matches.push({ name: card.name, id: card.id, isCustom: true });
            }
        });

        if (matches.length === 0) {
            container.innerHTML += `<p style="grid-column: 1 / -1; text-align:center; opacity:0.5; font-style:italic; margin-top:10px;">Aucun produit trouvé pour "${shoppingSearchQuery}"</p>`;
        } else {
            matches.forEach(product => {
                if (product.isCustom) {
                    const safeId = product.id.replace(/'/g, "\\'");
                    container.innerHTML += `<div onclick="openShoppingItemModal('${safeId}', true)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.05); font-weight:bold; cursor:pointer; border:2px dashed var(--primary); transition: transform 0.2s;">+ ${product.name}</div>`;
                } else {
                    const safeName = product.name.replace(/'/g, "\\'");
                    container.innerHTML += `<div onclick="openShoppingItemModal('${safeName}', false)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.05); font-weight:bold; cursor:pointer; border:1px solid rgba(128,128,128,0.2); transition: transform 0.2s;">+ ${formatProductDisplay(product.name)}</div>`;
                }
            });
        }
    } else {
        let defaultFolders = [], defaultProducts = [];
        let currentObj = foodCategories;
        let validDefaultPath = true;

        for (let step of currentShoppingPath) {
            if (currentObj && currentObj[step]) { currentObj = currentObj[step]; } 
            else { validDefaultPath = false; break; }
        }

        if (validDefaultPath && currentObj) {
            if (Array.isArray(currentObj)) defaultProducts = currentObj;
            else defaultFolders = Object.keys(currentObj);
        }

        const customProducts = customShoppingCards.filter(c => c.path === currentPathStr);

        defaultFolders.forEach(cat => {
            const safeCat = cat.replace(/'/g, "\\'");
            container.innerHTML += `<div onclick="shoppingNavigateTo('${safeCat}')" style="background:var(--primary); color:white; padding:15px; border-radius:12px; text-align:center; font-weight:bold; cursor:pointer; box-shadow:0 4px 6px rgba(0,0,0,0.1);">${cat}</div>`;
        });

        defaultProducts.forEach(product => {
            const safeProduct = product.replace(/'/g, "\\'");
            container.innerHTML += `<div onclick="openShoppingItemModal('${safeProduct}', false)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.05); font-weight:bold; cursor:pointer; border:1px solid rgba(128,128,128,0.2); transition: transform 0.2s;">+ ${formatProductDisplay(product)}</div>`;
        });

        customProducts.forEach(product => {
            const safeId = product.id.replace(/'/g, "\\'");
            container.innerHTML += `<div onclick="openShoppingItemModal('${safeId}', true)" style="background:var(--card-bg); padding:15px; border-radius:12px; text-align:center; box-shadow:0 4px 6px rgba(0,0,0,0.05); font-weight:bold; cursor:pointer; border:2px dashed var(--primary); transition: transform 0.2s;">+ ${product.name}</div>`;
        });
    }

    if (isFocused) {
        const input = document.getElementById('shopping-search');
        if (input) {
            input.focus();
            const val = input.value; input.value = ''; input.value = val; 
        }
    }
}

function handleShoppingSearch(val) {
    shoppingSearchQuery = val;
    renderShoppingCategories();
}

function openCustomCardModal() {
    document.getElementById('custom-card-name').value = '';
    const catSelect = document.getElementById('custom-card-category'); catSelect.innerHTML = '';
    Object.keys(foodCategories).forEach(cat => {
        let opt = document.createElement('option'); opt.value = cat; opt.innerText = cat; catSelect.appendChild(opt);
    });
    if (currentShoppingPath.length > 0) catSelect.value = currentShoppingPath[0];
    document.getElementById('custom-card-modal').style.display = 'flex';
}

function saveCustomCard() {
    const targetRayon = document.getElementById('custom-card-category').value;
    const name = document.getElementById('custom-card-name').value.trim();
    if (!name || !currentUser) return;

    let units = [];
    document.querySelectorAll('.custom-unit-cb:checked').forEach(cb => {
        units.push({ v: cb.value, l: cb.parentElement.innerText.trim() });
    });
    if (units.length === 0) units.push({ v: "", l: "Pièce(s)" }); 

    let calculatedPath = targetRayon;
    if (currentShoppingPath.length > 0 && currentShoppingPath[0] === targetRayon) { calculatedPath = currentShoppingPath.join('/'); }

    const newCard = { id: Date.now().toString(), path: calculatedPath, name: name, units: units };
    customShoppingCards.push(newCard);
    db.collection("users").doc(currentUser.uid).update({ customCards: customShoppingCards }).then(() => {
        showToast("Produit créé avec succès ! ✨");
        document.getElementById('custom-card-modal').style.display = 'none';
        renderShoppingCategories();
    });
}

let tempShoppingProduct = "";

function openShoppingItemModal(identifier, isCustom) {
    let productName = identifier; let units = [];
    if (isCustom) {
        const customItem = customShoppingCards.find(c => c.id === identifier); if (!customItem) return;
        productName = customItem.name; units = customItem.units;
    } else {
        let mainCat = currentShoppingPath.length > 0 ? currentShoppingPath[0] : ""; let pNameLower = productName.toLowerCase();
        units.push({v: "", l: "Pièce(s)"});
        if (pNameLower.includes("papier") || pNameLower.includes("sopalin") || pNameLower.includes("mouchoir") || pNameLower.includes("couches")) {
            units.push({v: "Rouleau", l: "Rouleau(x)"}, {v: "Pack", l: "Pack(s)"}, {v: "Boîte", l: "Boîte(s)"});
        } else if (pNameLower.includes("lait ") || pNameLower.includes("douche") || pNameLower.includes("shampoing") || pNameLower.includes("vaisselle") || pNameLower.includes("lessive") || pNameLower.includes("eau") || pNameLower.includes("jus") || mainCat.includes("Boissons") || mainCat.includes("Cave")) {
            units.push({v: "L", l: "Litres (L)"}, {v: "cl", l: "Centilitres (cl)"}, {v: "Pack", l: "Pack(s)"});
        } else if (mainCat.includes("Viandes") || mainCat.includes("Poissons") || mainCat.includes("Légumes") || mainCat.includes("Fruits") || mainCat.includes("Laitages") || mainCat.includes("Charcuterie") || mainCat.includes("Surgelés")) {
            units.push({v: "g", l: "Grammes (g)"}, {v: "kg", l: "Kilos (kg)"});
            if (mainCat.includes("Légumes") || mainCat.includes("Fruits")) units.push({v: "Filet", l: "Filet(s)"}, {v: "Sachet", l: "Sachet(s)"});
            if (mainCat.includes("Surgelés")) units.push({v: "Boîte", l: "Boîte(s)"}, {v: "Sachet", l: "Sachet(s)"});
        } else if (mainCat.includes("Apéritif")) {
            units.push({v: "g", l: "Grammes (g)"}, {v: "kg", l: "Kilos (kg)"}, {v: "Boîte", l: "Boîte(s)"}, {v: "Sachet", l: "Sachet(s)"});
        } else {
            units.push({v: "g", l: "Grammes (g)"}, {v: "kg", l: "Kilos (kg)"}, {v: "L", l: "Litres (L)"}, {v: "cl", l: "Centilitres (cl)"}, {v: "Pack", l: "Pack(s)"}, {v: "Boîte", l: "Boîte(s)"}, {v: "Sachet", l: "Sachet(s)"});
        }
    }
    tempShoppingProduct = productName;
    document.getElementById('shopping-modal-title').innerHTML = formatProductDisplay(productName);
    document.getElementById('shopping-qty').value = "1";
    const unitSelect = document.getElementById('shopping-unit'); unitSelect.innerHTML = ''; 
    units.forEach(u => {
        let opt = document.createElement('option'); opt.value = u.v; opt.innerText = u.l; unitSelect.appendChild(opt);
    });
    document.getElementById('shopping-item-modal').style.display = 'flex';
    currentShoppingPath = []; renderShoppingCategories();
}

function saveShoppingItem() {
    const qty = document.getElementById('shopping-qty').value;
    const unit = document.getElementById('shopping-unit').value;
    const finalName = tempShoppingProduct;
    const displayInfo = unit === "" ? `x${qty}` : `${qty} ${unit}`;
    
    if (finalName && currentUser) {
        db.collection("shopping").add({
            name: finalName,
            info: displayInfo,
            completed: false,
            userId: currentUser.uid,
            ownerName: userNickname || "Inconnu",
            listId: currentShoppingListId, // Assigne l'id de la liste sélectionnée
            createdAt: Date.now()
        }).then(() => {
            showToast("Ajouté au panier ! 🛒");
            document.getElementById('shopping-item-modal').style.display = 'none';
        });
    }
}

function scrollToShoppingList() {
    const listHeader = document.getElementById('shopping-list-header');
    if (listHeader) { listHeader.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}

// --- LOGIQUE MULTI-ONGLETS MARQUE-PAGE & SYNCHRONISATION ---
function renderShoppingTabs() {
    const container = document.getElementById('shopping-tabs-dynamic');
    if (!container) return;
    container.innerHTML = '';

    // 1. Onglet Personnel Fini
    const personalBtn = document.createElement('button');
    personalBtn.className = `sub-menu-tab ${currentShoppingListId === 'personal' ? 'active' : ''}`;
    personalBtn.style.cssText = currentShoppingListId === 'personal' 
        ? "border-bottom: 3px solid transparent; background: var(--primary); color: white; border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border:none; font-family: inherit;"
        : "background: rgba(128,128,128,0.1); color: var(--text-color); border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border: none; opacity: 0.7; font-family: inherit;";
    personalBtn.innerText = "Ma liste";
    personalBtn.onclick = () => switchShoppingListTab("personal");
    container.appendChild(personalBtn);

    // 2. Onglets Partagés Dynamiques
    mySharedLists.forEach(list => {
        const listBtn = document.createElement('button');
        listBtn.className = `sub-menu-tab ${currentShoppingListId === list.id ? 'active' : ''}`;
        listBtn.style.cssText = currentShoppingListId === list.id 
            ? "border-bottom: 3px solid transparent; background: var(--primary); color: white; border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border:none; font-family: inherit;"
            : "background: rgba(128,128,128,0.1); color: var(--text-color); border-radius: 10px 10px 0 0; padding: 8px 16px; font-weight: bold; cursor: pointer; border: none; opacity: 0.7; font-family: inherit;";
        listBtn.innerText = list.name;
        listBtn.onclick = () => switchShoppingListTab(list.id);
        container.appendChild(listBtn);
    });
}

function switchShoppingListTab(listId) {
    currentShoppingListId = listId;
    renderShoppingTabs();
    syncCurrentShoppingItems();
}

function syncCurrentShoppingItems() {
    if (shoppingItemsUnsubscribe) shoppingItemsUnsubscribe();
    if (!currentUser) return;

    let query = db.collection("shopping").where("listId", "==", currentShoppingListId);
    
    // Si personnel, on récupère les siens + support des anciens produits sans structure listId
    if (currentShoppingListId === "personal") {
        query = db.collection("shopping").where("userId", "==", currentUser.uid);
    }

    shoppingItemsUnsubscribe = query.onSnapshot((snapshot) => {
        shoppingItems = [];
        snapshot.forEach((doc) => {
            let data = doc.data(); data.id = doc.id;
            if (currentShoppingListId === "personal") {
                if (!data.listId || data.listId === "personal") { shoppingItems.push(data); }
            } else {
                if (data.listId === currentShoppingListId) { shoppingItems.push(data); }
            }
        });
        if (document.getElementById('shopping-page').style.display === 'block') { renderShoppingList(); }
    });
}

function renderShoppingList() {
    const c = document.getElementById('shopping-list-content');
    const scrollUpBtn = document.getElementById('shopping-scroll-up-btn');
    if (!c) return; c.innerHTML = '';

    shoppingItems.sort((a, b) => a.createdAt - b.createdAt);
    const actives = shoppingItems.filter(item => !item.completed);
    const completeds = shoppingItems.filter(item => item.completed);

    if (shoppingItems.length === 0) {
        c.innerHTML = '<p style="text-align:center; opacity:0.5; font-style:italic;">La liste est vide !</p>';
        if(scrollUpBtn) scrollUpBtn.style.display = 'none'; return;
    }

    if(scrollUpBtn && shoppingItems.length > 0) scrollUpBtn.style.display = 'flex';
    else if(scrollUpBtn) scrollUpBtn.style.display = 'none';

    const getOwnerTag = (item) => {
        if (currentShoppingListId === 'personal') return '';
        if (item.userId === currentUser.uid) return ` <small style="opacity:0.6; font-style:italic; color:var(--primary);">(Moi)</small>`;
        if (item.ownerName) return ` <small style="opacity:0.6; font-style:italic;">(${item.ownerName})</small>`;
        return '';
    };

    actives.forEach(item => {
        const d = document.createElement('div'); d.className = `task-card`; d.style.borderLeft = "6px solid var(--primary)"; 
        // Affiche l'animal entre parenthèses uniquement si partagé
        const nameToDisplay = currentShoppingListId === 'personal' ? formatProductDisplay(item.name) : item.name;
        d.innerHTML = `
            <div style="flex:1; display:flex; align-items:center; min-width:0;">
                <div onclick="toggleShoppingCheck('${item.id}', false)" style="width:20px; height:20px; border:2px solid var(--primary); border-radius:5px; margin-right:10px; cursor:pointer;"></div>
                <div style="flex:1;">
                    <strong style="display:block;">${nameToDisplay}${getOwnerTag(item)}</strong>
                    <small style="color:var(--primary); font-weight:bold;">${item.info}</small>
                </div>
            </div>
            <div class="task-actions" style="flex-shrink:0;">
                <button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>
            </div>`;
        c.appendChild(d);
    });

    if (completeds.length > 0) {
        let marginStyle = actives.length === 0 ? "margin-top: 0;" : "";
        c.innerHTML += `<div class="task-section-separator" style="display: flex; justify-content: space-between; align-items: center; padding-right: 5px; ${marginStyle}">
            <span>Dans le chariot</span>
            <button onclick="clearCompletedShopping()" style="background:none; border:none; color:var(--danger); font-size:0.85rem; font-weight:bold; cursor:pointer; text-decoration:underline;">Vider le cadie</button>
        </div>`;
    }

    completeds.forEach(item => {
        const d = document.createElement('div'); d.className = `task-card completed-bubble`; 
        const nameToDisplay = currentShoppingListId === 'personal' ? formatProductDisplay(item.name) : item.name;
        d.innerHTML = `
            <div style="flex:1; display:flex; align-items:center; min-width:0;">
                <div onclick="toggleShoppingCheck('${item.id}', true)" style="width:20px; height:20px; background:var(--success); border-radius:5px; margin-right:10px; display:flex; align-items:center; justify-content:center; color:white; font-size:0.8rem; cursor:pointer;">✓</div>
                <div style="flex:1; text-decoration:line-through; opacity:0.6;">
                    <strong style="display:block;">${nameToDisplay}${getOwnerTag(item)}</strong>
                    <small>${item.info}</small>
                </div>
            </div>
            <div class="task-actions" style="flex-shrink:0;">
                <button onclick="deleteShoppingItem('${item.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button>
            </div>`;
        c.appendChild(d);
    });
}

function toggleShoppingCheck(id, isCompleted) { db.collection("shopping").doc(id).update({ completed: !isCompleted }); }
function deleteShoppingItem(id) { db.collection("shopping").doc(id).delete().then(() => showToast("Produit retiré !")); }

function clearCompletedShopping() {
    let completeds = shoppingItems.filter(item => item.completed); if (completeds.length === 0) return;
    let operations = completeds.map(item => db.collection("shopping").doc(item.id).delete());
    Promise.all(operations).then(() => { showToast("Le chariot a été vidé ! 🗑️"); });
}

function scrollToTopShopping() {
    const marketHeader = document.getElementById('shopping-page');
    if (marketHeader) { marketHeader.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}

// --- CREATION & REJOINDRE DES GROUPES DE COURSES MULTIPLES ---
function openCustomShoppingListShareModal() {
    document.getElementById('new-shared-list-name').value = '';
    document.getElementById('join-shared-list-code').value = '';
    renderMySharedListsInModal();
    document.getElementById('shopping-list-multi-share-modal').style.display = 'flex';
}

function renderMySharedListsInModal() {
    const container = document.getElementById('my-shared-lists-container'); if (!container) return;
    if (mySharedLists.length === 0) {
        container.innerHTML = `<p style="font-size: 0.85rem; opacity: 0.5; font-style: italic; text-align: center;">Aucune liste partagée active.</p>`; return;
    }
    container.innerHTML = mySharedLists.map(l => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px; border-radius:8px; border: 1px solid rgba(128,128,128,0.1); width: 100%; gap: 10px;">
            <div style="flex: 1; min-width: 0;">
                <strong style="display:block; color:var(--primary-dark); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${l.name}</strong>
                <small style="color:var(--primary); font-weight:bold; background:rgba(128,128,128,0.1); padding:2px 6px; border-radius:4px; display:inline-block; margin-top:2px;">Code: ${l.code}</small>
            </div>
            <div style="display:flex; gap:8px; flex-shrink:0;">
                <button onclick="copyListCode('${l.code}')" style="background:none; border:none; cursor:pointer; font-size:1.1rem;" title="Copier le code">📋</button>
                <button onclick="leaveSharedList('${l.id}')" style="background:var(--danger); color:white; border:none; padding:5px 10px; border-radius:6px; font-size:0.75rem; cursor:pointer; font-weight:bold; font-family:inherit;">Quitter</button>
            </div>
        </div>
    `).join('');
}

function copyListCode(code) { navigator.clipboard.writeText(code).then(() => showToast("Code de liste copié ! 📋")); }

function createNewSharedShoppingList() {
    const name = document.getElementById('new-shared-list-name').value.trim();
    if (!name || !currentUser) { showToast("Veuillez donner un nom à la liste ! ❌"); return; }
    const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    db.collection("shoppingLists").add({
        name: name, code: uniqueCode, createdBy: currentUser.uid, members: [currentUser.uid], createdAt: Date.now()
    }).then((docRef) => {
        showToast(`Liste "${name}" créée ! 🎉`);
        document.getElementById('new-shared-list-name').value = '';
        currentShoppingListId = docRef.id; // Bascule automatiquement sur la nouvelle liste
    });
}

function joinSharedShoppingList() {
    const code = document.getElementById('join-shared-list-code').value.trim().toUpperCase();
    if (!code || !currentUser) return;

    db.collection("shoppingLists").where("code", "==", code).get().then(snapshot => {
        if (snapshot.empty) { showToast("Code de liste introuvable ! ❌"); return; }
        const doc = snapshot.docs[0]; const data = doc.data();
        if (data.members.includes(currentUser.uid)) { showToast("Vous faites déjà partie de cette liste ! 😊"); return; }

        let updatedMembers = [...data.members, currentUser.uid];
        db.collection("shoppingLists").doc(doc.id).update({ members: updatedMembers }).then(() => {
            showToast(`Vous avez rejoint "${data.name}" ! 🛒`);
            document.getElementById('join-shared-list-code').value = '';
            currentShoppingListId = doc.id; // Bascule sur la liste raccordée
        });
    });
}

function leaveSharedList(listId) {
    if (!currentUser) return;
    db.collection("shoppingLists").doc(listId).get().then(doc => {
        if (!doc.exists) return;
        const data = doc.data(); let updatedMembers = data.members.filter(m => m !== currentUser.uid);
        if (updatedMembers.length === 0) {
            db.collection("shoppingLists").doc(listId).delete();
            db.collection("shopping").where("listId", "==", listId).get().then(snap => { snap.forEach(d => d.ref.delete()); });
        } else {
            db.collection("shoppingLists").doc(listId).update({ members: updatedMembers });
        }
        showToast("Liste quittée !");
    });
}

// --- NOTIFS ET ARCHIVAGE ---
function processMidnightAutoArchive() {
    if(isArchiving || !currentUser) return; isArchiving = true;
    const today = new Date().toISOString().split('T')[0]; let operations = [];
    tasks.forEach(t => { if (t.completed) return; let ghosts = Array.isArray(t.duplicateDays) ? t.duplicateDays : []; ghosts = ghosts.map(g => typeof g === 'string' ? {date: g, time: t.time} : g); if (ghosts.length > 0) { let allOccurrences = [{date: t.date, time: t.time || ""}, ...ghosts]; allOccurrences.sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : (a.time || "").localeCompare(b.time || "")); let pastDates = allOccurrences.filter(o => o.date < today); let remainingDates = allOccurrences.filter(o => o.date >= today); if (pastDates.length > 0) { pastDates.forEach(pastOcc => { operations.push(db.collection("tasks").add({ name: t.name, desc: t.desc || "", date: pastOcc.date, time: pastOcc.time, reminders: t.reminders || [], importance: t.importance, completed: true, completedAtStr: pastOcc.date, userId: t.userId, createdAt: t.createdAt || Date.now(), duplicateDays: [] })); }); if (remainingDates.length > 0) { let nextMain = remainingDates.shift(); operations.push(db.collection("tasks").doc(t.id).update({ date: nextMain.date, time: nextMain.time, duplicateDays: remainingDates })); } else { operations.push(db.collection("tasks").doc(t.id).delete()); } } } else { if (t.date < today) operations.push(db.collection("tasks").doc(t.id).update({ completed: true, completedAtStr: t.date })); } });
    Promise.all(operations).then(() => { isArchiving = false; }).catch(() => { isArchiving = false; });
}

function runNotificationEngine() {
    const now = new Date(); todayStr = now.toISOString().split('T')[0];
    if (todayStr !== lastCheckedDayStr) { lastCheckedDayStr = todayStr; processMidnightAutoArchive(); }
    const hour = now.getHours(), minute = now.getMinutes(), dayOfWeek = now.getDay(); let todayMD = todayStr.substring(5), tomorrow = new Date(); tomorrow.setDate(now.getDate() + 1); let tomorrowMD = tomorrow.toISOString().split('T')[0].substring(5);
    if (hour === 9 && minute === 0) { let todayBirthdays = birthdays.filter(b => b.date.endsWith(todayMD)); todayBirthdays.forEach(b => { let key = `bday-j-${b.id}-${todayStr.substring(0,4)}`; let notifs = JSON.parse(localStorage.getItem('listme_sent_notifs')) || {}; if (!notifs[key]) { sendNotification("🎂 Joyeux Anniversaire !", `C'est l'anniversaire de ${b.name} aujourd'hui !`); notifs[key] = true; localStorage.setItem('listme_sent_notifs', JSON.stringify(notifs)); } }); let tomorrowBirthdays = birthdays.filter(b => b.date.endsWith(tomorrowMD)); tomorrowBirthdays.forEach(b => { let key = `bday-v-${b.id}-${todayStr.substring(0,4)}`; let notifs = JSON.parse(localStorage.getItem('listme_sent_notifs')) || {}; if (!notifs[key]) { sendNotification("🎁 Bientôt un anniversaire", `C'est l'anniversaire de ${b.name} demain !`); notifs[key] = true; localStorage.setItem('listme_sent_notifs', JSON.stringify(notifs)); } }); if (todayStr.endsWith('-01')) { let thisMonthBirthdays = birthdays.filter(b => b.date.substring(5,7) === todayStr.substring(5,7)); if (thisMonthBirthdays.length > 0) { let key = `bday-m-${todayStr.substring(0,7)}`; let notifs = JSON.parse(localStorage.getItem('listme_sent_notifs')) || {}; if (!notifs[key]) { sendNotification("🗓️ Anniversaires du mois", `Il y a ${thisMonthBirthdays.length} anniversaire(s) prévu(s) ce mois-ci.`); notifs[key] = true; localStorage.setItem('listme_sent_notifs', JSON.stringify(notifs)); } } } }
    if (dayOfWeek === 0 && hour === 18 && minute === 0) { const key = `recap-${todayStr}`; let notifs = JSON.parse(localStorage.getItem('listme_sent_notifs')) || {}; if (!notifs[key]) { const activeTasksCount = tasks.filter(t => !t.completed).length; sendNotification("📋 LIST'ME : Récap de ta semaine", activeTasksCount > 0 ? `Tu as ${activeTasksCount} tâches prévues cette semaine.` : "Aucune tâche critique de planifiée."); notifs[key] = true; localStorage.setItem('listme_sent_notifs', JSON.stringify(notifs)); } }
    tasks.forEach(t => { if (t.completed) return; let displayDate = t.date, displayTime = t.time; if (t.duplicateDays && t.duplicateDays.length > 0) { let allOcc = [{date: t.date, time: t.time || ""}]; t.duplicateDays.forEach(g => { if (typeof g === 'string') allOcc.push({date: g, time: t.time || ""}); else allOcc.push(g); }); allOcc.sort((a,b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)); let futureOcc = allOcc.filter(o => o.date >= todayStr); let currentOcc = futureOcc.length > 0 ? futureOcc[0] : allOcc[allOcc.length - 1]; displayDate = currentOcc.date; displayTime = currentOcc.time; } if (displayDate === todayStr && displayTime) { const [tHour, tMin] = displayTime.split(':').map(Number); const taskTimeObj = new Date(); taskTimeObj.setHours(tHour, tMin, 0, 0); if ((now - taskTimeObj) / 60000 >= 30) { toggleTaskCheck(t.id, false, displayDate); return; } } const diffDays = Math.ceil((new Date(displayDate) - now) / (1000 * 60 * 60 * 24)); if (diffDays === 1 && hour === 20 && minute === 0) { const key = `veille-${t.id}-${displayDate}`; let notifs = JSON.parse(localStorage.getItem('listme_sent_notifs')) || {}; if (!notifs[key]) { sendNotification("⏰ Rappel : C'est pour demain !", `Ne pas oublier : "${t.name}" prévu demain.`); notifs[key] = true; localStorage.setItem('listme_sent_notifs', JSON.stringify(notifs)); } } if (displayTime && t.reminders && t.reminders.length > 0) { const [tHour, tMin] = displayTime.split(':').map(Number); const taskDateTime = new Date(displayDate); taskDateTime.setHours(tHour, tMin, 0, 0); const minutesRemaining = Math.round((taskDateTime - now) / 60000); t.reminders.forEach(r => { if (minutesRemaining === Number(r)) { const key = `custom-${t.id}-${displayDate}-${r}`; let notifs = JSON.parse(localStorage.getItem('listme_sent_notifs')) || {}; if (!notifs[key]) { sendNotification(`🔔 Rappel : ${t.name}`, `Commence dans ${r} minutes.`); notifs[key] = true; localStorage.setItem('listme_sent_notifs', JSON.stringify(notifs)); } } }); } });
    if(document.getElementById('tasks-page').style.display === 'block') { renderTasks(); }
}
setInterval(runNotificationEngine, 30000);

function requestNotificationPermission() { try { if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") { Notification.requestPermission().catch(e => console.warn("Notif bloquée", e)); } } catch(e) { console.warn(e); } }
function sendNotification(title, body) { if ("Notification" in window && Notification.permission === "granted") { if (navigator.serviceWorker && navigator.serviceWorker.controller) { navigator.serviceWorker.ready.then(reg => { reg.showNotification(title, { body: body, icon: "https://cdn-icons-png.flaticon.com/512/906/906334.png" }); }); } else { new Notification(title, { body: body, icon: "https://cdn-icons-png.flaticon.com/512/906/906334.png" }); } } }
document.querySelectorAll('.reminder-badge').forEach(badge => { badge.onclick = () => { if(!badge.classList.contains('disabled-frozen')) { badge.classList.toggle('active'); } }; });
function getSelectedRemindersFromBadges() { let activeReminders = []; document.querySelectorAll('.reminder-badge.active').forEach(b => activeReminders.push(b.getAttribute('data-value'))); return activeReminders; }
function setSelectedRemindersToBadges(remindersArray) { document.querySelectorAll('.reminder-badge').forEach(b => { if(remindersArray && remindersArray.includes(b.getAttribute('data-value'))) b.classList.add('active'); else b.classList.remove('active'); }); }

// --- AUTH & SYNC SÉCURISÉ ---
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user; document.getElementById('main-nav').style.display = 'flex'; if(document.getElementById('profile-user-email')) document.getElementById('profile-user-email').innerText = user.email || ""; requestNotificationPermission();
        
        unsubscribeUser = db.collection("users").doc(user.uid).onSnapshot((doc) => {
            try {
                let data = doc.exists ? doc.data() : {};
                userNickname = data.nickname || "";
                if(document.getElementById('profile-nickname')) document.getElementById('profile-nickname').value = userNickname;
                
                customShoppingCards = data.customCards || []; 
                
                let updateData = {};
                myAgendaCode = data.shareCode;

                if(!myAgendaCode) { myAgendaCode = Math.random().toString(36).substring(2, 8).toUpperCase(); updateData.shareCode = myAgendaCode; updateData.sharedWith = []; }
                if(Object.keys(updateData).length > 0) { db.collection("users").doc(user.uid).set(updateData, {merge: true}); }

                if(document.getElementById('my-share-code') && document.getElementById('share-modal').style.display === 'flex') {
                    document.getElementById('my-share-code').innerText = myAgendaCode;
                }
                
                friends = data.following || [];
                if(document.getElementById('shopping-page').style.display === 'block') { renderShoppingCategories(); }
            } catch (e) { console.error(e); }
        });

        startRealtimeSync(user.uid); showPage('tasks');
    } else {
        currentUser = null; userNickname = ""; hasShownWelcomeThisSession = false; document.getElementById('main-nav').style.display = 'none'; stopRealtimeSync(); document.querySelectorAll('main > section').forEach(s => s.style.display = 'none'); document.getElementById('auth-page').style.display = 'block';
    }
});

let initialSyncDone = false;
function startRealtimeSync(userId) {
    initialSyncDone = false; 
    unsubscribeTasks = db.collection("tasks").where("userId", "==", userId).onSnapshot((snapshot) => { tasks = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; if (!data.createdAt) { data.createdAt = 0; } else if (data.createdAt.seconds) { data.createdAt = data.createdAt.seconds * 1000; } tasks.push(data); }); if (!initialSyncDone && tasks.length > 0) { initialSyncDone = true; setTimeout(processMidnightAutoArchive, 1500); } renderTasks(); if (!hasShownWelcomeThisSession) { triggerWelcomeModal(); hasShownWelcomeThisSession = true; } if(viewState === 'day') renderCalendar(); });
    unsubscribeDaily = db.collection("dailyTodo").where("userId", "==", userId).onSnapshot((snapshot) => { dailyTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; dailyTodo.push(data); }); renderTodo(); });
    unsubscribeWeekly = db.collection("weeklyTodo").where("userId", "==", userId).onSnapshot((snapshot) => { weeklyTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; weeklyTodo.push(data); }); renderTodo(); });
    unsubscribeRoutine = db.collection("routineTodo").where("userId", "==", userId).onSnapshot((snapshot) => { routineTodo = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; routineTodo.push(data); }); renderTodo(); });
    unsubscribeBirthdays = db.collection("birthdays").where("userId", "==", userId).onSnapshot((snapshot) => { birthdays = []; snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; birthdays.push(data); }); if(viewState === 'day') renderCalendar(); });
    
    // ÉCOUTE DES GROUPES DE COURSES MULTIPLES
    sharedListsUnsubscribe = db.collection("shoppingLists").where("members", "arrayContains", userId).onSnapshot((snapshot) => {
        mySharedLists = [];
        snapshot.forEach((doc) => {
            let data = doc.data(); data.id = doc.id; mySharedLists.push(data);
        });
        if (currentShoppingListId !== "personal" && !mySharedLists.some(l => l.id === currentShoppingListId)) {
            currentShoppingListId = "personal";
        }
        renderShoppingTabs();
        syncCurrentShoppingItems();
        if (document.getElementById('shopping-list-multi-share-modal') && document.getElementById('shopping-list-multi-share-modal').style.display === 'flex') {
            renderMySharedListsInModal();
        }
    });

    friends.forEach(f => startFriendSync(f.uid, f.nickname, 'agenda'));
}

function startFriendSync(fUid, fName, mode) {
    if (mode === 'agenda') {
        if(friendUnsubscribes[fUid]) return;
        friendUnsubscribes[fUid] = db.collection("tasks").where("userId", "==", fUid).onSnapshot((snapshot) => { sharedTasks = sharedTasks.filter(t => t.userId !== fUid); snapshot.forEach((doc) => { let data = doc.data(); data.id = doc.id; data.ownerName = fName; if (!data.createdAt) { data.createdAt = 0; } else if (data.createdAt.seconds) { data.createdAt = data.createdAt.seconds * 1000; } sharedTasks.push(data); }); if(viewState === 'day') renderCalendar(); });
    }
}

function stopRealtimeSync() { 
    if (unsubscribeTasks) unsubscribeTasks(); if (unsubscribeDaily) unsubscribeDaily(); if (unsubscribeWeekly) unsubscribeWeekly(); if (unsubscribeRoutine) unsubscribeRoutine(); if (unsubscribeBirthdays) unsubscribeBirthdays(); if(unsubscribeUser) unsubscribeUser();
    if (sharedListsUnsubscribe) sharedListsUnsubscribe(); if (shoppingItemsUnsubscribe) shoppingItemsUnsubscribe();
    Object.values(friendUnsubscribes).forEach(u => u()); friendUnsubscribes = {};
    tasks = []; sharedTasks = []; dailyTodo = []; weeklyTodo = []; routineTodo = []; birthdays = []; friends = []; shoppingItems = []; mySharedLists = [];
}

function triggerWelcomeModal() { const wModal = document.getElementById('welcome-modal'); const summaryZone = document.getElementById('today-summary-zone'); if(!wModal) return; document.getElementById('welcome-message-text').innerText = `Welcome back, ${userNickname ? userNickname : "toi"} ! 👋`; let todayTasks = tasks.filter(t => t.date === todayStr && !t.completed); summaryZone.innerHTML = ''; if(todayTasks.length === 0) { summaryZone.innerHTML = `<p style="font-size: 0.95rem; font-style: italic; opacity: 0.8; margin-top: 10px; text-align:center;">Aucune tâche urgente au programme pour aujourd'hui ! ✨</p>`; } else { summaryZone.innerHTML = `<p style="font-size: 0.95rem; font-weight: bold; margin-bottom: 12px; color: var(--primary-dark);">Voici tes tâches de la journée :</p>`; todayTasks.forEach(t => { summaryZone.innerHTML += `<div class="welcome-summary-item">📌 <b>${t.time ? t.time : 'Pas d\'heure'}</b> - ${t.name} <span style="float: right; font-size: 0.75rem; font-weight: bold; padding: 2px 6px; border-radius: 8px; background: rgba(128,128,128,0.1); color: var(--${t.importance === 'high'?'danger':t.importance==='medium'?'warning':'success'});">${t.importance === 'high' ? 'Haute' : t.importance === 'medium' ? 'Moyenne' : 'Faible'}</span></div>`; }); } wModal.style.display = 'flex'; }

// --- PARTAGE AGENDA ---
function autoSaveNickname() { const nick = document.getElementById('profile-nickname').value.trim(); if (currentUser) { db.collection("users").doc(currentUser.uid).set({ nickname: nick }, { merge: true }).then(() => { userNickname = nick; showToast("Surnom mis à jour ! ✨"); }); } }
function openShareModal(mode) { currentShareMode = mode; document.getElementById('share-modal-title').innerText = "Partage Agenda 🤝"; document.getElementById('my-share-code').innerText = myAgendaCode; renderFriendsList(); document.getElementById('share-modal').style.display = 'flex'; }
function copyShareCode() { const code = document.getElementById('my-share-code').innerText; navigator.clipboard.writeText(code).then(() => showToast("Code copié ! 📋")); }

function renderFriendsList() { 
    const container = document.getElementById('friends-list-container'); if(!container) return; 
    if (friends.length === 0) { container.innerHTML = `<p style='font-size: 0.85rem; opacity: 0.5; font-style: italic; margin-top: 10px; text-align: center; width: 100%;'>Aucun agenda lié pour le moment.</p>`; return; }
    container.innerHTML = friends.map(f => `<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(128,128,128,0.08); padding:10px 15px; border-radius:10px; margin-top:10px; border: 1px solid rgba(128,128,128,0.2); width: 100%;"><span style="font-weight:bold; color:var(--primary-dark);">👤 ${f.nickname}</span><button onclick="removeFriend('${f.uid}')" style="background:var(--danger); color:white; border:none; padding:6px 12px; border-radius:8px; font-size:0.8rem; cursor:pointer; font-weight:bold;">Retirer</button></div>`).join(''); 
}

function removeFriend(fUid) { 
    friends = friends.filter(f => f.uid !== fUid); 
    db.collection("users").doc(currentUser.uid).set({following: friends}, {merge: true}).then(() => { renderFriendsList(); if(friendUnsubscribes[fUid]) { friendUnsubscribes[fUid](); delete friendUnsubscribes[fUid]; } sharedTasks = sharedTasks.filter(t => t.userId !== fUid); renderCalendar(); showToast("Agenda retiré ! 🗑️"); }); 
}

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

// --- ANNIVERSAIRES ---
function openBirthdayModal() { document.getElementById('birthday-name').value = ''; document.getElementById('birthday-date').value = ''; document.getElementById('birthday-modal').style.display = 'flex'; }
function deleteBirthday(id) { db.collection("birthdays").doc(id).delete().then(() => { showToast("Anniversaire supprimé !"); document.getElementById('calendar-day-modal').style.display = 'none'; }); }

// --- MODAL GHOST ---
function openGhostModal(id) { const task = tasks.find(t => t.id === id); if(!task || !task.duplicateDays) return; let modal = document.getElementById('ghost-modal'); if(!modal) { modal = document.createElement('div'); modal.id = 'ghost-modal'; modal.className = 'modal modal-center'; modal.style.zIndex = "10005"; modal.innerHTML = `<div class="modal-content content-center" style="max-height: 75vh; overflow-y: auto; padding: 20px;"><h3 style="color: var(--primary); text-align: center; margin-bottom: 15px;">🗓️ Dates Prévues</h3><div id="ghost-modal-list" style="display: flex; flex-direction: column; gap: 10px;"></div><button onclick="document.getElementById('ghost-modal').style.display='none'" class="btn-secondary" style="margin-top: 15px; width: 100%;">Fermer</button></div>`; document.body.appendChild(modal); } const list = document.getElementById('ghost-modal-list'); list.innerHTML = ""; let ghosts = task.duplicateDays.map(g => typeof g === 'string' ? {date: g, time: task.time} : g); ghosts.sort((a,b) => a.date !== b.date ? a.date.localeCompare(b.date) : (a.time || "").localeCompare(b.time || "")); ghosts.forEach((g, index) => { const dFr = g.date.split('-').reverse().join('/'); list.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:rgba(128,128,128,0.08); border-radius:12px;"><span style="font-size: 0.95rem;">📅 <b>${dFr}</b> ${g.time ? `<span style="opacity:0.6; margin:0 5px;">|</span> ⏰ <b>${g.time}</b>` : ''}</span><button onclick="removeGhostDate('${task.id}', ${index})" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.5rem; display:flex; align-items:center; line-height:1; padding:0 5px;">×</button></div>`; }); modal.style.display = 'flex'; }
function removeGhostDate(taskId, ghostIndex) { const task = tasks.find(t => t.id === taskId); if(task && task.duplicateDays) { let ghosts = task.duplicateDays.map(g => typeof g === 'string' ? {date: g, time: task.time} : g); ghosts.splice(ghostIndex, 1); db.collection("tasks").doc(taskId).update({ duplicateDays: ghosts }).then(() => { showToast("Date supprimée ! 🗑️"); openGhostModal(taskId); if(ghosts.length === 0) document.getElementById('ghost-modal').style.display='none'; }); } }

// --- RENDER TASKS ---
function renderTasks() { 
    const c = document.getElementById('task-list'); if (!c) return; c.innerHTML = ''; const now = new Date(); 
    let activeList = [], archiveList = []; tasks.forEach(t => { if(t.completed) { if(t.completedAtStr && t.completedAtStr !== todayStr) { archiveList.push(t); } else { activeList.push(t); } } else { activeList.push(t); } }); 
    let filteredList = (taskSubView === "active") ? activeList : archiveList; 
    if (taskSubView === "archive") { const archiveSort = document.getElementById('archive-sort-filter').value; filteredList.sort((a,b) => { const dateA = a.completedAtStr || a.date, dateB = b.completedAtStr || b.date; if (archiveSort === 'desc') { if (dateA !== dateB) return dateB.localeCompare(dateA); return b.createdAt - a.createdAt; } else { if (dateA !== dateB) return dateA.localeCompare(dateB); return a.createdAt - b.createdAt; } }); } 
    const isChronoSort = (taskSubView === "archive") || (document.getElementById('task-sort-filter') && document.getElementById('task-sort-filter').value === 'chrono');
    if (taskSubView === "active") { const sortMode = document.getElementById('task-sort-filter') ? document.getElementById('task-sort-filter').value : 'chrono'; let imminentTasks = [], standardTasks = [], completedTodayTasks = []; filteredList.forEach(t => { t.currentDisplayDate = t.date; t.currentDisplayTime = t.time; if (!t.completed && t.duplicateDays && t.duplicateDays.length > 0) { let allOcc = [{date: t.date, time: t.time || ""}]; t.duplicateDays.forEach(g => { if (typeof g === 'string') allOcc.push({date: g, time: t.time || ""}); else allOcc.push(g); }); allOcc.sort((a,b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)); let futureOcc = allOcc.filter(o => o.date >= todayStr), currentOcc = futureOcc.length > 0 ? futureOcc[0] : allOcc[allOcc.length - 1]; t.currentDisplayDate = currentOcc.date; t.currentDisplayTime = currentOcc.time; } if(t.completed) { completedTodayTasks.push(t); return; } if(t.currentDisplayDate === todayStr && t.currentDisplayTime) { const [tHour, tMin] = t.currentDisplayTime.split(':').map(Number); const taskTimeObj = new Date(); taskTimeObj.setHours(tHour, tMin, 0, 0); const remainingMinutes = (taskTimeObj - now) / 60000; if(remainingMinutes > 0 && remainingMinutes <= 60) { t.isImminent = true; t.minutesLeft = Math.round(remainingMinutes); imminentTasks.push(t); return; } } t.isImminent = false; standardTasks.push(t); }); const chronoSort = (a, b) => { let dateA = a.currentDisplayDate || a.date, dateB = b.currentDisplayDate || b.date; if (dateA !== dateB) return dateA.localeCompare(dateB); let timeA = a.currentDisplayTime || "", timeB = b.currentDisplayTime || ""; if (!timeA) return -1; if (!timeB) return 1; return timeA.localeCompare(timeB); }; const creationSort = (a, b) => b.createdAt - a.createdAt; if (sortMode === 'chrono') { standardTasks.sort(chronoSort); completedTodayTasks.sort(chronoSort); } else { standardTasks.sort(creationSort); completedTodayTasks.sort(creationSort); } imminentTasks.sort((a,b) => a.minutesLeft - b.minutesLeft); filteredList = [...imminentTasks, ...standardTasks, ...completedTodayTasks]; } 
    if(filteredList.length === 0) { c.innerHTML = `<p style="text-align:center; opacity:0.4; font-style:italic; margin-top:30px;">${taskSubView==='active'?'Aucune tâche active !':'Aucune archive ne correspond'}</p>`; return; } 
    let separatorDrawn = false; let lastDateRendered = null;
    filteredList.forEach(t => { 
        if (t.completed && taskSubView === "active" && !separatorDrawn) { const separator = document.createElement('div'); separator.className = 'task-section-separator'; separator.innerHTML = '<span>Tâches terminées</span>'; c.appendChild(separator); separatorDrawn = true; lastDateRendered = null; } 
        let ghosts = Array.isArray(t.duplicateDays) ? t.duplicateDays : []; const isMultiDate = (!t.completed && ghosts.length > 0); const displayDateStr = t.currentDisplayDate || t.date, displayTimeStr = t.currentDisplayTime || t.time || "", displayDateFR = displayDateStr ? displayDateStr.split('-').reverse().join('/') : ''; 
        if (isChronoSort && displayDateStr !== lastDateRendered) { if (!t.completed || taskSubView === "archive") { const dateSep = document.createElement('div'); let dateLabel = displayDateStr === todayStr ? `Aujourd'hui (${displayDateFR})` : displayDateFR; dateSep.innerHTML = `<div style="text-align: center; margin: 18px 0 8px 0; font-size: 0.85rem; font-weight: bold; color: var(--primary); opacity: 0.7; letter-spacing: 1px;">— ${dateLabel} —</div>`; c.appendChild(dateSep); lastDateRendered = displayDateStr; } }
        let descHtml = t.desc ? `<div class="task-desc-text" style="flex:1; min-width:0; font-size: 0.85rem; opacity: 0.7; font-style: italic; white-space: pre-wrap; line-height: 1.3; margin-left: 10px; padding-left: 10px; border-left: 1px dashed rgba(128,128,128,0.3); display: flex; align-items: center; word-break: break-word; overflow-wrap: anywhere;">${t.desc}</div>` : ''; let ghostHtml = isMultiDate ? `<span onclick="event.stopPropagation(); openGhostModal('${t.id}')" style="display:inline-block; margin-top:8px; font-size:0.75rem; color:var(--primary); background:rgba(0,206,209,0.1); padding:4px 10px; border-radius:12px; cursor:pointer; font-weight:bold;">🗓️ + ${ghosts.length} date(s) prévue(s)</span>` : ""; const d = document.createElement('div'); 
        if (t.completed) { d.className = `task-card completed-bubble`; d.innerHTML = `<div style="flex:1; display:flex; align-items:center; min-width:0;" onclick="toggleTaskCheck('${t.id}', ${t.completed}, '${displayDateStr}')"><div style="flex:1; min-width:0; padding-right:8px;"><span class="badge-finished">✨ Fini !</span><br><strong style="text-decoration:line-through; opacity:0.5; display:block; word-break: break-word; overflow-wrap: anywhere;">${t.name}</strong><small style="display:block; opacity:0.5; margin-top:2px;">📅 ${displayDateFR} ${displayTimeStr ? '⏰ ' + displayTimeStr : ''}</small></div>${t.desc ? `<div class="task-desc-text" style="flex:1; min-width:0; font-size: 0.85rem; opacity: 0.4; font-style: italic; margin-left: 10px; padding-left: 10px; border-left: 1px dashed rgba(128,128,128,0.2); display: flex; align-items: center; text-decoration:line-through; word-break: break-word; overflow-wrap: anywhere;">${t.desc}</div>` : ''}</div><div class="task-actions" style="flex-shrink:0;"><button onclick="deleteTask('${t.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button></div>`; } else { d.className = `${isMultiDate ? 'task-card stacked-task' : 'task-card'} ${t.importance} ${t.isImminent ? 'is-imminent' : ''}`; let remindersText = "Aucun"; if(t.reminders && t.reminders.length > 0) remindersText = t.reminders.map(r => `${r} min avant`).join(', '); d.innerHTML = `<div style="flex:1; display:flex; align-items:center; min-width:0;" onclick="toggleTaskCheck('${t.id}', ${t.completed}, '${displayDateStr}')"><div style="flex:${t.desc ? '1' : 'auto'}; min-width:0; padding-right:8px;"><strong style="${t.completed ? 'text-decoration:line-through; opacity:0.5;' : ''} display:block; word-break: break-word; overflow-wrap: anywhere;">${t.name}</strong><small style="display:block; margin-top:2px;">📅 ${displayDateFR} ${displayTimeStr ? '⏰ ' + displayTimeStr : ''}</small>${t.isImminent ? `<small class="time-alert" style="display:block; margin-top:2px;">⚠️ ÉCHÉANCE PROCHE : Reste ${t.minutesLeft} min !</small>` : `<small style="color:var(--primary-dark); display:block; margin-top:2px;">🔔 Rappels : ${remindersText}</small>`}${ghostHtml}</div>${descHtml}</div><div class="task-actions" style="flex-shrink:0;">${taskSubView === 'active' ? `<button onclick="duplicateTask('${t.id}')" style="background:none; border:none; color:var(--primary); font-size:1.2rem; cursor:pointer; margin-right:5px;">📑</button>` : ''}${taskSubView === 'active' ? `<button onclick="editTask('${t.id}')" style="background:none; border:none; color:var(--primary); font-size:1.3rem; cursor:pointer;">✎</button>` : ''}<button onclick="deleteTask('${t.id}')" style="background:none; border:none; color:var(--danger); font-size:1.3rem; cursor:pointer;">×</button></div>`; } c.appendChild(d); 
    }); 
}

function toggleTaskCheck(id, currentStatus, specificDate) { const task = tasks.find(t => t.id === id); if(!task) return; if(!currentStatus) { let isMultiDate = (task.duplicateDays && task.duplicateDays.length > 0); if (isMultiDate && specificDate) { let allDates = [task.date, ...task.duplicateDays].sort(); let remainingDates = allDates.filter(d => typeof d === 'string' ? d !== specificDate : d.date !== specificDate); if (remainingDates.length > 0) { db.collection("tasks").add({ name: task.name, desc: task.desc || "", date: specificDate, time: task.time || "", reminders: task.reminders || [], importance: task.importance, completed: true, completedAtStr: todayStr, userId: task.userId, createdAt: task.createdAt || Date.now(), duplicateDays: [] }); let nextMainDate = remainingDates.shift(); db.collection("tasks").doc(id).update({ date: nextMainDate.date || nextMainDate, time: nextMainDate.time || task.time || "", duplicateDays: remainingDates }); showToast("Instance terminée et archivée ! ✨"); return; } } db.collection("tasks").doc(id).update({ completed: true, completedAtStr: todayStr }); } else { db.collection("tasks").doc(id).update({ completed: false, completedAtStr: firebase.firestore.FieldValue.delete() }); } }
function toggleTodo(id, currentStatus) { db.collection("dailyTodo").doc(id).update({ completed: !currentStatus }); } function toggleWeeklyTodo(id, currentStatus) { db.collection("weeklyTodo").doc(id).update({ completed: !currentStatus }); } function toggleRoutineTodo(id, currentStatus) { db.collection("routineTodo").doc(id).update({ completed: !currentStatus }); }
function deleteTask(id) { db.collection("tasks").doc(id).delete().then(() => { showToast("Tâche supprimée ! 🗑️"); }); } function deleteWeeklyTodo(id) { db.collection("weeklyTodo").doc(id).delete().then(() => showToast("Supprimé !")); } function deleteDailyTodo(id) { db.collection("dailyTodo").doc(id).delete().then(() => showToast("Supprimé !")); } function deleteRoutineTodo(id) { db.collection("routineTodo").doc(id).delete().then(() => showToast("Supprimé de la semaine type !")); }
function editTask(id) { const task = tasks.find(t => t.id === id); if(task) { editingId = id; unlockModalFields(); if(document.getElementById('task-name')) document.getElementById('task-name').value = task.name; if(document.getElementById('task-desc')) document.getElementById('task-desc').value = task.desc || ""; if(document.getElementById('task-date')) document.getElementById('task-date').value = task.date; setCustomTime('task-time', task.time || ""); setSelectedRemindersToBadges(task.reminders || []); if(document.getElementById('task-importance')) document.getElementById('task-importance').value = task.importance; document.getElementById('modal-title').innerText = "Modifier la tâche"; document.getElementById('task-modal').style.display = 'flex'; } }
function duplicateTask(id) { const task = tasks.find(t => t.id === id); if(task) { editingId = id; unlockModalFields(); if(document.getElementById('task-name')) document.getElementById('task-name').value = task.name; if(document.getElementById('task-desc')) document.getElementById('task-desc').value = task.desc || ""; if(document.getElementById('task-date')) document.getElementById('task-date').value = ""; setCustomTime('task-time', ""); if(document.getElementById('task-importance')) document.getElementById('task-importance').value = task.importance; setSelectedRemindersToBadges(task.reminders || []); if(document.getElementById('task-name')) document.getElementById('task-name').disabled = true; if(document.getElementById('task-desc')) document.getElementById('task-desc').disabled = true; if(document.getElementById('task-importance')) document.getElementById('task-importance').disabled = true; if(document.getElementById('date-input-label')) document.getElementById('date-input-label').innerText = "Nouvelle Date Prévue"; document.querySelectorAll('.reminder-badge').forEach(b => { b.style.pointerEvents = 'none'; b.classList.add('disabled-frozen'); }); document.getElementById('modal-title').innerText = "Dupliquer la tâche"; document.getElementById('task-modal').style.display = 'flex'; } }

// --- RENDER CALENDAR ---
function setViewState(s) { viewState = s; renderCalendar(); }
function renderCalendar() { const c = document.getElementById('calendar-content'); const t = document.getElementById('calendar-title'); c.innerHTML = ''; if (!c) return; document.querySelectorAll('#calendar-page .bubble').forEach(b => b.classList.remove('active')); document.getElementById(`btn-${viewState}`).classList.add('active'); const btnBday = document.getElementById('btn-add-birthday'), legend = document.getElementById('calendar-legend'); if (viewState === 'day') { if (btnBday) btnBday.style.display = 'block'; if (legend) legend.style.display = 'flex'; } else { if (btnBday) btnBday.style.display = 'none'; if (legend) legend.style.display = 'none'; } if (viewState === 'year') { c.className = 'grid-years'; t.innerText = "Années"; for (let i = selectedYear - 4; i <= selectedYear + 4; i++) { const d = document.createElement('div'); d.className = `grid-item ${i === selectedYear ? 'selected' : ''}`; d.innerText = i; d.onclick = () => { selectedYear = i; setViewState('month'); }; c.appendChild(d); } } else if (viewState === 'month') { c.className = 'grid-months'; t.innerText = selectedYear; monthNames.forEach((n, i) => { const d = document.createElement('div'); d.className = `grid-item ${i === selectedMonth ? 'selected' : ''}`; d.innerText = n; d.onclick = () => { selectedMonth = i; setViewState('day'); }; c.appendChild(d); }); } else { c.className = 'calendar-grid'; t.innerText = `${monthNames[selectedMonth]} ${selectedYear}`; const days = new Date(selectedYear, selectedMonth + 1, 0).getDate(), yearHolidays = getFrenchHolidays(selectedYear); for (let i = 1; i <= days; i++) { const ds = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`, md = `${String(selectedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`; const holiday = yearHolidays.find(h => h.date === ds), dayBirthdays = birthdays.filter(b => b.date.endsWith(md)); const myDayTasks = tasks.filter(tk => { if (tk.date === ds) return true; if (tk.duplicateDays) return tk.duplicateDays.some(g => (typeof g === 'string' ? g : g.date) === ds); return false; }); const friendDayTasks = sharedTasks.filter(tk => { if (tk.date === ds) return true; if (tk.duplicateDays) return tk.duplicateDays.some(g => (typeof g === 'string' ? g : g.date) === ds); return false; }); const totalTasks = [...myDayTasks, ...friendDayTasks]; let dayColors = []; if (totalTasks.length > 0) { const imps = totalTasks.map(tk => tk.importance); if(imps.includes('high')) dayColors.push('var(--danger)'); if(imps.includes('medium')) dayColors.push('var(--warning)'); if(imps.includes('low')) dayColors.push('var(--success)'); } if (holiday) dayColors.push('var(--holiday-color)'); if (dayBirthdays.length > 0) dayColors.push('var(--birthday-color)'); dayColors = [...new Set(dayColors)]; let bottomLineHtml = ''; if (dayColors.length > 0) { let bgStyle = ""; if (dayColors.length === 1) bgStyle = dayColors[0]; else { let stops = [], step = 100 / dayColors.length; dayColors.forEach((color, idx) => { stops.push(`${color} ${idx * step}%`, `${color} ${(idx+1) * step}%`); }); bgStyle = `linear-gradient(to right, ${stops.join(', ')})`; } bottomLineHtml = `<div style="position:absolute; bottom:0; left:0; width:100%; height:6px; background:${bgStyle}; border-radius: 0 0 10px 10px;"></div>`; } const div = document.createElement('div'); div.className = `day-card ${ds === todayStr ? 'is-today' : ''}`; let countHtml = ""; if(totalTasks.length > 0) countHtml = `<span style="position:absolute; top:4px; right:4px; font-size:0.65rem; font-weight:bold; color:var(--primary-dark); background:rgba(0, 206, 209, 0.15); border-radius:10px; padding:2px 5px;">+${totalTasks.length}</span>`; div.onclick = () => openCalendarDayModal(i, monthNames[selectedMonth], selectedYear, totalTasks, ds, holiday, dayBirthdays); div.innerHTML = `${countHtml}<span style="font-size:0.6rem; opacity:0.5; display:block; margin-top: ${totalTasks.length>0 ? '10px' : '4px'};">${dayInitials[new Date(selectedYear, selectedMonth, i).getDay()]}</span><b>${i}</b>${bottomLineHtml}`; c.appendChild(div); } } }
function openCalendarDayModal(day, monthName, year, totalDayTasks, currentFullDate, holiday, dayBirthdays) { document.getElementById('cal-modal-date-title').innerText = `${day} ${monthName} ${year}`; const container = document.getElementById('cal-modal-tasks-container'); container.innerHTML = ''; if (holiday) container.innerHTML += `<div style="padding: 12px; border-radius: 12px; border-left: 6px solid var(--holiday-color); background: rgba(52, 152, 219, 0.05); margin-bottom: 5px;"><strong style="color:var(--holiday-color);">🏖️ ${holiday.name}</strong></div>`; if (dayBirthdays && dayBirthdays.length > 0) { dayBirthdays.forEach(b => { container.innerHTML += `<div style="padding: 12px; border-radius: 12px; border-left: 6px solid var(--birthday-color); background: rgba(232, 67, 147, 0.05); margin-bottom: 5px; display:flex; justify-content:space-between; align-items:center;"><strong style="color:var(--birthday-color);">🎂 Anniv. de ${b.name}</strong><button onclick="event.stopPropagation(); deleteBirthday('${b.id}')" style="background:none; border:none; color:var(--danger); font-size:1.2rem; cursor:pointer;">×</button></div>`; }); } if(totalDayTasks.length === 0 && !holiday && (!dayBirthdays || dayBirthdays.length === 0)) { container.innerHTML = '<p style="text-align:center; opacity:0.5; font-style:italic;">Rien de prévu</p>'; } else { totalDayTasks.forEach(t => { let specificTime = t.time, isCopy = false; if (t.date !== currentFullDate) { isCopy = true; let ghost = t.duplicateDays.find(g => (typeof g === 'string' ? g : g.date) === currentFullDate); if (ghost && ghost.time) specificTime = ghost.time; } const isCopyTag = isCopy ? ' <small style="opacity:0.6; font-size:0.75rem;">(Prévu 🗓️)</small>' : ''; const ownerTag = t.ownerName ? ` <small style="opacity:0.5; font-style:italic; margin-left:5px;">(par ${t.ownerName})</small>` : ''; container.innerHTML += `<div style="padding: 12px; border-radius: 12px; border-left: 6px solid var(--${t.importance === 'high'?'danger':t.importance==='medium'?'warning':'success'}); background: rgba(128,128,128,0.05); text-align:left;"><strong style="${t.completed ? 'text-decoration:line-through; opacity:0.5;' : ''}; word-break: break-word; overflow-wrap: anywhere;">${t.name}</strong>${ownerTag}${isCopyTag}${specificTime ? `<span style="float:right; font-size:0.85rem; opacity:0.7;">⏰ ${specificTime}</span>`:''}</div>`; }); } document.getElementById('calendar-day-modal').style.display = 'flex'; }

// --- RENDER TODO ---
function setTodoMode(m) { todoMode = m; renderTodo(); }
function renderTodo() { const c = document.getElementById('todo-content'); if (!c) return; document.querySelectorAll('#todo-page .bubble').forEach(b => b.classList.remove('active')); if (todoMode === 'daily') document.getElementById('btn-daily').classList.add('active'); else if (todoMode === 'weekly') document.getElementById('btn-weekly').classList.add('active'); else if (todoMode === 'routine') document.getElementById('btn-routine').classList.add('active'); if(todoMode === 'daily') { document.getElementById('todo-today-date').innerText = new Date().toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long'}); c.innerHTML = '<div class="weekly-container"></div>'; const wc = c.querySelector('.weekly-container'); for (let h = 8; h <= 20; h++) { const currentHourStr = `${h.toString().padStart(2, '0')}:00`; let items = dailyTodo.filter(it => it.date === todayStr && parseInt(it.time.split(':')[0]) === h), weeklyItems = weeklyTodo.filter(it => parseInt(it.dayOfWeek) === currentDayOfWeek && parseInt(it.time.split(':')[0]) === h), routineItems = routineTodo.filter(it => parseInt(it.dayOfWeek) === currentDayOfWeek && parseInt(it.time.split(':')[0]) === h); let combinedItems = [...items, ...weeklyItems, ...routineItems]; combinedItems.sort((a,b) => a.time.localeCompare(b.time)); const hourCard = document.createElement('div'); hourCard.className = 'weekly-day-card'; hourCard.innerHTML = `<div class="weekly-day-header"><span class="weekly-day-title">${currentHourStr}</span><button onclick="openTodoModal('${h.toString().padStart(2,'0')}:00', false, 0, false)" class="weekly-add-btn">+</button></div><div class="weekly-subtasks">${combinedItems.map(it => { const isWeekly = it.hasOwnProperty('dayOfWeek') && !it.hasOwnProperty('isRoutine'), isRoutine = it.hasOwnProperty('isRoutine'); let checkFunc = `toggleTodo('${it.id}', ${it.completed})`, delFunc = `deleteDailyTodo('${it.id}')`, labelSuffix = ''; if (isWeekly) { checkFunc = `toggleWeeklyTodo('${it.id}', ${it.completed})`; delFunc = `deleteWeeklyTodo('${it.id}')`; labelSuffix = ' <small style="opacity:0.5;">(Hebdo)</small>'; } else if (isRoutine) { checkFunc = `toggleRoutineTodo('${it.id}', ${it.completed})`; delFunc = `deleteRoutineTodo('${it.id}')`; labelSuffix = ' <small style="opacity:0.5; color:var(--primary-dark);">(Type ⚙️)</small>'; } return `<div class="weekly-item"><span onclick="event.stopPropagation(); ${checkFunc}" style="cursor:pointer;" class="weekly-item-text ${it.completed ? 'todo-completed' : ''}"><b>${it.time}</b> : ${it.name}${labelSuffix}</span><div class="weekly-item-actions"><button onclick="editTodoItem('${it.id}', '${it.name}', '${it.time}', ${(isWeekly || isRoutine)}, ${(isWeekly || isRoutine) ? it.dayOfWeek : 0}, ${isRoutine})" style="color:var(--primary);">✎</button><button onclick="${delFunc}" style="color:var(--danger);">×</button></div></div>`; }).join('') || '<span class="empty-subtasks-msg">Aucun événement</span>'}</div>`; wc.appendChild(hourCard); } } else if (todoMode === 'weekly') { document.getElementById('todo-today-date').innerText = "Planification Hebdomadaire"; c.innerHTML = '<div class="weekly-container"></div>'; const wc = c.querySelector('.weekly-container'); const presidentialOrder = [1, 2, 3, 4, 5, 6, 0]; presidentialOrder.forEach(dayNum => { let combinedTasks = [...weeklyTodo.filter(it => parseInt(it.dayOfWeek) === dayNum), ...routineTodo.filter(it => parseInt(it.dayOfWeek) === dayNum)]; combinedTasks.sort((a,b) => a.time.localeCompare(b.time)); const dayCard = document.createElement('div'); dayCard.className = 'weekly-day-card'; dayCard.innerHTML = `<div class="weekly-day-header"><span class="weekly-day-title">${dayNamesFr[dayNum]}</span><button onclick="openTodoModal('12:00', true, ${dayNum}, false)" class="weekly-add-btn">+</button></div><div class="weekly-subtasks">${combinedTasks.map(it => { const isRoutine = it.hasOwnProperty('isRoutine') || routineTodo.some(r => r.id === it.id); const checkFunc = isRoutine ? `toggleRoutineTodo('${it.id}', ${it.completed})` : `toggleWeeklyTodo('${it.id}', ${it.completed})`, delFunc = isRoutine ? `deleteRoutineTodo('${it.id}')` : `deleteWeeklyTodo('${it.id}')`; return `<div class="weekly-item"><span onclick="${checkFunc}" style="cursor:pointer;" class="weekly-item-text ${it.completed ? 'todo-completed' : ''}"><b>${it.time}</b> : ${it.name} ${isRoutine ? '<small style="opacity:0.5; color:var(--primary-dark);">(Type ⚙️)</small>':''}</span><div class="weekly-item-actions"><button onclick="editTodoItem('${it.id}', '${it.name}', '${it.time}', true, ${dayNum}, ${isRoutine})" style="color:var(--primary);">✎</button><button onclick="${delFunc}" style="color:var(--danger);">×</button></div></div>`; }).join('') || '<span class="empty-subtasks-msg">Aucune activité planifiée</span>'}</div>`; wc.appendChild(dayCard); }); } else if (todoMode === 'routine') { document.getElementById('todo-today-date').innerText = "Configuration de la Semaine Type ⚙️"; c.innerHTML = '<div class="weekly-container"></div>'; const wc = c.querySelector('.weekly-container'); const presidentialOrder = [1, 2, 3, 4, 5, 6, 0]; presidentialOrder.forEach(dayNum => { const dayTasks = routineTodo.filter(it => parseInt(it.dayOfWeek) === dayNum); dayTasks.sort((a,b) => a.time.localeCompare(b.time)); const dayCard = document.createElement('div'); dayCard.className = 'weekly-day-card'; dayCard.innerHTML = `<div class="weekly-day-header"><span class="weekly-day-title">${dayNamesFr[dayNum]}</span><button onclick="openTodoModal('12:00', true, ${dayNum}, true)" class="weekly-add-btn">+</button></div><div class="weekly-subtasks">${dayTasks.map(it => `<div class="weekly-item"><span class="weekly-item-text"><b>${it.time}</b> : ${it.name}</span><div class="weekly-item-actions"><button onclick="editTodoItem('${it.id}', '${it.name}', '${it.time}', true, ${dayNum}, true)" style="color:var(--primary);">✎</button><button onclick="deleteRoutineTodo('${it.id}')" style="color:var(--danger);">×</button></div></div>`).join('') || '<span class="empty-subtasks-msg">Aucune tâche type définie</span>'}</div>`; wc.appendChild(dayCard); }); } }
function openTodoModal(time, isWeeklyOrRoutine, dayNum = 1, isRoutine = false) { editingTodoId = null; setCustomTime('todo-time', time); document.getElementById('todo-task-name').value = ''; document.getElementById('todo-modal-title').innerText = isRoutine ? "Ajouter à la Semaine Type" : "Ajouter à la To-Do List"; if(isWeeklyOrRoutine) { document.getElementById('todo-day-selector-block').style.display = 'flex'; document.getElementById('todo-day-select').value = dayNum; } else { document.getElementById('todo-day-selector-block').style.display = 'none'; } document.getElementById('save-todo').setAttribute('data-weekly-mode', isWeeklyOrRoutine && !isRoutine); document.getElementById('save-todo').setAttribute('data-routine-mode', isRoutine); document.getElementById('todo-modal').style.display = 'flex'; }
function editTodoItem(id, name, time, isWeeklyOrRoutine, dayNum = 1, isRoutine = false) { editingTodoId = id; setCustomTime('todo-time', time); document.getElementById('todo-task-name').value = name; document.getElementById('todo-modal-title').innerText = isRoutine ? "Modifier la Semaine Type" : "Modifier la To-Do List"; if(isWeeklyOrRoutine) { document.getElementById('todo-day-selector-block').style.display = 'flex'; document.getElementById('todo-day-select').value = dayNum; } else { document.getElementById('todo-day-selector-block').style.display = 'none'; } document.getElementById('save-todo').setAttribute('data-weekly-mode', isWeeklyOrRoutine && !isRoutine); document.getElementById('save-todo').setAttribute('data-routine-mode', isRoutine); document.getElementById('todo-modal').style.display = 'flex'; }

// --- EVENEMENTS CLICK (SAVE & MODALS) ---
let btnSaveTask = document.getElementById('save-task'); if (btnSaveTask) { btnSaveTask.onclick = () => { const n = document.getElementById('task-name').value.trim(), dStr = document.getElementById('task-desc').value.trim(), singleDate = document.getElementById('task-date').value, time = getCustomTime('task-time'), imp = document.getElementById('task-importance').value, reminders = getSelectedRemindersFromBadges(); if(n && currentUser) { if(document.getElementById('modal-title').innerText === "Dupliquer la tâche" && editingId) { const task = tasks.find(t => t.id === editingId); if (task && singleDate) { let allOccurrences = [{date: task.date, time: task.time || ""}], currentGhosts = Array.isArray(task.duplicateDays) ? task.duplicateDays : []; currentGhosts.forEach(g => { allOccurrences.push(typeof g === 'string' ? {date: g, time: task.time} : g); }); allOccurrences.push({date: singleDate, time: time}); allOccurrences.sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : (a.time || "").localeCompare(b.time || "")); let nextMain = allOccurrences.shift(); db.collection("tasks").doc(editingId).update({ date: nextMain.date, time: nextMain.time || "", desc: task.desc || "", duplicateDays: allOccurrences }); editingId = null; showToast("Date planifiée avec succès ! 🗓️"); } } else if(editingId && singleDate) { db.collection("tasks").doc(editingId).update({ name: n, desc: dStr, date: singleDate, time: time, reminders: reminders, importance: imp }); editingId = null; showToast("Tâche modifiée ! ✎"); } else if (singleDate) { db.collection("tasks").add({ name: n, desc: dStr, date: singleDate, time: time, reminders: reminders, importance: imp, completed: false, userId: currentUser.uid, createdAt: Date.now(), duplicateDays: [] }); showToast("Tâche enregistrée ! ✨"); } unlockModalFields(); document.getElementById('task-modal').style.display = 'none'; } }; }
let btnSaveTodo = document.getElementById('save-todo'); if (btnSaveTodo) { btnSaveTodo.onclick = () => { const n = document.getElementById('todo-task-name').value.trim(), t = getCustomTime('todo-time'), isWeekly = document.getElementById('save-todo').getAttribute('data-weekly-mode') === 'true', isRoutine = document.getElementById('save-todo').getAttribute('data-routine-mode') === 'true'; if(n && t && currentUser) { let targetCollection = "dailyTodo"; if (isWeekly) targetCollection = "weeklyTodo"; else if (isRoutine) targetCollection = "routineTodo"; if(editingTodoId) { let updateData = { name: n, time: t }; if(isWeekly || isRoutine) updateData.dayOfWeek = document.getElementById('todo-day-select').value; db.collection(targetCollection).doc(editingTodoId).update(updateData).then(() => { showToast(isRoutine ? "Semaine type modifiée ! ⚙️" : "Activité modifiée ! ✎"); }); editingTodoId = null; } else { if(isRoutine) { db.collection("routineTodo").add({ name: n, time: t, dayOfWeek: document.getElementById('todo-day-select').value, completed: false, isRoutine: true, userId: currentUser.uid }).then(() => { showToast("Ajouté à la semaine type ! ⚙️"); }); } else if(isWeekly) { db.collection("weeklyTodo").add({ name: n, time: t, dayOfWeek: document.getElementById('todo-day-select').value, completed: false, userId: currentUser.uid }).then(() => { showToast("Activité hebdomadaire ajoutée ! 🗓️"); }); } else { db.collection("dailyTodo").add({ name: n, time: t, date: todayStr, completed: false, userId: currentUser.uid }).then(() => { showToast("Activité ajoutée ! ✨"); }); } } document.getElementById('todo-modal').style.display = 'none'; document.getElementById('todo-task-name').value = ''; } }; }
let btnSaveBirthday = document.getElementById('save-birthday'); if (btnSaveBirthday) { btnSaveBirthday.onclick = () => { const n = document.getElementById('birthday-name').value.trim(), d = document.getElementById('birthday-date').value; if (n && d && currentUser) { db.collection("birthdays").add({ name: n, date: d, userId: currentUser.uid, createdAt: Date.now() }).then(() => { showToast("Anniversaire enregistré ! 🎂"); document.getElementById('birthday-modal').style.display = 'none'; }); } }; }
let btnAddTask = document.getElementById('add-task-btn'); if (btnAddTask) { btnAddTask.onclick = () => { editingId = null; unlockModalFields(); if(document.getElementById('task-name')) document.getElementById('task-name').value = ""; if(document.getElementById('task-desc')) document.getElementById('task-desc').value = ""; setCustomTime('task-time', ""); setSelectedRemindersToBadges([]); if(document.getElementById('task-date')) document.getElementById('task-date').value = todayStr; document.getElementById('modal-title').innerText = "Nouvelle Tâche"; document.getElementById('task-modal').style.display = 'flex'; }; }
let btnCloseTaskModal = document.getElementById('close-modal'); if (btnCloseTaskModal) { btnCloseTaskModal.onclick = () => { unlockModalFields(); document.getElementById('task-modal').style.display = 'none'; }; }
let btnCloseTodoModal = document.getElementById('close-todo-modal'); if (btnCloseTodoModal) { btnCloseTodoModal.onclick = () => { document.getElementById('todo-modal').style.display = 'none'; } }
let btnLogin = document.getElementById('btn-login'); if (btnLogin) { btnLogin.onclick = () => { const email = document.getElementById('auth-email').value, pass = document.getElementById('auth-pass').value; if(email && pass) auth.signInWithEmailAndPassword(email, pass).then(() => { showToast("Ravi de vous revoir ! 👋"); }).catch(err => showToast("Erreur : " + err.message)); }; }
let btnRegister = document.getElementById('btn-register'); if (btnRegister) { btnRegister.onclick = () => { const email = document.getElementById('auth-email').value, pass = document.getElementById('auth-pass').value; if(email && pass) auth.createUserWithEmailAndPassword(email, pass).then(() => showToast("Compte créé avec succès ! 🎉")).catch(err => showToast("Erreur : " + err.message)); }; }
let btnGoogle = document.getElementById('btn-google'); if (btnGoogle) { btnGoogle.onclick = () => { const provider = new firebase.auth.GoogleAuthProvider(); auth.signInWithPopup(provider).then(() => { showToast("Connexion Google réussie ! 🚀"); }).catch((err) => { showToast("Erreur Google : " + err.message); }); }; }
let btnLogout = document.getElementById('btn-logout'); if (btnLogout) { btnLogout.onclick = () => { auth.signOut().then(() => { showToast("Déconnexion réussie."); }); }; }

window.onclick = (e) => { 
    if(e.target.classList && e.target.classList.contains('modal')) { 
        unlockModalFields(); 
        if(document.getElementById('task-modal')) document.getElementById('task-modal').style.display = 'none'; 
        if(document.getElementById('todo-modal')) document.getElementById('todo-modal').style.display = 'none'; 
        if(document.getElementById('calendar-day-modal')) document.getElementById('calendar-day-modal').style.display = 'none'; 
        if(document.getElementById('welcome-modal')) document.getElementById('welcome-modal').style.display = 'none'; 
        if(document.getElementById('ghost-modal')) document.getElementById('ghost-modal').style.display = 'none'; 
        if(document.getElementById('birthday-modal')) document.getElementById('birthday-modal').style.display = 'none'; 
        if(document.getElementById('share-modal')) document.getElementById('share-modal').style.display = 'none'; 
        if(document.getElementById('shopping-item-modal')) document.getElementById('shopping-item-modal').style.display = 'none'; 
        if(document.getElementById('custom-card-modal')) document.getElementById('custom-card-modal').style.display = 'none'; 
        if(document.getElementById('shopping-list-multi-share-modal')) document.getElementById('shopping-list-multi-share-modal').style.display = 'none'; 
    } 
};

if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').then(reg => { console.log('SW OK'); }).catch(err => { console.log('SW FAIL'); }); }); }
