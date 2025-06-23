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
      case 'permission-denied':
        return 'Izin ditolak: Tidak dapat mengakses data pengguna';
      default:
        return 'Terjadi kesalahan: ' + errorCode;
    }
  };

  // Fungsi login
  const login = async (email, password) => {
    try {
      // Login dengan Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User logged in:', user.uid);

      // Ambil data pengguna dari Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      console.log('User doc exists:', userDoc.exists(), 'Data:', userDoc.data());

      // Jika dokumen tidak ada, buat dokumen baru
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          role: 'user', // Default role, ubah ke 'admin' jika perlu
          createdAt: new Date(),
        });
        console.log('Created new user document for:', user.uid);
        throw new Error('Akun baru dibuat, tetapi bukan admin');
      }

      // Periksa role dari Firestore
      const userData = userDoc.data();
      if (userData.role !== 'admin') {
        await signOut(auth);
        throw new Error('Akses hanya untuk admin');
      }

      return user;
    } catch (error) {
      console.error('Login error details:', error.code, error.message);
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
          // Ambil data pengguna dari Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          console.log('Auth state - User doc exists:', userDoc.exists(), 'Data:', userDoc.data());

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userData,
            });
            setIsAdmin(userData.role === 'admin');
          } else {
            // Jika dokumen tidak ada, buat dokumen baru
            await setDoc(userDocRef, {
              email: firebaseUser.email,
              role: 'user', // Default role, ubah ke 'admin' jika perlu
              createdAt: new Date(),
            });
            console.log('Created new user document in auth state for:', firebaseUser.uid);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'user',
              createdAt: new Date(),
            });
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error.code, error.message);
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