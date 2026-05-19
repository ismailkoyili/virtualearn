import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, enableNetwork } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const completeRegistration = useCallback(async (uid, name, email, role) => {
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        name,
        email,
        role,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Force sign out because they are now pending
      await signOut(auth);
      return true;
    } catch (error) {
      console.error("Error completing registration:", error);
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
      if (userData.status === 'pending' && user.email !== 'ismadl@edu') {
        await signOut(auth);
        throw new Error("Your account is pending admin approval.");
      }

      return { isNewUser: false, role: userData.role };
    } catch (dbError) {
      console.warn("AuthContext: Firestore check failed.", dbError);
      if (user.email === 'ismadl@edu') {
        return { isNewUser: false, role: 'admin' };
      }
      throw new Error(dbError.message || "Connection unstable. Please check your internet and try again.");
    }
  }, [completeRegistration]);

  useEffect(() => {
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
          // Add a timeout to the Firestore fetch to prevent "offline" hanging
          const fetchPromise = getDoc(doc(db, 'users', currentUser.uid));
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Connection timeout")), 5000)
          );

          const userDoc = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: currentUser.uid,
              name: userData.name || currentUser.displayName,
              email: currentUser.email,
              role: userData.role || 'student',
              status: userData.status || 'pending'
            });
          } else {
            setUser({
              id: currentUser.uid,
              name: currentUser.displayName,
              email: currentUser.email,
              role: null,
              status: 'pending'
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
            status: 'pending' // Force pending if we can't verify
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
    <AuthContext.Provider value={{ user, googleSignIn, completeRegistration, adminLogin, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
