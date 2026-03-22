import { auth, db, storage, showToast } from './app.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Initialize Map
let map;
let marker;
let currentCoords = { lat: 0, lng: 0 };
let editMode = false;
let editIssueId = null;

function initMap() {
    map = L.map('map').setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OSM contributors'
    }).addTo(map);

    marker = L.marker([20.5937, 78.9629], { draggable: true }).addTo(map);
    marker.on('dragend', (e) => updateCoords(e.target.getLatLng()));
    map.on('click', (e) => {
        marker.setLatLng(e.latlng);
        updateCoords(e.latlng);
    });
}

function updateCoords(latlng) {
    currentCoords = { lat: latlng.lat, lng: latlng.lng };
    document.getElementById('lat').textContent = latlng.lat.toFixed(4);
    document.getElementById('lng').textContent = latlng.lng.toFixed(4);
}

// Check for Edit Mode
import { getDoc, doc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

async function checkEditMode() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('edit');
    if (id) {
        editMode = true;
        editIssueId = id;
        document.querySelector('h1').textContent = 'Update Your Report';
        document.getElementById('submit-report').innerHTML = '<i class="fa-solid fa-save mr-2"></i> Save Changes';
        
        try {
            const issueDoc = await getDoc(doc(db, 'issues', id));
            if (issueDoc.exists()) {
                const data = issueDoc.data();
                
                // Get current user role
                const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
                const userRole = userDoc.data()?.role;

                // Security check / Admin Bypass
                if (data.reportedBy !== auth.currentUser.uid && userRole !== 'tester') {
                    showToast('Unauthorized access', 'danger');
                    setTimeout(() => window.location.href = '/ngo.html', 1500);
                    return;
                }

                document.getElementById('title').value = data.title;
                document.getElementById('description').value = data.description;
                document.getElementById('category').value = data.category;
                document.getElementById('urgency').value = data.urgency;
                document.getElementById('people-affected').value = data.peopleAffected;
                
                if (data.location) {
                    const latlng = L.latLng(data.location.lat, data.location.lng);
                    map.setView(latlng, 15);
                    marker.setLatLng(latlng);
                    updateCoords(latlng);
                }
                if (data.photoURL) {
                    document.getElementById('photo-preview').classList.remove('hidden');
                    document.getElementById('photo-preview').querySelector('img').src = data.photoURL;
                }
            }
        } catch (e) { showToast('Error loading report data', 'error'); }
    }
}

// Location Detection
document.getElementById('detect-location').onclick = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
            map.setView(latlng, 15);
            marker.setLatLng(latlng);
            updateCoords(latlng);
            showToast('Detected!', 'success');
        });
    }
};

// Form Submission
document.getElementById('report-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) return showToast('Login required', 'warning');

    const submitBtn = document.getElementById('submit-report');
    submitBtn.disabled = true;

    try {
        const title = document.getElementById('title').value;
        
        // --- AI De-duplication Check (Requested) ---
        if (!editMode) {
            const reportsSnap = await getDocs(query(collection(db, 'issues'), 
                where('status', 'in', ['pending', 'assigned', 'accepted'])));
            
            const isDuplicate = reportsSnap.docs.some(doc => {
                const data = doc.data();
                const titleMatch = data.title.toLowerCase().includes(title.toLowerCase()) || title.toLowerCase().includes(data.title.toLowerCase());
                const locationMatch = data.location && currentCoords.lat && 
                    Math.abs(data.location.lat - currentCoords.lat) < 0.005 && 
                    Math.abs(data.location.lng - currentCoords.lng) < 0.005;
                return titleMatch && locationMatch;
            });

            if (isDuplicate) {
                if (!confirm('A similar report already exists nearby. Do you want to submit anyway?')) {
                    submitBtn.disabled = false;
                    return;
                }
            }
        }

        const reportData = {
            title,
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            urgency: document.getElementById('urgency').value,
            peopleAffected: parseInt(document.getElementById('people-affected').value) || 1,
            location: { lat: currentCoords.lat, lng: currentCoords.lng },
            updatedAt: serverTimestamp(),
            reporterId: auth.currentUser.uid // Fixed field name
        };

        if (editMode) {
            await updateDoc(doc(db, 'issues', editIssueId), reportData);
            showToast('Report updated!', 'success');
            setTimeout(() => window.location.href = '/ngo.html', 1500);
        } else {
            await addDoc(collection(db, 'issues'), {
                ...reportData,
                reportedBy: auth.currentUser.uid,
                status: 'pending',
                createdAt: serverTimestamp()
            });
            document.getElementById('success-modal').classList.remove('hidden');
        }
    } catch (err) { showToast('Submission failed', 'error'); }
    finally { submitBtn.disabled = false; }
};

document.getElementById('close-modal').onclick = () => window.location.href = '/ngo.html';

// Init
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    checkEditMode();
});
