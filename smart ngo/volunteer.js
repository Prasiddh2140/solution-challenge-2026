import { auth, db, showToast } from './app.js';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    collection, 
    query, 
    where, 
    onSnapshot,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// State
let userData = null;
let activeAssignments = [];

// Profile & Skills Logic
async function initProfile() {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '/auth.html';
            return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            userData = userDoc.data();
            updateProfileUI();
            initAssignmentsListener(user.uid);
            initTimeline(user.uid);
        }
    });
}

function updateProfileUI() {
    document.getElementById('display-name').textContent = userData.displayName || auth.currentUser.email.split('@')[0];
    document.getElementById('user-name').textContent = userData.displayName || auth.currentUser.email.split('@')[0];
    
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
        if (userData.skills?.includes(opt.dataset.skill)) {
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
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            skills: selectedSkills
        });
        userData.skills = selectedSkills;
        updateProfileUI();
        skillsModal.classList.add('hidden');
        showToast('Skills updated!', 'success');
    } catch (error) {
        showToast('Error updating skills', 'error');
    }
});

closeSkillsModalBtn.addEventListener('click', () => skillsModal.classList.add('hidden'));

// Assignments Listener
function initAssignmentsListener(userId) {
    const q = query(
        collection(db, 'issues'), 
        where('assignedVolunteer', '==', userId),
        where('status', 'in', ['assigned', 'accepted'])
    );

    onSnapshot(q, (snapshot) => {
        const list = document.getElementById('assignments-list');
        list.innerHTML = '';
        
        const pendingCount = snapshot.docs.filter(doc => doc.data().status === 'assigned').length;
        document.getElementById('active-count').textContent = `${pendingCount} Pending`;

        if (snapshot.empty) {
            list.innerHTML = `
                <div class="col-span-full py-12 text-center text-gray-400">
                    <i class="fa-solid fa-magnifying-glass mb-4 text-4xl block"></i>
                    <p>No active assignments. Relax!</p>
                </div>
            `;
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
        low: 'border-green-500 text-green-500',
        medium: 'border-yellow-500 text-yellow-500',
        high: 'border-orange-500 text-orange-500',
        emergency: 'border-red-500 text-red-500'
    };

    div.className = `bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-md border-l-4 ${urgencyColors[data.urgency] || 'border-gray-300'}`;
    div.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div>
                <span class="text-[10px] uppercase font-bold tracking-wider">${data.urgency}</span>
                <h4 class="font-bold text-lg">${data.title}</h4>
            </div>
            <span class="text-xs text-gray-400">Incoming...</span>
        </div>
        <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
            <i class="fa-solid fa-location-dot"></i>
            <span>${data.location.lat.toFixed(3)}, ${data.location.lng.toFixed(3)}</span>
        </div>
        <div class="flex gap-2">
            ${data.status === 'assigned' ? `
                <button onclick="handleAssignment('${id}', 'accepted')" class="flex-1 bg-secondary hover:bg-green-600 text-white py-2 rounded-lg font-bold transition">Accept</button>
                <button onclick="handleAssignment('${id}', 'declined')" class="flex-1 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 py-2 rounded-lg transition">Decline</button>
            ` : `
                <button onclick="handleAssignment('${id}', 'completed')" class="flex-1 bg-primary hover:bg-blue-600 text-white py-2 rounded-lg font-bold transition">Mark Completed</button>
            `}
        </div>
    `;
    return div;
}

// Global handler for dynamic buttons
window.handleAssignment = async (id, status) => {
    try {
        const updateData = { status };
        if (status === 'declined') {
            updateData.assignedVolunteer = null;
            updateData.status = 'pending';
        }
        if (status === 'completed') {
            updateData.completedAt = serverTimestamp();
        }
        
        await updateDoc(doc(db, 'issues', id), updateData);
        showToast(`Assignment ${status}!`, 'success');
    } catch (error) {
        showToast('Action failed', 'error');
    }
};

// Timeline Logic
function initTimeline(userId) {
    const q = query(
        collection(db, 'issues'),
        where('assignedVolunteer', '==', userId),
        where('status', '==', 'completed'),
        orderBy('completedAt', 'desc')
    );

    onSnapshot(q, (snapshot) => {
        const timeline = document.getElementById('timeline');
        timeline.innerHTML = '';

        if (snapshot.empty) {
            timeline.innerHTML = '<div class="p-8 text-center text-gray-400">No completed tasks yet.</div>';
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const date = data.completedAt?.toDate().toLocaleDateString() || 'Just now';
            const item = document.createElement('div');
            item.className = 'p-4 flex gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition';
            item.innerHTML = `
                <div class="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start">
                        <h5 class="font-bold">${data.title}</h5>
                        <span class="text-xs text-gray-400">${date}</span>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${data.description}</p>
                    <div class="mt-2 flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-full bg-secondary/20 text-secondary text-[10px] font-bold">+50 Impact Points</span>
                    </div>
                </div>
            `;
            timeline.appendChild(item);
        });
    });
}

// Initialize
initProfile();
