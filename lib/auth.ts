
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { ConversationTurn } from './state';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  serverTimestamp,
  doc,
  setDoc 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  signInWithPopup,
  onAuthStateChanged, 
  signOut as firebaseSignOut 
} from 'firebase/auth';

import { googleProvider } from './firebase';

// --- AUTH STORE ---
interface AuthState {
  user: { id: string; email: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => {
  const initialState = {
    user: null,
    loading: true,
  };

  onAuthStateChanged(auth, (user) => {
    if (user) {
      set({ user: { id: user.uid, email: user.email || '' }, loading: false });
    } else {
      set({ user: null, loading: false });
    }
  });

  return {
    ...initialState,
    signOut: async () => {
      await firebaseSignOut(auth);
      set({ user: null });
    },
    signUp: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    signInWithPassword: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    sendPasswordResetEmail: async (email) => {
      await sendPasswordResetEmail(auth, email);
    },
    signInWithGoogle: async () => {
      await signInWithPopup(auth, googleProvider);
    }
  };
});

// --- DATABASE HELPERS ---
export const updateUserSettings = async (userId: string, newSettings: Partial<{ systemPrompt: string; voice: string }>) => {
  try {
    const userSettingsRef = doc(db, 'user_settings', userId);
    await setDoc(userSettingsRef, newSettings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'user_settings');
  }
};

export const updateUserConversations = async (userId: string, turns: ConversationTurn[]) => {
  const lastTurn = turns[turns.length - 1];
  if (!lastTurn || !lastTurn.isFinal) return;

  try {
    const translationsRef = collection(db, 'translations');
    await addDoc(translationsRef, {
      userId: userId,
      role: lastTurn.role,
      text: lastTurn.text,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'translations');
  }
};

export const clearUserConversations = async (userId: string) => {
  try {
    const q = query(collection(db, 'translations'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'translations');
  }
};
