import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

let app = null;
let db = null;

function readConfig() {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
}

export function isFirebaseConfigured() {
  const { projectId, apiKey } = readConfig();
  return Boolean(
    projectId &&
      apiKey &&
      projectId !== "undefined" &&
      apiKey !== "undefined"
  );
}

export function getFirestoreDb() {
  if (!isFirebaseConfigured()) return null;
  if (db) return db;

  try {
    app = initializeApp(readConfig());
    db = getFirestore(app);
    return db;
  } catch (error) {
    console.warn("Firebase initialization failed:", error);
    return null;
  }
}
