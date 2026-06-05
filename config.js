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
let shoppingItems = []; 
let mySharedLists = []; 
let customShoppingCards = []; 
let friends = []; 
let friendUnsubscribes = {};
let unsubscribeUser, sharedListsUnsubscribe, shoppingItemsUnsubscribe;
let currentUser = null, userNickname = "", hasShownWelcomeThisSession = false, taskSubView = "active"; 
let currentShoppingListId = "personal"; 
let myAgendaCode = ""; 

window.currentListMemberNames = {}; // Utilisé pour stocker les pseudos des participants de la liste active

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
