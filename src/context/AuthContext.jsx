import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { doc, setDoc, getDoc, enableNetwork } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const completeRegistration = useCallback(async (uid, name, email, role) => {
    console.log("AuthContext: Starting completeRegistration for", email);
    try {
      const docRef = doc(db, 'users', uid);
      const data = {
        uid,
        name,
        email,
        role,
        status: 'Waiting for Admin Approval',
        createdAt: new Date().toISOString()
      };

      console.log("AuthContext: Writing to Firestore...");
      const setDocPromise = setDoc(docRef, data);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Firestore write timeout. Please check your Firebase Database Rules and API Key restrictions in Google Cloud Console.")), 10000)
      );

      await Promise.race([setDocPromise, timeoutPromise]);
      console.log("AuthContext: Firestore write successful");

      // Force sign out because they are now pending
      await signOut(auth);
      console.log("AuthContext: User signed out after registration");
      return true;
    } catch (error) {
      console.error("AuthContext: Error in completeRegistration:", error);
      throw error;
    }
  }, []);

  // Helper function to handle the user data fetching logic (reusable for popup and redirect)
  const handleUserResult = useCallback(async (user) => {
    try {
      await enableNetwork(db).catch(() => {});

      let userDoc = null;
      let retries = 0;
      const maxRetries = 2;

      while (retries <= maxRetries) {
        try {
          const fetchPromise = getDoc(doc(db, 'users', user.uid));
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Database timeout")), 12000)
          );

          userDoc = await Promise.race([fetchPromise, timeoutPromise]);
          break;
        } catch (retryErr) {
          retries++;
          if (retries > maxRetries) throw retryErr;
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      if (!userDoc || !userDoc.exists()) {
        // Check for pending registration from redirect
        const pending = localStorage.getItem('pendingRegistration');
        if (pending) {
          const { name, role } = JSON.parse(pending);
          localStorage.removeItem('pendingRegistration');
          await completeRegistration(user.uid, name, user.email, role);
          return { isNewUser: true, user, registrationCompleted: true };
        }
        return { isNewUser: true, user };
      }

      const userData = userDoc.data();
      if (userData.status === 'pending' || userData.status === 'Waiting for Admin Approval' && user.email !== 'ismadl@edu.com') {
        await signOut(auth);
        throw new Error("Your account is pending admin approval.");
      }

      return { isNewUser: false, role: userData.role };
    } catch (dbError) {
      console.warn("AuthContext: Firestore check failed.", dbError);
      if (user.email === 'ismadl@edu.com') {
        return { isNewUser: false, role: 'admin' };
      }
      throw new Error(dbError.message || "Connection unstable. Please check your internet and try again.");
    }
  }, [completeRegistration]);

  useEffect(() => {
    console.log("AuthContext: Initializing...");
    // Explicitly enable network on load to prevent "offline" states
    enableNetwork(db).catch(err => console.error("Firestore: Could not enable network", err));

    // Handle Redirect Result
    getRedirectResult(auth).then(async (result) => {
      if (result) {
        try {
          await handleUserResult(result.user);
          // The onAuthStateChanged will handle the state update
        } catch (error) {
          console.error("Redirect Result Error:", error);
        }
      }
    }).catch(err => console.error("Redirect Error:", err));

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("AuthContext: onAuthStateChanged", currentUser ? currentUser.email : "null");
      if (currentUser) {
        // Special case for the primary admin email
        if (currentUser.email === 'ismadl@edu.com') {
          setUser({
            id: currentUser.uid,
            name: 'Administrator',
            email: currentUser.email,
            role: 'admin',
            status: 'approved'
          });
          setLoading(false);
          return;
        }

        try {
          console.log("AuthContext: Fetching user data for", currentUser.uid);
          // Add a timeout to the Firestore fetch to prevent "offline" hanging
          const fetchPromise = getDoc(doc(db, 'users', currentUser.uid));
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout. If this persists on Vercel, check your Firebase API key restrictions.")), 10000)
          );

          const userDoc = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("AuthContext: User data found", userData.role);
            setUser({
              id: currentUser.uid,
              name: userData.name || currentUser.displayName,
              email: currentUser.email,
              role: userData.role || 'student',
              status: userData.status || 'Waiting for Admin Approval',
              assignedTeacherId: userData.assignedTeacherId || null
            });
          } else {
            console.log("AuthContext: No user document exists");
            setUser({
              id: currentUser.uid,
              name: currentUser.displayName,
              email: currentUser.email,
              role: null,
              status: 'Waiting for Admin Approval'
            });
          }
        } catch (error) {
          console.error("AuthContext: Error fetching user data:", error);
          // Fallback user object if Firestore fails so the app doesn't stay blank/blocked
          setUser({
            id: currentUser.uid,
            name: currentUser.displayName,
            email: currentUser.email,
            role: 'student', // Default role
            status: 'Waiting for Admin Approval' // Force pending if we can't verify
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [handleUserResult]);

  const googleSignIn = async (method = 'popup') => {
    const provider = new GoogleAuthProvider();
    // Force select account to prevent silent failures
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      if (method === 'redirect') {
        await signInWithRedirect(auth, provider);
        return; // Execution stops here as page redirects
      }

      const result = await signInWithPopup(auth, provider);
      return await handleUserResult(result.user);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      if (error.code === 'auth/popup-blocked') {
        throw new Error("Sign-in popup was blocked by your browser. Please allow popups for this site or use the redirect option.");
      }
      if (error.code === 'auth/network-request-failed') {
        throw new Error("Network error. Please check your internet connection.");
      }
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error("Sign-in window was closed. Please try again.");
      }
      throw new Error(error.message || "Failed to sign in with Google.");
    }
  };

  const register = async (name, email, password, role) => {
    console.log("AuthContext: register start", email);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("AuthContext: Firebase Auth user created", userCredential.user.uid);
      await completeRegistration(userCredential.user.uid, name, email, role);
      return true;
    } catch (error) {
      console.error("AuthContext: Registration Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error("This email is already registered. Please log in instead.");
      }
      if (error.code === 'auth/invalid-email') {
        throw new Error("Please enter a valid email address.");
      }
      if (error.code === 'auth/weak-password') {
        throw new Error("Password should be at least 6 characters.");
      }
      const message = error?.message || (typeof error === 'string' ? error : 'Failed to create account.');
      throw new Error(message);
    }
  };

  const login = async (email, password) => {
    console.log("AuthContext: login start", email);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("AuthContext: Firebase Auth sign in success", userCredential.user.uid);

      console.log("AuthContext: Fetching user doc...");
      const fetchPromise = getDoc(doc(db, 'users', userCredential.user.uid));
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timeout. Ensure your Firebase project is set up and your Vercel domain is authorized in Google Cloud Console.")), 12000)
      );

      const userDoc = await Promise.race([fetchPromise, timeoutPromise]);

      if (!userDoc.exists()) {
        console.log("AuthContext: User document not found after login");
        await signOut(auth);
        throw new Error("Account not found. Please sign up first.");
      }

      const userData = userDoc.data();
      console.log("AuthContext: User document loaded", userData.status);
      if (userData.status === 'pending' || userData.status === 'Waiting for Admin Approval') {
        await signOut(auth);
        throw new Error("Your account is pending admin approval.");
      }

      return { role: userData.role, name: userData.name };
    } catch (error) {
      console.error("AuthContext: Login Error:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error("Invalid email or password.");
      }
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        throw new Error("Invalid email or password.");
      }
      throw new Error(error.message || "Failed to sign in.");
    }
  };

  const adminLogin = async (username, password) => {
    console.log("AuthContext: adminLogin start", username);
    try {
      // 1. Primary Admin Hardcoded Check
      if (username === 'ismadl@edu.com' && password === '9846765535') {
        console.log("AuthContext: Primary Admin credentials matched");

        // Try to sign in with Firebase Auth to get a valid token
        try {
          const userCredential = await signInWithEmailAndPassword(auth, username, password);
          console.log("AuthContext: Primary Admin Firebase Auth Success");

          // Ensure admin record exists in Firestore
          const adminDoc = doc(db, 'users', userCredential.user.uid);
          await setDoc(adminDoc, {
            uid: userCredential.user.uid,
            name: 'Administrator',
            email: username,
            role: 'admin',
            status: 'approved',
            updatedAt: new Date().toISOString()
          }, { merge: true });

          return true;
        } catch (authErr) {
          console.warn("AuthContext: Primary Admin Firebase Auth failed, using local bypass", authErr);
          // Fallback to local state if Firebase Auth fails for this specific user
          setUser({
            id: 'admin_primary',
            name: 'Administrator',
            email: 'ismadl@edu.com',
            role: 'admin',
            status: 'approved'
          });
          return true;
        }
      }

      // 2. Regular Admin Login via Firebase
      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      console.log("AuthContext: Admin Firebase Auth success", userCredential.user.uid);

      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

      if (userDoc.exists() && userDoc.data().role === 'admin') {
        console.log("AuthContext: Admin role verified in Firestore");
        setUser({
          id: userCredential.user.uid,
          name: userDoc.data().name || 'Administrator',
          email: userCredential.user.email,
          role: 'admin',
          status: 'approved'
        });
        return true;
      } else {
        console.log("AuthContext: Login failed - not an admin");
        await signOut(auth);
        throw new Error("You do not have administrator privileges.");
      }
    } catch (error) {
      console.error("AuthContext: Admin Login Error:", error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        throw new Error("Invalid administrator credentials");
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, register, login, googleSignIn, completeRegistration, adminLogin, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
