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
        // Fetch user role from Firestore or fallback to photoURL (where we stash it)
        let role = currentUser.photoURL || 'student';
        let status = 'approved';
        try {
          const fetchPromise = getDoc(doc(db, 'users', currentUser.uid));
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
          const userDoc = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (userDoc.exists()) {
            role = userDoc.data().role || 'student';
            status = userDoc.data().status || 'approved';
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }

        // Map Firebase user object to our expected format
        setUser({
          id: currentUser.uid,
          name: currentUser.displayName || 'Student',
          email: currentUser.email,
          role: role,
          status: status
        });
      } else {
        // Check for local admin session
        if (localStorage.getItem('admin_session') === 'true') {
          setUser({ id: 'admin', role: 'admin', name: 'Administrator' });
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (name, email, password, role = 'student') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's profile with their name and store the role in photoURL as a fallback
      await updateProfile(userCredential.user, {
        displayName: name,
        photoURL: role
      });

      // Save to localStorage as a fallback for mock data persistence
      try {
        const localUsers = JSON.parse(localStorage.getItem('virtulearn_users') || '[]');
        const existingIndex = localUsers.findIndex(u => u.uid === userCredential.user.uid);
        const newUser = {
          uid: userCredential.user.uid,
          name: name,
          email: userCredential.user.email,
          role: role,
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        if (existingIndex >= 0) {
          localUsers[existingIndex] = newUser;
        } else {
          localUsers.push(newUser);
        }
        localStorage.setItem('virtulearn_users', JSON.stringify(localUsers));
      } catch (localErr) {
        console.warn("Could not save to localStorage:", localErr);
      }
      
      // Save user to Firestore 'users' collection
      try {
        const setPromise = setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          name: name,
          email: userCredential.user.email,
          role: role,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
        await Promise.race([setPromise, timeoutPromise]);
      } catch (firestoreError) {
        console.warn("Error saving user to Firestore (possibly offline or timeout):", firestoreError);
      }

      // Automatically sign out because account needs approval
      await signOut(auth);

      return { success: true, pending: true };
    } catch (error) {
      // Map Firebase errors to user-friendly messages
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
      
      // Fallback to the role stashed in photoURL if Firestore fails
      let actualRole = userCredential.user.photoURL || 'student';
      let userName = userCredential.user.displayName || 'User';
      let status = 'approved';
      
      // Check local storage first for quick status check
      try {
        const localUsers = JSON.parse(localStorage.getItem('virtulearn_users') || '[]');
        const localUser = localUsers.find(u => u.uid === userCredential.user.uid);
        if (localUser && localUser.status) {
          status = localUser.status;
        }
      } catch (e) {}

      try {
        const fetchPromise = getDoc(doc(db, 'users', userCredential.user.uid));
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000));
        const userDoc = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (userDoc.exists()) {
          actualRole = userDoc.data().role || actualRole;
          userName = userDoc.data().name || userName;
          status = userDoc.data().status || status;
        }
      } catch (firestoreError) {
        console.warn("Could not fetch user document (possibly offline or timeout). Defaulting to Auth profile.", firestoreError);
      }
      
      if (status === 'pending') {
        await signOut(auth);
        throw new Error("Your account is pending admin approval.");
      }
      
      // Set local state immediately to prevent immediate redirect bouncing from protected routes
      setUser({
        id: userCredential.user.uid,
        name: userName,
        email: userCredential.user.email,
        role: actualRole,
        status: status
      });

      return actualRole;
    } catch (error) {
      // Map Firebase errors to user-friendly messages
      let message = error.message; 
      if (error.code === 'auth/user-not-found') message = "No account found with this email.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') message = "Incorrect password.";
      if (error.code === 'auth/too-many-requests') message = "Too many failed attempts. Try again later.";
      
      if (!error.code && !error.message) message = "Login failed.";
      
      throw new Error(message);
    }
  };

  const adminLogin = async (username, password) => {
    if (username === 'ismadl@edu' && password === '9846765535') {
      localStorage.setItem('admin_session', 'true');
      setUser({ id: 'admin', role: 'admin', name: 'Administrator' });
      return true;
    }
    throw new Error("Invalid administrator credentials");
  };

  const logout = async () => {
    try {
      localStorage.removeItem('admin_session');
      if (auth.currentUser) {
        await signOut(auth);
      } else {
        setUser(null);
      }
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
