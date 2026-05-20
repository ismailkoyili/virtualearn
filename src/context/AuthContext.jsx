import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
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
        setTimeout(() => reject(new Error("Firestore write timeout")), 10000)
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

  useEffect(() => {
    console.log("AuthContext: Initializing...");
    // Explicitly enable network on load to prevent "offline" states
    enableNetwork(db).catch(err => console.error("Firestore: Could not enable network", err));

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("AuthContext: onAuthStateChanged", currentUser ? currentUser.email : "null");
      if (currentUser) {
        // Special case for the primary admin email
        if (currentUser.email === 'ismadl@edu') {
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
            setTimeout(() => reject(new Error("Connection timeout")), 8000)
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
              status: userData.status || 'Waiting for Admin Approval'
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
  }, []);

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
        setTimeout(() => reject(new Error("Database connection timeout")), 10000)
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
    try {
      if (username === 'ismadl@edu' && password === '9846765535') {
        setUser({
          id: 'admin_primary',
          name: 'Administrator',
          email: 'ismadl@edu',
          role: 'admin',
          status: 'approved'
        });
        return true;
      }

      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));

      if (userDoc.exists() && userDoc.data().role === 'admin') {
        setUser({
          id: userCredential.user.uid,
          name: userDoc.data().name || 'Administrator',
          email: userCredential.user.email,
          role: 'admin',
          status: 'approved'
        });
        return true;
      } else {
        await signOut(auth);
        throw new Error("You do not have administrator privileges.");
      }
    } catch (error) {
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
    <AuthContext.Provider value={{ user, register, login, adminLogin, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
