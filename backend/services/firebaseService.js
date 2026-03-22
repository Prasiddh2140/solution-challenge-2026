const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc, getDocs, collection, serverTimestamp, query, where } = require("firebase/firestore/lite");

const firebaseConfig = {
    apiKey: "AIzaSyC4XARTPa-gJ81pwMqXEU_jsfypjuhsexA",
    authDomain: "drought-assistant.firebaseapp.com",
    projectId: "drought-assistant",
    storageBucket: "drought-assistant.firebasestorage.app",
    messagingSenderId: "1086527978901",
    appId: "1:1086527978901:web:db52abaa901d14d4710a9c",
    measurementId: "G-NMEMRN1M8Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function storeAssessment(stateName, aiResult) {
  try {
    const docRef = doc(db, "droughtAssessments", stateName.toLowerCase());
    await setDoc(docRef, {
      ...aiResult,
      updatedAt: serverTimestamp()
    });
    console.log(`Stored assessment for state: ${stateName} in Firebase Firestore`);
  } catch (error) {
    console.error("Error storing assessment:", error);
  }
}

async function getAssessmentByState(stateName) {
  try {
    const docRef = doc(db, "droughtAssessments", stateName.toLowerCase());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (error) {
    console.error("Firebase fetch skipped (Firestore API not enabled):", error.message);
    return null;
  }
  return null;
}

async function getCollectionData(collectionName, filterField, filterValue) {
    try {
        let q = collection(db, collectionName);
        if (filterField) {
            q = query(q, where(filterField, "==", filterValue));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error(`Error fetching ${collectionName}:`, e);
        return [];
    }
}

module.exports = {
  db,
  storeAssessment,
  getAssessmentByState,
  getCollectionData
};
