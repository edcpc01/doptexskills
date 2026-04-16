import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;

function ensureInit() {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    _auth = getAuth(_app);
    _db = getFirestore(_app);
  }
}

// Only initialize on the client — avoids build-time SSG errors
if (typeof window !== "undefined") {
  ensureInit();
}

// Exports — these are real Firestore/Auth instances on the client.
// On the server, they are undefined, which is fine because no server code
// actually calls Firestore methods on these exports (all callers are "use client").
export const auth = _auth as Auth;
export const db = _db as Firestore;

export function getClientAuth(): Auth {
  ensureInit();
  return _auth!;
}

export function getClientDb(): Firestore {
  ensureInit();
  return _db!;
}
