import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDOcFyRMlIJxEcktcLePbygVaR5wfjjG8",
  authDomain: "swift-os.firebaseapp.com",
  projectId: "swift-os",
  storageBucket: "swift-os.firebasestorage.app",
  messagingSenderId: "1009566316282",
  appId: "1:1009566316282:web:1e1ed29dbd6102bc51fb43"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
