import { auth, db, showToast } from './app.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roleInput = document.getElementById('selected-role');
const submitBtn = document.getElementById('submit-btn');
const toggleAuth = document.getElementById('toggle-auth');
const googleBtn = document.getElementById('google-btn');
const roleBtns = document.querySelectorAll('.role-btn');

let isLogin = true;

// Role selection logic
roleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        roleBtns.forEach(b => b.classList.remove('border-primary', 'text-primary', 'bg-primary/10'));
        roleBtns.forEach(b => b.classList.add('border-gray-300', 'dark:border-gray-600'));
        
        btn.classList.add('border-primary', 'text-primary', 'bg-primary/10');
        btn.classList.remove('border-gray-300', 'dark:border-gray-600');
        roleInput.value = btn.dataset.role;
    });
});

// Auth mode toggle
toggleAuth.addEventListener('click', (e) => {
    e.preventDefault();
    isLogin = !isLogin;
    
    document.getElementById('form-title').textContent = isLogin ? 'Welcome Back' : 'Create Account';
    document.getElementById('form-subtitle').textContent = isLogin ? 'Please enter your details' : 'Join our community today';
    submitBtn.querySelector('span').textContent = isLogin ? 'Sign In' : 'Sign Up';
    toggleAuth.textContent = isLogin ? 'Sign Up' : 'Sign In';
    document.getElementById('toggle-text').textContent = isLogin ? "Don't have an account?" : 'Already have an account?';
    
    document.getElementById('role-container').classList.toggle('hidden', isLogin);
});

// Handle form submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    const role = roleInput.value;
    
    submitBtn.disabled = true;
    document.getElementById('spinner').classList.remove('hidden');

    try {
        if (isLogin) {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                showToast(`Welcome back, ${userData.role}!`, 'success');
                redirectUser(userData.role);
            }
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                email,
                role,
                createdAt: new Date().toISOString()
            });
            showToast('Account created successfully!', 'success');
            redirectUser(role);
        }
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        document.getElementById('spinner').classList.add('hidden');
    }
});

// Google Login
googleBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            redirectUser(userDoc.data().role);
        } else {
            // New user via Google - default to community role
            await setDoc(doc(db, 'users', user.uid), {
                email: user.email,
                role: 'community',
                createdAt: new Date().toISOString()
            });
            redirectUser('community');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
});

function redirectUser(role) {
    setTimeout(() => {
        if (role === 'ngo') window.location.href = '/ngo.html';
        else if (role === 'volunteer') window.location.href = '/volunteer.html';
        else window.location.href = '/report.html';
    }, 1000);
}
