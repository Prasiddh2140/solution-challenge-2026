import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Export instances
export { auth, db, storage };

// Theme Toggle Logic
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function setTheme(isDark) {
    if (isDark) {
        document.documentElement.classList.add('dark');
        if (themeIcon) themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
        document.documentElement.classList.remove('dark');
        if (themeIcon) themeIcon.classList.replace('fa-sun', 'fa-moon');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Initial theme setup
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
setTheme(savedTheme === 'dark');

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        setTheme(!document.documentElement.classList.contains('dark'));
    });
}

// Toast Notification System
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `p-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
        type === 'success' ? 'bg-secondary text-white' :
        type === 'error' ? 'bg-danger text-white' :
        type === 'warning' ? 'bg-accent text-white' :
        'bg-primary text-white'
    }`;
    
    const icon = document.createElement('i');
    icon.className = `fa-solid ${
        type === 'success' ? 'fa-circle-check' :
        type === 'error' ? 'fa-circle-exclamation' :
        type === 'warning' ? 'fa-triangle-exclamation' :
        'fa-circle-info'
    }`;
    
    toast.appendChild(icon);
    toast.appendChild(document.createTextNode(message));
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    });
}

// Global Auth State Observer
// Global Auth State Observer
onAuthStateChanged(auth, async (user) => {
    const authContainer = document.getElementById('profile-widget-container');
    if (!authContainer) return;

    if (user) {
        // RENDERING STRATEGY: 
        // 1. Create the widget structure immediately using available session data
        // 2. Fetch extra Firestore data (role, display name override) asynchronously
        // 3. Update the widget when data arrives
        
        let widget = document.getElementById('user-profile-widget');
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'user-profile-widget';
            widget.className = 'relative flex items-center justify-center';
            authContainer.innerHTML = ''; // Only clear initially if no widget exists
            authContainer.appendChild(widget);
        }

        const initialName = user.displayName || user.email.split('@')[0];
        const initialPhoto = user.photoURL || `https://ui-avatars.com/api/?name=${initialName}&background=3b82f6&color=fff`;

        // Render Initial "Skeleton" or Session-based UI
        widget.innerHTML = `
            <button id="profile-bubble" title="View Profile" class="w-10 h-10 rounded-full p-0.5 bg-gradient-to-br from-primary to-secondary shadow-lg border-2 border-white dark:border-gray-700 cursor-pointer transition-all hover:scale-110 active:scale-95 overflow-hidden">
                <img id="profile-bubble-img" src="${initialPhoto}" class="w-full h-full rounded-full object-cover">
            </button>
            <div id="profile-dropdown" class="hidden absolute right-0 top-full mt-4 w-72 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 z-[99999] animate-pop-in">
                <div class="flex flex-col items-center text-center mb-6">
                    <div class="w-16 h-16 rounded-full p-1 bg-gradient-to-r from-primary to-secondary mb-3">
                        <img id="dropdown-profile-img" src="${initialPhoto}" class="w-full h-full rounded-full border-2 border-white object-cover">
                    </div>
                    <h3 id="dropdown-display-name" class="font-bold text-lg">${initialName}</h3>
                    <p id="dropdown-user-role" class="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full mt-2 italic">Loading Role...</p>
                    <p class="text-xs text-gray-400 mt-2">${user.email}</p>
                </div>
                <div class="space-y-2 border-t border-gray-100 dark:border-gray-700 pt-4">
                    <a href="/profile.html" class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition font-bold text-xs">
                        <i class="fa-solid fa-circle-user text-accent"></i> My Profile
                    </a>
                    <a href="/volunteer.html" class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition font-bold text-xs">
                        <i class="fa-solid fa-user-tie text-primary"></i> Volunteer Dashboard
                    </a>
                    <a href="/ngo.html" class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition font-bold text-xs">
                        <i class="fa-solid fa-clipboard-list text-secondary"></i> My Reports
                    </a>
                    <div class="h-px bg-gray-100 dark:bg-gray-700 my-2"></div>
                    <button id="logout-btn-global" class="w-full flex items-center gap-3 p-3 text-xs font-bold text-danger bg-red-50 dark:bg-red-900/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition">
                        <i class="fa-solid fa-power-off"></i> Sign Out
                    </button>
                </div>
            </div>
            <style>
                @keyframes pop-in { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-pop-in { animation: pop-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            </style>
        `;

        // Interactivity
        const bubble = widget.querySelector('#profile-bubble');
        const dropdown = widget.querySelector('#profile-dropdown');
        bubble.onclick = (e) => { e.stopPropagation(); dropdown.classList.toggle('hidden'); };
        document.addEventListener('click', () => dropdown.classList.add('hidden'));
        dropdown.onclick = (e) => e.stopPropagation();

        const logoutBtn = widget.querySelector('#logout-btn-global');
        logoutBtn.onclick = () => {
            signOut(auth).then(() => {
                showToast('Logged out.', 'info');
                location.href = '/';
            });
        };

        // ASYNC ENHANCEMENT: Fetch extra data and update
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.displayName) {
                    document.getElementById('dropdown-display-name').textContent = userData.displayName;
                    // Update Avatars if display name changed
                    const avatarUrl = userData.photoURL || `https://ui-avatars.com/api/?name=${userData.displayName}&background=3b82f6&color=fff`;
                    document.getElementById('profile-bubble-img').src = avatarUrl;
                    document.getElementById('dropdown-profile-img').src = avatarUrl;
                }
                if (userData.role) {
                    const roleEl = document.getElementById('dropdown-user-role');
                    roleEl.textContent = userData.role;
                    roleEl.classList.remove('italic', 'text-gray-400');
                    roleEl.classList.add('text-primary');
                }
            } else {
                document.getElementById('dropdown-user-role').textContent = 'Guest / Community';
            }
        } catch (e) { 
            console.error("Profile enhancement failed:", e);
            document.getElementById('dropdown-user-role').textContent = 'Community';
        }

    } else {
        // Logged out: Single persistent Login button
        authContainer.innerHTML = `<a href="/auth.html" class="bg-primary hover:bg-blue-600 text-white px-5 py-2 rounded-xl transition text-sm font-bold shadow-lg shadow-primary/20 flex items-center gap-2 transition transform hover:scale-105">
            <i class="fa-solid fa-right-to-bracket"></i> Login
        </a>`;
    }
});


// Helper for mobile menu (if needed)
// ...

// Animation for toasts
const style = document.createElement('style');
style.textContent = `
    @keyframes slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in {
        animation: slide-in 0.3s ease-out forwards;
    }
`;
document.head.appendChild(style);
