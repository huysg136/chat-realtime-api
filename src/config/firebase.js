import admin from "firebase-admin";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://chat-realtime-54e66-default-rtdb.asia-southeast1.firebasedatabase.app"
  });
}

const db = admin.firestore();

export { admin, db };
