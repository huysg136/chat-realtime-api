import admin from "firebase-admin";
import { createRequire } from "module";
import "./env.js";

const require = createRequire(import.meta.url);

let serviceAccount;
let firebaseConfigError = null;

const parseServiceAccount = (rawValue) => {
  let value = rawValue.trim();

  if (value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1);
  }

  const parsed = JSON.parse(value);
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error("Firebase service account is missing required fields");
  }

  parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  return parsed;
};

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (!process.env.VERCEL) {
    serviceAccount = require("../../serviceAccountKey.json");
  } else {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
  }
} catch (error) {
  firebaseConfigError = error;
  console.error(`[firebase] ${error.message}`);
}

if (!admin.apps.length) {
  const options = {
    projectId: serviceAccount?.project_id,
    databaseURL:
      "https://chat-realtime-54e66-default-rtdb.asia-southeast1.firebasedatabase.app",
  };

  if (serviceAccount) {
    options.credential = admin.credential.cert(serviceAccount);
  }

  admin.initializeApp(options);
}

const db = admin.firestore();
const firebaseReady = firebaseConfigError === null;

export { admin, db, firebaseConfigError, firebaseReady };
