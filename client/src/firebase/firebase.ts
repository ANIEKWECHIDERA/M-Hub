// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBjmMfSaprbYCOhr3iirbZOtu0gaMkk74E",
  authDomain: "m-hub-cd7b4.firebaseapp.com",
  projectId: "m-hub-cd7b4",
  storageBucket: "m-hub-cd7b4.firebasestorage.app",
  messagingSenderId: "978491981732",
  appId: "1:978491981732:web:3e220c664d3b4b57198b31",
  measurementId: "G-7ZWQW4E2YD",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const analytics = getAnalytics(firebaseApp);
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};
