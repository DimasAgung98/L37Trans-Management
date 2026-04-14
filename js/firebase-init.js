// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// TODO: Replace with your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyB2Rf0mvhAQJxbNcIflUrVtf4efwcFDot0",
  authDomain: "akbartentcar.firebaseapp.com",
  projectId: "akbartentcar",
  storageBucket: "akbartentcar.firebasestorage.app",
  messagingSenderId: "483717858816",
  appId: "1:483717858816:web:2e99e98751760704be3ae5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
