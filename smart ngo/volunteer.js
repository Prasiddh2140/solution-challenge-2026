import { auth, db, showToast } from './app.js';
import { 
    doc, 
    getDoc, 
    setDoc,
    updateDoc, 
    collection, 
    query, 
    where, 
    onSnapshot,
    orderBy,
    serverTimestamp,
    limit,
    increment
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// State
let userData = null;
let currentCoords = { lat: 0, lng: 0 };

// Profile & Skills Logic
async function initProfile() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '/auth.html';
            return;
        }

        // Get Location for proximity matching
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                currentCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            });
        }

        const userDocRef = doc(db, 'users', user.uid);
        onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                userData = docSnap.data();
                updateProfileUI();
                updateAvailabilityUI();
                updateProgressionUI();
            }
        });

        initOpportunitiesListener();
        initAssignmentsListener(user.uid);
    });
}

function updateProfileUI() {
    if (!userData) return;
    const name = userData.displayName || auth.currentUser.email.split('@')[0];
    const displayElement = document.getElementById('display-name');
    if (displayElement) displayElement.textContent = name;
    
    const userNameElement = document.getElementById('user-name');
    if (userNameElement) userNameElement.textContent = name;
    
    // Update Photo
    const profileImg = document.getElementById('profile-img');
    if (profileImg) {
        profileImg.src = userData.photoURL || `https://ui-avatars.com/api/?name=${name}&background=3b82f6&color=fff`;
    }

    // Update Joining Date
    const joiningDateEl = document.getElementById('joining-date');
    if (joiningDateEl && userData.createdAt) {
        const date = new Date(userData.createdAt);
        const options = { month: 'short', year: 'numeric' };
        joiningDateEl.textContent = `Member since ${date.toLocaleDateString('en-US', options)}`;
    }

    // Update Stats
    document.getElementById('completed-count').textContent = userData.completedTasks || 0;
    document.getElementById('impact-points').textContent = userData.totalPoints || 0;
    
    const skillsList = document.getElementById('skills-list');
    skillsList.innerHTML = '';
    (userData.skills || []).forEach(skill => {
        const span = document.createElement('span');
        span.className = 'px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px] font-bold';
        span.textContent = skill;
        skillsList.appendChild(span);
    });
}

// Skills Modal Logic
const skillsModal = document.getElementById('skills-modal');
const editSkillsBtn = document.getElementById('edit-skills');
const saveSkillsBtn = document.getElementById('save-skills');
const closeSkillsModalBtn = document.getElementById('close-skills-modal');
const skillOptions = document.querySelectorAll('.skill-option');

editSkillsBtn.addEventListener('click', () => {
    skillsModal.classList.remove('hidden');
    // Pre-select current skills
    skillOptions.forEach(opt => {
        if (userData?.skills?.includes(opt.dataset.skill)) {
            opt.classList.add('bg-primary', 'text-white', 'border-primary');
        } else {
            opt.classList.remove('bg-primary', 'text-white', 'border-primary');
        }
    });
});

skillOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        opt.classList.toggle('bg-primary');
        opt.classList.toggle('text-white');
        opt.classList.toggle('border-primary');
    });
});

saveSkillsBtn.addEventListener('click', async () => {
    const selectedSkills = Array.from(document.querySelectorAll('.skill-option.bg-primary')).map(opt => opt.dataset.skill);
    try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
            skills: selectedSkills,
            updatedAt: serverTimestamp()
        }, { merge: true });
        showToast('Skills updated!', 'success');
        skillsModal.classList.add('hidden');
    } catch (error) {
        console.error("Error saving skills:", error);
        showToast('Error updating skills', 'error');
    }
});

closeSkillsModalBtn.addEventListener('click', () => skillsModal.classList.add('hidden'));

// Availability Logic
function updateAvailabilityUI() {
    const slots = document.querySelectorAll('.day-slot');
    const availableDays = userData.availability || [true, true, true, true, true, false, false]; // Default M-F
    
    slots.forEach((slot, index) => {
        if (availableDays[index]) {
            slot.classList.replace('bg-gray-100', 'bg-secondary/20');
            slot.classList.replace('dark:bg-gray-700', 'dark:bg-secondary/30');
            slot.classList.add('border-secondary');
        } else {
            slot.classList.replace('bg-secondary/20', 'bg-gray-100');
            slot.classList.replace('dark:bg-secondary/30', 'dark:bg-gray-700');
            slot.classList.remove('border-secondary');
        }
    });
}

document.querySelectorAll('.day-slot').forEach(slot => {
    slot.addEventListener('click', async () => {
        const dayIndex = parseInt(slot.dataset.day);
        let availability = [...(userData?.availability || [true, true, true, true, true, false, false])];
        availability[dayIndex] = !availability[dayIndex];
        
        try {
            await setDoc(doc(db, 'users', auth.currentUser.uid), { 
                availability,
                updatedAt: serverTimestamp()
            }, { merge: true });
            showToast('Availability updated', 'success');
        } catch (e) {
            console.error("Error saving availability:", e);
            showToast('Failed to update availability', 'error');
        }
    });
});

// Opportunities Listener (General Feed)
function initOpportunitiesListener() {
    const q = query(
        collection(db, 'issues'),
        where('status', '==', 'pending'),
        limit(20) // Get more items for client-side matching
    );

    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('opportunities-list');
        list.innerHTML = '';
        
        const userSkills = userData?.skills || [];
        let matches = [];

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            // Client-side "AI" sorting algorithm
            let score = 0;
            if (userSkills.includes(data.category)) score += 50; // Exact category match
            if (data.urgency === 'emergency') score += 30;
            if (data.urgency === 'high') score += 15;
            
            matches.push({ id: docSnap.id, data, score });
        });

        // Sort by score (the "AI" part)
        matches.sort((a, b) => b.score - a.score);

        document.getElementById('opps-count').textContent = `${matches.length} Matches`;

        if (matches.length === 0) {
            list.innerHTML = '<div class="col-span-full py-8 text-center text-gray-400">No matching opportunities found. Try adding more skills!</div>';
            return;
        }

        matches.forEach(match => {
            const card = createOpportunityCard(match.id, match.data);
            list.appendChild(card);
        });
    });
}

function createOpportunityCard(id, data) {
    const div = document.createElement('div');
    const urgencyColors = {
        low: 'border-green-500 text-green-500',
        medium: 'border-yellow-500 text-yellow-500',
        high: 'border-orange-500 text-orange-500',
        emergency: 'border-red-500 text-red-500'
    };

    const locationText = data.address || `${data.location?.lat.toFixed(2)}, ${data.location?.lng.toFixed(2)}`;
    const timeSlot = data.timeSlot || 'Flexible Hours';

    div.className = `bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border-l-4 ${urgencyColors[data.urgency] || 'border-gray-300'} hover:scale-[1.02] transition-transform duration-200`;
    div.innerHTML = `
        <div class="flex justify-between items-start mb-2">
            <div>
                <span class="text-[10px] uppercase font-bold tracking-wider">${data.urgency} Priority</span>
                <h4 class="font-bold text-lg">${data.title}</h4>
            </div>
            <div class="flex flex-col items-end">
                <span class="text-[10px] text-gray-400">MATCHED SKILL</span>
                <span class="text-[10px] font-bold text-primary">${data.category.toUpperCase()}</span>
            </div>
        </div>
        <p class="text-sm text-gray-500 line-clamp-2 mb-4">${data.description}</p>
        <div class="grid grid-cols-2 gap-2 text-[10px] text-gray-400 mb-6">
            <div class="flex items-center gap-1">
                <i class="fa-solid fa-map-location-dot"></i>
                <span class="truncate">${locationText}</span>
            </div>
            <div class="flex items-center gap-1">
                <i class="fa-solid fa-clock"></i>
                <span class="truncate">${timeSlot}</span>
            </div>
        </div>
        <div class="flex gap-2">
            <button onclick="acceptOpportunity('${id}')" class="flex-1 bg-secondary hover:bg-green-600 text-white py-2 rounded-lg font-bold transition">Enlist</button>
            <button onclick="ignoreOpportunity('${id}')" class="px-4 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 py-2 rounded-lg transition"><i class="fa-solid fa-xmark"></i></button>
        </div>
    `;
    return div;
}

// Assignments Listener (Enrolled)
function initAssignmentsListener(userId) {
    const q = query(
        collection(db, 'issues'), 
        where('assignedVolunteer', '==', userId),
        where('status', 'in', ['assigned', 'accepted'])
    );

    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('assignments-list');
        list.innerHTML = '';
        document.getElementById('active-count').textContent = `${snapshot.size} Active`;

        if (snapshot.empty) {
            list.innerHTML = '<div class="col-span-full py-8 text-center text-gray-400">You haven\'t enrolled in any tasks yet.</div>';
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const card = createAssignmentCard(docSnap.id, data);
            list.appendChild(card);
        });
    });
}

function createAssignmentCard(id, data) {
    const div = document.createElement('div');
    const urgencyColors = {
        low: 'border-green-500',
        medium: 'border-yellow-500',
        high: 'border-orange-500',
        emergency: 'border-red-500'
    };

    div.className = `bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border-l-4 ${urgencyColors[data.urgency] || 'border-gray-300'}`;
    div.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div>
                <span class="text-[10px] uppercase font-bold tracking-wider text-gray-400">ENROLLED</span>
                <h4 class="font-bold text-lg">${data.title}</h4>
            </div>
        </div>
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
            <i class="fa-solid fa-location-dot"></i>
            <span>Track on Map</span>
        </div>
        <div class="flex gap-2">
            <button onclick="completeTask('${id}')" class="flex-1 bg-primary hover:bg-blue-600 text-white py-2 rounded-lg font-bold transition">Mark Finished</button>
            <button onclick="abandonTask('${id}')" class="px-4 border border-gray-200 dark:border-gray-600 py-2 rounded-lg transition text-danger"><i class="fa-solid fa-arrow-right-from-bracket"></i></button>
        </div>
    `;
    return div;
}

// Global actions for opportunities
window.acceptOpportunity = async (id) => {
    try {
        await updateDoc(doc(db, 'issues', id), {
            assignedVolunteer: auth.currentUser.uid,
            status: 'accepted',
            acceptedAt: serverTimestamp()
        });
        showToast('Enlisted successfully!', 'success');
    } catch (e) {
        showToast('Failed to enlist', 'error');
    }
};

window.ignoreOpportunity = (id) => {
    // Local UI only for now
    document.querySelector(`[onclick="acceptOpportunity('${id}')"]`).closest('div.bg-white').style.display = 'none';
};

window.completeTask = async (id) => {
    try {
        const taskSnap = await getDoc(doc(db, 'issues', id));
        if (!taskSnap.exists()) return;
        const taskData = taskSnap.data();
        
        // Calculate points based on urgency
        const points = taskData.urgency === 'emergency' ? 100 : (taskData.urgency === 'high' ? 75 : 50);

        await updateDoc(doc(db, 'issues', id), {
            status: 'completed',
            completedAt: serverTimestamp()
        });

        // Increment user stats
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            completedTasks: increment(1),
            totalPoints: increment(points)
        });

        showToast(`Mission accomplished! +${points} Points`, 'success');
    } catch (e) {
        console.error(e);
        showToast('Action failed', 'error');
    }
};

window.abandonTask = async (id) => {
    if (!confirm('Are you sure you want to abandon this task?')) return;
    try {
        await updateDoc(doc(db, 'issues', id), {
            assignedVolunteer: null,
            status: 'pending'
        });
        showToast('Task abandoned', 'warning');
    } catch (e) {
        showToast('Action failed', 'error');
    }
};

function updateProgressionUI() {
    if (!userData) return;
    const points = userData.totalPoints || 0;
    
    // Level logic
    let level = 1;
    let nextRank = "Advanced Volunteer";
    let targetPoints = 200;
    let currentLevelPoints = 0;

    if (points >= 1000) {
        level = 3;
        nextRank = "Master Volunteer";
        targetPoints = 2500;
        currentLevelPoints = points - 1000;
    } else if (points >= 200) {
        level = 2;
        nextRank = "Expert Volunteer";
        targetPoints = 1000;
        currentLevelPoints = points - 200;
    } else {
        currentLevelPoints = points;
    }

    const progressPercent = Math.min((currentLevelPoints / targetPoints) * 100, 100);
    
    document.getElementById('level-badge').textContent = `Level ${level}`;
    document.getElementById('next-rank').textContent = nextRank;
    document.getElementById('progression-bar').style.width = `${progressPercent}%`;
    document.getElementById('current-points-display').textContent = `${points} PTS`;
    document.getElementById('target-points-display').textContent = `${targetPoints} PTS`;
}

// Initialize
initProfile();
