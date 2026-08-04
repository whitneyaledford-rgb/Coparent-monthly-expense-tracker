npm install firebase
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAh4zS1ablShmQfk5p8TqzRs0BY2bsX8pU",
  authDomain: "coparent-expense-tracker.firebaseapp.com",
  projectId: "coparent-expense-tracker",
  storageBucket: "coparent-expense-tracker.firebasestorage.app",
  messagingSenderId: "536193938961",
  appId: "1:536193938961:web:a87f25fa93717a290c23b0",
  measurementId: "G-X96G02RQ7N"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};
