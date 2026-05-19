import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for Firebase authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Fetch user role from Firestore
        let role = 'student';
        let status = 'approved';
        let name = currentUser.displayName || 'Student';

        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          
          if (userDoc.exists()) {
            role = userDoc.data().role || 'student';
            status = userDoc.data().status || 'approved';
            name = userDoc.data().name || name;
          }
        } catch (error) {
          console.error("Error fetching user data from Firestore:", error);
        }

        setUser({
          id: currentUser.uid,
          name: name,
          email: currentUser.email,
          role: role,
          status: status
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (name, email, password, role = 'student') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: name
      });

      // Save user to Firestore 'users' collection
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        name: name,
        email: userCredential.user.email,
        role: role,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Automatically sign out because account needs approval
      await signOut(auth);

      return { success: true, pending: true };
    } catch (error) {
      let message = "Failed to create an account.";
      if (error.code === 'auth/email-already-in-use') message = "This email is already registered.";
      if (error.code === 'auth/weak-password') message = "Password should be at least 6 characters.";
      if (error.code === 'auth/invalid-email') message = "Please enter a valid email address.";
      throw new Error(message);
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
      
      if (!userDoc.exists()) {
        throw new Error("User record not found.");
      }

      const userData = userDoc.data();

      if (userData.status === 'pending') {
        await signOut(auth);
        throw new Error("Your account is pending admin approval.");
      }
      
      setUser({
        id: userCredential.user.uid,
        name: userData.name || userCredential.user.displayName,
        email: userCredential.user.email,
        role: userData.role,
        status: userData.status
      });

      return userData.role;
    } catch (error) {
      let message = error.message;
      if (error.code === 'auth/user-not-found') message = "No account found with this email.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') message = "Incorrect password.";
      if (error.code === 'auth/too-many-requests') message = "Too many failed attempts. Try again later.";

      throw new Error(message);
    }
  };

  const adminLogin = async (username, password) => {
    try {
      // Direct credential check as requested by the user
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

      // Fallback to Firebase Auth for other potential admin accounts
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
    <AuthContext.Provider value={{ user, login, adminLogin, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
