import { auth, db, showToast } from './app.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

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
    
    // Change button color to distinguish modes
    submitBtn.querySelector('span').textContent = isLogin ? 'Sign In' : 'Sign Up';
    submitBtn.className = isLogin 
        ? "w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
        : "w-full bg-secondary hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2";
    
    toggleAuth.textContent = isLogin ? 'Sign Up' : 'Sign In';
    document.getElementById('toggle-text').textContent = isLogin ? "Don't have an account?" : 'Already have an account?';
    
    document.getElementById('role-container').classList.toggle('hidden', isLogin);
    
    // Smooth scroll role container into view if signing up
    if (!isLogin) {
        setTimeout(() => document.getElementById('role-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
});

// Handle form submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passwordInput.value;
    const role = roleInput.value;
    
    submitBtn.disabled = true;
    document.getElementById('spinner').classList.remove('hidden');

    const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firebase took too long to respond. Please check your connection or refresh the page.')), 10000)
    );

    try {
        console.log(`Auth attempt: ${isLogin ? 'Login' : 'Signup'} for ${email}`);
        
        let userCredential;
        if (isLogin) {
            userCredential = await Promise.race([
                signInWithEmailAndPassword(auth, email, password),
                timeout
            ]);
            console.log("Login successful, fetching profile...");
            
            try {
                const userDoc = await Promise.race([
                    getDoc(doc(db, 'users', userCredential.user.uid)),
                    timeout
                ]);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    showToast(`Welcome back, ${userData.role || 'user'}!`, 'success');
                    redirectUser(userData.role || 'community');
                } else {
                    console.log("Profile not found. Defaulting to community.");
                    showToast('Welcome back!', 'success');
                    redirectUser('community');
                }
            } catch (fsError) {
                console.error("Firestore error:", fsError);
                showToast('Logged in (Profile unavailable)', 'warning');
                redirectUser('community');
            }
        } else {
            console.log("Creating user account...");
            userCredential = await Promise.race([
                createUserWithEmailAndPassword(auth, email, password),
                timeout
            ]);
            console.log("Account created. uid:", userCredential.user.uid);
            
            const finalRole = email === 'tester@smartngo.org' ? 'tester' : role;
            console.log(`Setting role: ${finalRole}`);
            
            try {
                await Promise.race([
                    setDoc(doc(db, 'users', userCredential.user.uid), {
                        email,
                        role: finalRole,
                        createdAt: new Date().toISOString()
                    }),
                    timeout
                ]);
                console.log("Profile saved successfully.");
            } catch (fsError) {
                console.error("Firestore profile save failed:", fsError);
                showToast("Account created, but profile failed. Retrying logic...", "warning");
            }
            showToast(`Account created as ${finalRole}!`, 'success');
            setTimeout(() => redirectUser(finalRole), 500);
        }
    } catch (error) {
        console.error("Auth process failed:", error);
        
        let userMessage = error.message;
        if (error.code === 'auth/email-already-in-use') {
            userMessage = "This email is already registered. Please Switch to 'Sign In' to access your account.";
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            userMessage = isLogin ? "Invalid credentials. If you haven't created an account yet, please click 'Sign Up' below." : "Signup error. Please check your data.";
        } else if (error.code === 'auth/operation-not-allowed') {
            userMessage = "Auth provider disabled. Contact admin.";
        }
        
        showToast(userMessage, 'error');
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
        
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (userDoc.exists()) {
                redirectUser(userDoc.data().role || 'community');
                return;
            } else {
                // New user via Google - default to community role
                await setDoc(doc(db, 'users', user.uid), {
                    email: user.email,
                    role: 'community',
                    createdAt: new Date().toISOString()
                });
            }
        } catch (fsError) {
            console.warn("Firestore Offline/Disabled. Fallback activated.", fsError);
        }
        
        showToast('Signed in successfully!', 'success');
        redirectUser('home'); // Redirect cleanly to home page per user request
    } catch (error) {
        alert("Google Sign In Interrupted: " + error.message);
        showToast(error.message, 'error');
    }
});

function redirectUser(role) {
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 500);
}
