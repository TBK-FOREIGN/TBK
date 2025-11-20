if (typeof firebase === 'undefined') {
  console.error('Firebase SDK not loaded yet. Make sure firebase-app-compat.js is included before app.js.');
}

const firebaseConfigCompat = {
  apiKey: "AIzaSyC-w9DzGC_1UTo0aZmj9dMUgfUe4KeMshM",
  authDomain: "tbk--foreign-call.firebaseapp.com",
  projectId: "tbk--foreign-call",
  storageBucket: "tbk--foreign-call.firebasestorage.app",
  messagingSenderId: "140622214272",
  appId: "1:140622214272:web:dc9fa03ab06f8161c9e265"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfigCompat);
}

const db = firebase.firestore();
const storage = firebase.storage();
