import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  signInWithPopup,
  GoogleAuthProvider,
  signOut, 
  onAuthStateChanged,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  const googleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      try {
        const fetchPromise = getDoc(doc(db, 'users', user.uid));
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database connection timed out")), 8000)
        );

        const userDoc = await Promise.race([fetchPromise, timeoutPromise]);

        if (!userDoc.exists()) {
          return { isNewUser: true, user };
        }

        const userData = userDoc.data();
        if (userData.status === 'pending' && user.email !== 'ismadl@edu') {
          await signOut(auth);
          throw new Error("Your account is pending admin approval.");
        }

        return { isNewUser: false, role: userData.role };
      } catch (dbError) {
        console.warn("AuthContext: Firestore check failed, but Auth succeeded.", dbError);
        if (user.email === 'ismadl@edu') {
          return { isNewUser: false, role: 'admin' };
        }
        throw new Error("Could not verify account status. Please check your internet connection.");
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      if (error.code === 'auth/network-request-failed') {
        throw new Error("Network error. Please check your internet connection.");
      }
      throw error;
    }
  };

  const completeRegistration = async (uid, name, email, role) => {
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
