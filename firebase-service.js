import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  getDocFromServer 
} from 'https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js';

// Configuration
export const firebaseConfig = {
  projectId: "giga-phosphene-pthv3",
  appId: "1:979625951596:web:ceb3f49c96e627da903349",
  apiKey: "AIzaSyBbHfUGoGdVJeqRWFy7FFDavo0ttluSN78",
  authDomain: "giga-phosphene-pthv3.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-certificateverif-2c5b77ed-d8f5-491d-8487-7af6dd599c4d",
  storageBucket: "giga-phosphene-pthv3.firebasestorage.app",
  messagingSenderId: "979625951596",
  oAuthClientId: "979625951596-dm6ii3t5k16momifacbusctht9ckqtv1.apps.googleusercontent.com"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * ============================================================
 * AUTHORIZED GMAIL & ADMIN ACCOUNTS ALLOWLIST
 * ============================================================
 * You can specify exactly which Gmail accounts and emails are allowed to 
 * generate and issue certificates. Any other Google or email account will 
 * be automatically denied access.
 */
export const AUTHORIZED_EMAILS = [
  'ysnhun412@gmail.com',         // Primary administrator (your account)
   'sanjivani.jadhav.cs@gmail.com',         // Primary administrator (your account)

  'dcodeclub.ssiems@gmail.com',  // Official club email
  'syedasif111005@gmail.com',        // President,
  
];

export const AUTHORIZED_DOMAINS = [
  'dcode.club'
];

/**
 * Check whether an email is on the authorized allowlist
 */
export function isEmailAuthorized(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (AUTHORIZED_EMAILS.map(e => e.toLowerCase()).includes(normalized)) {
    return true;
  }
  const domain = normalized.split('@')[1];
  if (domain && AUTHORIZED_DOMAINS.includes(domain)) {
    return true;
  }
  return false;
}

// Lock to prevent multiple concurrent popup attempts (fixes INTERNAL ASSERTION / cancelled-popup)
let isGoogleAuthInProgress = false;

// Test connection
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    console.log('Firestore connection ready');
  }
}

// Google Sign-In with popup + iframe safety
export async function loginWithGoogle() {
  if (isGoogleAuthInProgress) {
    return { success: false, error: 'Sign-in is already in progress. Please wait or check your popup window.' };
  }

  isGoogleAuthInProgress = true;

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Verify authorized allowlist
    if (!isEmailAuthorized(user.email)) {
      await signOut(auth);
      return {
        success: false,
        error: `Access Denied: The Google account "${user.email}" is not authorized. Only designated admin emails can access the Generator.`
      };
    }

    // Register / update admin profile in Firestore
    if (user) {
      await setDoc(doc(db, 'admins', user.uid), {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Authorized Issuer',
        role: 'Organizer & Certificate Issuer',
        lastLoginAt: new Date().toISOString()
      }, { merge: true });
    }

    return { success: true, user };
  } catch (error) {
    console.warn('Google Sign-In notice:', error.code || error.message);

    // Handle common popup/iframe issues gracefully
    if (error.code === 'auth/popup-blocked') {
      return {
        success: false,
        error: 'The Google Sign-In popup was blocked by your browser iframe. Please allow popups, open this app in a new tab, or use the Admin ID & Password form below.'
      };
    }
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      return {
        success: false,
        error: 'Sign-in popup was closed before completion. Please try again.'
      };
    }

    return { success: false, error: error.message || 'Google Sign-In failed.' };
  } finally {
    isGoogleAuthInProgress = false;
  }
}

// Admin ID & Password Sign-In
export async function loginWithEmailPass(emailOrId, password) {
  try {
    const cleanInput = emailOrId.trim().toLowerCase();
    const email = cleanInput.includes('@') ? cleanInput : `${cleanInput.replace(/[^a-z0-9]/g, '')}@dcode.club`;

    // Verify authorized allowlist first
    if (!isEmailAuthorized(email) && !isEmailAuthorized(cleanInput)) {
      return {
        success: false,
        error: `Access Denied: "${emailOrId}" is not in the list of authorized administrator accounts.`
      };
    }

    let res;
    try {
      res = await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      // If user not registered in Firebase Auth yet, provision credentials on first authorized login
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        try {
          res = await createUserWithEmailAndPassword(auth, email, password);
        } catch (createErr) {
          throw err;
        }
      } else {
        throw err;
      }
    }

    const user = res.user;
    if (user) {
      await setDoc(doc(db, 'admins', user.uid), {
        uid: user.uid,
        email: user.email || email,
        displayName: user.displayName || email.split('@')[0],
        role: 'Certificate Admin',
        lastLoginAt: new Date().toISOString()
      }, { merge: true });
    }

    return { success: true, user };
  } catch (error) {
    console.error('Email/Password Sign-In Error:', error);
    let msg = error.message;
    if (error.code === 'auth/wrong-password') {
      msg = 'Incorrect security password. Please re-enter your password.';
    } else if (error.code === 'auth/weak-password') {
      msg = 'Password must be at least 6 characters.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Invalid email address format.';
    }
    return { success: false, error: msg };
  }
}

// Logout
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Auth State Listener with automatic allowlist enforcement
export function subscribeToAuth(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user && !isEmailAuthorized(user.email)) {
      await signOut(auth);
      callback(null);
    } else {
      callback(user);
    }
  });
}
