import firebaseConfig from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    } else {
        document.documentElement.classList.remove('dark');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
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
onAuthStateChanged(auth, (user) => {
    const authBtn = document.getElementById('auth-btn');
    if (user) {
        if (authBtn) {
            authBtn.textContent = 'Sign Out';
            authBtn.href = '#';
            authBtn.addEventListener('click', (e) => {
                e.preventDefault();
                signOut(auth).then(() => {
                    showToast('Signed out successfully', 'success');
                    window.location.href = '/';
                });
            });
        }
    } else {
        if (authBtn) {
            authBtn.textContent = 'Login';
            authBtn.href = '/auth.html';
        }
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
