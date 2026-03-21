import { auth, db, showToast } from './app.js';
import { 
    collection, 
    query, 
    onSnapshot, 
    where, 
    doc, 
    updateDoc, 
    getDocs, 
    getDoc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// State
let issues = [];
let volunteers = [];
let charts = { pie: null, bar: null, line: null };
let map, markers = [];

// Initialize Map
function initMap() {
    map = L.map('v-map').setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
}

// Data Listeners
function initListeners() {
    // Issues Listener
    onSnapshot(collection(db, 'issues'), (snapshot) => {
        issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateIssuesFeed();
        updateStats();
        updateCharts();
    });

    // Volunteers Listener
    onSnapshot(query(collection(db, 'users'), where('role', '==', 'volunteer')), (snapshot) => {
        volunteers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateMapMarkers();
        updateStats();
        updateCharts();
    });
}

// UI Updates
function updateIssuesFeed() {
    const feed = document.getElementById('issues-feed');
    const pending = issues.filter(i => i.status === 'pending');
    document.getElementById('pending-count').textContent = pending.length;

    feed.innerHTML = '';
    if (pending.length === 0) {
        feed.innerHTML = '<div class="py-12 text-center text-gray-400">No pending issues!</div>';
        return;
    }

    pending.sort((a, b) => {
        const priority = { emergency: 4, high: 3, medium: 2, low: 1 };
        return priority[b.urgency] - priority[a.urgency];
    }).forEach(issue => {
        const card = document.createElement('div');
        const urgencyColors = {
            low: 'bg-green-100 text-green-700',
            medium: 'bg-yellow-100 text-yellow-700',
            high: 'bg-orange-100 text-orange-700',
            emergency: 'bg-red-100 text-red-700 animate-pulse'
        };

        card.className = 'bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition cursor-pointer';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${urgencyColors[issue.urgency]}">${issue.urgency}</span>
                <span class="text-[10px] text-gray-400 font-bold">${issue.peopleAffected} Affected</span>
            </div>
            <h4 class="font-bold text-sm mb-1">${issue.title}</h4>
            <p class="text-xs text-gray-500 line-clamp-2 mb-3">${issue.description}</p>
            <button onclick="openSmartMatch('${issue.id}')" class="w-full bg-primary/10 text-primary py-2 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition">Assign Volunteer</button>
        `;
        feed.appendChild(card);
    });
}

function updateMapMarkers() {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    volunteers.forEach(v => {
        if (!v.location) return; // Skip if no location

        const isBusy = issues.some(i => i.assignedVolunteer === v.id && i.status !== 'completed');
        const color = isBusy ? '#ef4444' : '#10b981';
        const size = 10 + (v.skills?.length || 0) * 2;

        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.2);"></div>`,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });

        const marker = L.marker([v.location.lat, v.location.lng], { icon }).addTo(map);
        marker.bindPopup(`
            <div class="text-center p-2">
                <div class="font-bold">${v.displayName || 'Volunteer'}</div>
                <div class="text-xs text-gray-500">${v.skills?.join(', ') || 'No skills listed'}</div>
                <div class="mt-2 ${isBusy ? 'text-danger' : 'text-secondary'} font-bold text-[10px] uppercase">${isBusy ? 'Busy' : 'Available'}</div>
            </div>
        `);
        markers.push(marker);
    });
}

function updateStats() {
    document.getElementById('stat-total').textContent = issues.length;
    document.getElementById('stat-assigned').textContent = issues.filter(i => i.status === 'assigned' || i.status === 'accepted').length;
    document.getElementById('stat-resolved').textContent = issues.filter(i => i.status === 'completed').length;
    document.getElementById('stat-volunteers').textContent = volunteers.length;
}

// Charts
function initCharts() {
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    charts.pie = new Chart(ctxPie, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'] }] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
    });

    const ctxBar = document.getElementById('barChart').getContext('2d');
    charts.bar = new Chart(ctxBar, {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Volunteers', data: [], backgroundColor: '#3b82f6' }] },
        options: { scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
    });

    const ctxLine = document.getElementById('lineChart').getContext('2d');
    charts.line = new Chart(ctxLine, {
        type: 'line',
        data: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], datasets: [{ label: 'Resolved', data: [5, 8, 12, 7, 15, 10, 20], borderColor: '#10b981', tension: 0.4, fill: true, backgroundColor: 'rgba(16, 185, 129, 0.1)' }] },
        options: { scales: { y: { display: false }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } }
    });
}

function updateCharts() {
    if (!charts.pie || !charts.bar) return;

    // Update Pie
    const categories = {};
    issues.forEach(i => categories[i.category] = (categories[i.category] || 0) + 1);
    charts.pie.data.labels = Object.keys(categories);
    charts.pie.data.datasets[0].data = Object.values(categories);
    charts.pie.update();

    // Update Bar
    const skills = {};
    volunteers.forEach(v => v.skills?.forEach(s => skills[s] = (skills[s] || 0) + 1));
    charts.bar.data.labels = Object.keys(skills);
    charts.bar.data.datasets[0].data = Object.values(skills);
    charts.bar.update();
}

// Smart Matching Logic
window.openSmartMatch = async (issueId) => {
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    document.getElementById('match-issue-title').textContent = `Issue: ${issue.title}`;
    document.getElementById('match-modal').classList.remove('hidden');

    const matches = volunteers.map(v => {
        let score = 0;
        
        // 1. Distance (40%)
        if (v.location && issue.location) {
            const dist = getDistance(v.location, issue.location);
            const distScore = Math.max(0, 40 - (dist * 2)); // 1km = -2 points
            score += distScore;
        }

        // 2. Skills (40%)
        const skillMatch = v.skills?.includes(issue.category.charAt(0).toUpperCase() + issue.category.slice(1));
        if (skillMatch) score += 40;

        // 3. Availability (20%)
        const isBusy = issues.some(i => i.assignedVolunteer === v.id && i.status !== 'completed');
        if (!isBusy) score += 20;

        return { ...v, score: Math.round(score) };
    }).sort((a, b) => b.score - a.score).slice(0, 3);

    const container = document.getElementById('matches-container');
    container.innerHTML = '';
    
    matches.forEach(m => {
        const div = document.createElement('div');
        div.className = 'bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl border-2 border-transparent hover:border-primary transition cursor-pointer text-center';
        div.innerHTML = `
            <div class="relative inline-block mb-3">
                <div class="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">${m.displayName?.[0] || 'V'}</div>
                <div class="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">${m.score}% Match</div>
            </div>
            <h5 class="font-bold text-sm mb-1">${m.displayName || 'Volunteer'}</h5>
            <p class="text-[10px] text-gray-500 mb-4">${m.skills?.slice(0, 2).join(', ') || 'No skills'}</p>
            <button onclick="assignVolunteer('${issueId}', '${m.id}')" class="w-full bg-primary text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition">Select</button>
        `;
        container.appendChild(div);
    });

    // Auto-assign button setup
    document.getElementById('auto-assign').onclick = () => {
        if (matches[0]) assignVolunteer(issueId, matches[0].id);
    };
};

function getDistance(loc1, loc2) {
    const R = 6371; // km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

window.assignVolunteer = async (issueId, volunteerId) => {
    try {
        await updateDoc(doc(db, 'issues', issueId), {
            assignedVolunteer: volunteerId,
            status: 'assigned',
            assignedAt: serverTimestamp()
        });
        showToast('Volunteer assigned successfully!', 'success');
        document.getElementById('match-modal').classList.add('hidden');
    } catch (error) {
        showToast('Assignment failed', 'error');
    }
};

document.getElementById('close-match').onclick = () => {
    document.getElementById('match-modal').classList.add('hidden');
};

// Initialize
initMap();
initListeners();
initCharts();
