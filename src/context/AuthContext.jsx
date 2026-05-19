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
        // Special case for the primary admin email if they happen to use Google with that same email
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
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          
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
            // User exists in Auth but not in Firestore yet (first time sign-in)
            // We set the user object with 'pending' status but no role yet
            // The Signup/Login page will handle role selection for new users
            setUser({
              id: currentUser.uid,
              name: currentUser.displayName,
              email: currentUser.email,
              role: null,
              status: 'pending'
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
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
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // New user - they will need to select a role in the UI
        return { isNewUser: true, user };
      }

      const userData = userDoc.data();
      if (userData.status === 'pending' && user.email !== 'ismadl@edu') {
        await signOut(auth);
        throw new Error("Your account is pending admin approval.");
      }
      
      return { isNewUser: false, role: userData.role };
    } catch (error) {
      console.error("Google Sign-In Error:", error);
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
