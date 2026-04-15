import { initializeApp, getApps, cert, type ServiceAccount, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let _app: App | null = null;

function formatPrivateKey(key: string | undefined): string {
  if (!key) return "";
  // Remove surrounding quotes if present
  let k = key.replace(/^["']|["']$/g, "");
  // Replace literal \n with real newlines
  k = k.replace(/\\n/g, "\n");
  return k;
}

function getApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  };

  _app = initializeApp({ credential: cert(serviceAccount) });
  return _app;
}

export function getAdminAuth(): Auth {
  return getAuth(getApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getApp());
}
