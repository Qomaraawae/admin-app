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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fungsi untuk memetakan kode error Firebase ke pesan ramah pengguna
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
      default:
        return 'Terjadi kesalahan: ' + errorCode;
    }
  };

  // Fungsi login
  const login = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Periksa custom claims
      const idTokenResult = await user.getIdTokenResult();
      if (idTokenResult.claims.role !== 'admin') {
        await signOut(auth);
        throw new Error('Akses hanya untuk admin');
      }

      // Ambil data pengguna dari Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('Data pengguna tidak ditemukan di Firestore');
      }

      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(getFirebaseErrorMessage(error.code || error.message));
    }
  };

  // Fungsi logout
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Gagal logout: ' + error.message);
    }
  };

  // Pantau status autentikasi
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Ambil custom claims
          const idTokenResult = await firebaseUser.getIdTokenResult();
          const isAdminUser = idTokenResult.claims.role === 'admin';

          // Ambil data pengguna dari Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userDoc.data(),
            });
            setIsAdmin(isAdminUser);
          } else {
            // Jika dokumen pengguna tidak ada, logout
            await signOut(auth);
            setUser(null);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    isAdmin,
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