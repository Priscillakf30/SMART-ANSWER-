import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, testConnection } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  role: UserRole;
  isTeacher: boolean;
  isStudent: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchPersona: (role: UserRole, customName?: string, customId?: string) => void;
  updateProfileName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default Pre-configured Malaysian SJKC Personas for fast classroom testing
export const DEMO_PERSONAS: Record<string, UserProfile> = {
  teacher: {
    uid: 'teacher-tan-01',
    displayName: '陈老师 (Cikgu Tan)',
    email: 'packy3033@gmail.com', // matched with runtime user email for admin/teacher permissions
    role: 'teacher',
    teacherId: 'T-2026-08',
    schoolId: 'sjkc-yuk-choy',
    classIds: ['class-3-merah', 'class-4-biru'],
    accountStatus: 'active'
  },
  student1: {
    uid: 'student-01',
    displayName: '林小明 (Lim Xiao Ming)',
    email: 'xiaoming@sjkc.edu.my',
    role: 'student',
    studentId: 'SJKC-3M-01',
    schoolId: 'sjkc-yuk-choy',
    classIds: ['class-3-merah'],
    accountStatus: 'active'
  },
  student2: {
    uid: 'student-02',
    displayName: '黄丽美 (Wong Li Mei)',
    email: 'limei@sjkc.edu.my',
    role: 'student',
    studentId: 'SJKC-3M-02',
    schoolId: 'sjkc-yuk-choy',
    classIds: ['class-3-merah'],
    accountStatus: 'active'
  },
  admin: {
    uid: 'admin-wong-01',
    displayName: '黄副校长 (PK Pentadbiran Wong)',
    email: 'packy3033@gmail.com',
    role: 'admin',
    schoolId: 'sjkc-yuk-choy',
    accountStatus: 'active'
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    // Check saved persona from sessionStorage/localStorage
    const saved = localStorage.getItem('smart_answer_active_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    // Default to Teacher persona on first open to show dashboard
    return DEMO_PERSONAS.teacher;
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test connection on mount
    testConnection();

    // Listen to Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setCurrentUser(data);
            localStorage.setItem('smart_answer_active_user', JSON.stringify(data));
          } else {
            // First time login: create user record
            const newProfile: UserProfile = {
              uid: user.uid,
              displayName: user.displayName || '新用户',
              email: user.email || '',
              role: user.email === 'packy3033@gmail.com' ? 'teacher' : 'student',
              schoolId: 'sjkc-yuk-choy',
              classIds: ['class-3-merah'],
              accountStatus: 'active',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setCurrentUser(newProfile);
            localStorage.setItem('smart_answer_active_user', JSON.stringify(newProfile));
          }
        } catch (error) {
          console.warn('Could not sync user profile from cloud:', error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      if (res.user) {
        const profile: UserProfile = {
          uid: res.user.uid,
          displayName: res.user.displayName || 'Google 用户',
          email: res.user.email || '',
          role: res.user.email === 'packy3033@gmail.com' ? 'teacher' : 'teacher',
          schoolId: 'sjkc-yuk-choy',
          classIds: ['class-3-merah', 'class-4-biru'],
          accountStatus: 'active'
        };
        await setDoc(doc(db, 'users', res.user.uid), profile);
        setCurrentUser(profile);
        localStorage.setItem('smart_answer_active_user', JSON.stringify(profile));
      }
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      // Reset to a student persona or logged out state
      const guestStudent = DEMO_PERSONAS.student1;
      setCurrentUser(guestStudent);
      localStorage.setItem('smart_answer_active_user', JSON.stringify(guestStudent));
    } catch (err) {
      console.error('Sign Out error:', err);
    }
  };

  const switchPersona = (newRole: UserRole, customName?: string, customId?: string) => {
    let selected: UserProfile;
    if (newRole === 'teacher') {
      selected = DEMO_PERSONAS.teacher;
    } else if (newRole === 'admin') {
      selected = DEMO_PERSONAS.admin;
    } else {
      selected = customId === 'student-02' ? DEMO_PERSONAS.student2 : DEMO_PERSONAS.student1;
    }

    if (customName) {
      selected = { ...selected, displayName: customName };
    }
    setCurrentUser(selected);
    localStorage.setItem('smart_answer_active_user', JSON.stringify(selected));
  };

  const updateProfileName = async (name: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, displayName: name };
    setCurrentUser(updated);
    localStorage.setItem('smart_answer_active_user', JSON.stringify(updated));
    try {
      await setDoc(doc(db, 'users', currentUser.uid), updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  const role = currentUser?.role || 'student';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        role,
        isTeacher: role === 'teacher' || role === 'admin',
        isStudent: role === 'student',
        isAdmin: role === 'admin',
        signInWithGoogle,
        signOut,
        switchPersona,
        updateProfileName
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
