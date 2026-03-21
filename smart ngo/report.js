import { auth, db, storage, showToast } from './app.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// Initialize Map
let map;
let marker;
let currentCoords = { lat: 0, lng: 0 };

function initMap() {
    map = L.map('map').setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    marker = L.marker([51.505, -0.09], { draggable: true }).addTo(map);
    
    marker.on('dragend', function(e) {
        updateCoords(e.target.getLatLng());
    });

    map.on('click', function(e) {
        marker.setLatLng(e.latlng);
        updateCoords(e.latlng);
    });
}

function updateCoords(latlng) {
    currentCoords = { lat: latlng.lat, lng: latlng.lng };
    document.getElementById('lat').textContent = latlng.lat.toFixed(4);
    document.getElementById('lng').textContent = latlng.lng.toFixed(4);
}

// Location Detection
document.getElementById('detect-location').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            const latlng = L.latLng(latitude, longitude);
            map.setView(latlng, 15);
            marker.setLatLng(latlng);
            updateCoords(latlng);
            showToast('Location detected!', 'success');
        }, () => {
            showToast('Geolocation failed. Please select manually.', 'error');
        });
    } else {
        showToast('Geolocation not supported by your browser.', 'error');
    }
});

// Photo Handling
const photoInput = document.getElementById('photo');
const photoDrop = document.getElementById('photo-drop');
const photoPreview = document.getElementById('photo-preview');

photoDrop.addEventListener('click', () => photoInput.click());

photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
            photoPreview.querySelector('img').src = re.target.result;
            photoPreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

// Form Submission
document.getElementById('report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
        showToast('Please sign in to report an issue', 'error');
        window.location.href = '/auth.html';
        return;
    }

    const submitBtn = document.getElementById('submit-report');
    const spinner = document.getElementById('spinner');
    submitBtn.disabled = true;
    spinner.classList.remove('hidden');

    try {
        let photoURL = null;
        const file = photoInput.files[0];
        if (file) {
            const storageRef = ref(storage, `issues/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            photoURL = await getDownloadURL(snapshot.ref);
        }

        const reportData = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            category: document.getElementById('category').value,
            urgency: document.getElementById('urgency').value,
            peopleAffected: parseInt(document.getElementById('people-affected').value) || 1,
            location: {
                lat: currentCoords.lat,
                lng: currentCoords.lng
            },
            photoURL,
            reportedBy: auth.currentUser.uid,
            status: 'pending',
            createdAt: serverTimestamp(),
            assignedVolunteer: null
        };

        await addDoc(collection(db, 'issues'), reportData);
        
        // Show Success Modal
        const modal = document.getElementById('success-modal');
        modal.classList.remove('hidden');
        modal.querySelector('div').classList.remove('scale-90');
        modal.querySelector('div').classList.add('scale-100');

    } catch (error) {
        console.error(error);
        showToast('Error submitting report. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
    }
});

document.getElementById('close-modal').addEventListener('click', () => {
    window.location.href = '/';
});

// Init on load
document.addEventListener('DOMContentLoaded', initMap);
window.onload = () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const latlng = L.latLng(pos.coords.latitude, pos.coords.longitude);
            map.setView(latlng, 13);
            marker.setLatLng(latlng);
            updateCoords(latlng);
        });
    }
};
