import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// These values are from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyDeKU1JHgUcUXLvM3UcROVrH5HgsEm9S0I",
  authDomain: "evident-dynamo-58gvj.firebaseapp.com",
  projectId: "evident-dynamo-58gvj",
  storageBucket: "evident-dynamo-58gvj.firebasestorage.app",
  messagingSenderId: "589472089645",
  appId: "1:589472089645:web:10931402c5754faa001aa4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// CRITICAL: Using the specific databaseId from config
export const db = getFirestore(app, "ai-studio-ox-0e374956-96f2-416a-978c-4c93bf66ca4c");
