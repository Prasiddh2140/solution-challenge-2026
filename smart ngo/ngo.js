import { auth, db, showToast } from './app.js';
import { 
    collection, 
    query, 
    onSnapshot, 
    where, 
    doc, 
    updateDoc, 
    deleteDoc,
    getDocs, 
    getDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// State
let allIssues = [];
let myIssues = [];
let ngos = [];
let map, markers = [];

// Initialize Map
function initMap() {
    map = L.map('v-map').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

// Data Listeners
function initListeners(userId) {
    // 1. Listen to ALL issues for NGO status mapping
    onSnapshot(collection(db, 'issues'), async (snapshot) => {
        allIssues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Fetch current user role for bypass
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userRole = userDoc.data()?.role;

        if (userRole === 'tester') {
            myIssues = allIssues; // Testers see everything
        } else {
            myIssues = allIssues.filter(i => i.reportedBy === userId);
        }

        updateIssuesFeed();
        updateStats();
        updateNGOListOnMap();
    });

    // 2. NGO Network Listener
    onSnapshot(query(collection(db, 'users'), where('role', '==', 'ngo')), (snapshot) => {
        ngos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateNGOListOnMap();
    });
}

function updateIssuesFeed() {
    const feed = document.getElementById('issues-feed');
    feed.innerHTML = '';
    
    if (myIssues.length === 0) {
        feed.innerHTML = `
            <div class="py-20 text-center">
                <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <i class="fa-solid fa-folder-open text-2xl"></i>
                </div>
                <p class="text-gray-500 font-medium">No reports found.</p>
                <a href="/report.html" class="text-primary text-sm font-bold hover:underline mt-2 inline-block">Report an Issue Now</a>
            </div>
        `;
        return;
    }

    myIssues.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).forEach(issue => {
        const card = document.createElement('div');
        const statusColors = {
            pending: 'bg-gray-100 text-gray-600',
            assigned: 'bg-accent/10 text-accent',
            accepted: 'bg-blue-100 text-blue-600',
            completed: 'bg-secondary/10 text-secondary',
            rejected: 'bg-danger/10 text-danger'
        };

        card.className = 'bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[issue.status] || 'bg-gray-100'}">${issue.status}</span>
                <div class="flex gap-2">
                    <button onclick="editIssue('${issue.id}')" class="text-gray-400 hover:text-primary transition" title="Edit"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="deleteIssue('${issue.id}')" class="text-gray-400 hover:text-danger transition" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
            <h4 class="font-bold text-sm mb-1">${issue.title}</h4>
            <p class="text-xs text-gray-500 line-clamp-2 mb-3">${issue.description}</p>
            <div class="flex items-center justify-between text-[10px] text-gray-400 font-bold">
                <span><i class="fa-solid fa-clock mr-1"></i>${issue.createdAt ? new Date(issue.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</span>
                <span><i class="fa-solid fa-location-dot mr-1"></i>${issue.location ? 'Mapped' : 'No Location'}</span>
            </div>
        `;
        feed.appendChild(card);
    });

    document.getElementById('pending-count').textContent = myIssues.length;
}

function updateNGOListOnMap() {
    if (!map) return;
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    ngos.forEach(ngo => {
        if (!ngo.location || !ngo.location.lat) return;

        const isBusy = allIssues.some(i => i.assignedNGO === ngo.id && (i.status === 'assigned' || i.status === 'accepted'));
        const color = isBusy ? '#ef4444' : '#10b981';

        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const marker = L.marker([ngo.location.lat, ngo.location.lng], { icon }).addTo(map);
        marker.bindPopup(`
            <div class="text-center p-2 min-w-[150px]">
                <div class="font-bold text-primary mb-1">${ngo.displayName || 'NGO Partner'}</div>
                <div class="${isBusy ? 'text-danger' : 'text-secondary'} font-bold text-[9px] uppercase tracking-wider">
                    ${isBusy ? 'Busy - On Mission' : 'Free - Standing By'}
                </div>
            </div>
        `);
        markers.push(marker);
        
        // Auto-center map to user's first issue location if available
        if (myIssues.length > 0 && myIssues[0].location) {
            map.setView([myIssues[0].location.lat, myIssues[0].location.lng], 12);
        }
    });
}

function updateStats() {
    const total = myIssues.length;
    const assigned = myIssues.filter(i => i.status === 'assigned' || i.status === 'accepted').length;
    const resolved = myIssues.filter(i => i.status === 'completed').length;
    const remaining = total - resolved;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-assigned').textContent = assigned;
    document.getElementById('stat-resolved').textContent = resolved;
    document.getElementById('stat-remaining').textContent = remaining;
}

// Action Handlers
window.editIssue = (id) => {
    window.location.href = `/report.html?edit=${id}`;
};

window.deleteIssue = async (id) => {
    if (confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
        try {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            const userRole = userDoc.data()?.role;
            const issueDoc = await getDoc(doc(db, 'issues', id));
            
            if (issueDoc.data().reportedBy === auth.currentUser.uid || userRole === 'tester') {
                await deleteDoc(doc(db, 'issues', id));
                showToast('Report removed', 'success');
            } else {
                showToast('Unauthorized!', 'error');
            }
        } catch (e) {
            showToast('Delete failed', 'error');
        }
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        initMap();
        initListeners(user.uid);
    } else {
        window.location.href = '/auth.html';
    }
});
