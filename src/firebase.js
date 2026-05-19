import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC-L1L8PeNHBcb61wIYxWZq54DdrzYcjpA",
  authDomain: "virtulearn-portal.firebaseapp.com",
  projectId: "virtulearn-portal",
  storageBucket: "virtulearn-portal.firebasestorage.app",
  messagingSenderId: "713990799041",
  appId: "1:713990799041:web:f6ec2a619ce4a103b81e40"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use even more robust settings for Firestore connection stability
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  // This helps in unstable network environments
  experimentalAutoDetectLongPolling: true
});

export const storage = getStorage(app);
export default app;