import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Email tidak valid';
      case 'auth/user-not-found':
        return 'Pengguna tidak ditemukan';
      case 'auth/wrong-password':
        return 'Kata sandi salah';
      case 'auth/invalid-credential':
        return 'Kredensial tidak valid';
      case 'permission-denied':
        return 'Izin ditolak: Tidak dapat mengakses data pengguna';
      case 'auth/network-request-failed':
        return 'Koneksi jaringan gagal. Periksa internet Anda.';
      default:
        return 'Terjadi kesalahan: ' + errorCode;
    }
  };

  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User logged in:', user.uid, user.email);

      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      console.log('User doc exists:', userDoc.exists(), 'Data:', userDoc.data());

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          role: 'user',
          createdAt: new Date(),
        });
        console.log('Created new user document for:', user.uid);
      }

      const userData = (await getDoc(userDocRef)).data();
      setUser({ ...user, ...userData });
      return user;
    } catch (error) {
      console.error('Login error details:', error.code, error.message);
      throw new Error(getFirebaseErrorMessage(error.code || error.message));
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Gagal logout: ' + error.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          console.log('Auth state - User doc exists:', userDoc.exists(), 'Data:', userDoc.data());

          if (userDoc.exists()) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userDoc.data(),
            });
          } else {
            await setDoc(userDocRef, {
              email: firebaseUser.email,
              role: 'user',
              createdAt: new Date(),
            });
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'user',
              createdAt: new Date(),
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error.code, error.message);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
