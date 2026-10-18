import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.FIREBASE_APP_ID || "",
};

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let app = null;
let auth = null;

export function getFirebaseAuth() {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    auth.useDeviceLanguage();
  }
  return auth;
}

export function clearRecaptcha(containerId = "firebase-recaptcha-container") {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
    } catch {
      // ignore
    }
    window.recaptchaVerifier = null;
  }
  const container = document.getElementById(containerId);
  if (container) {
    try {
      const freshNode = container.cloneNode(false);
      container.parentNode?.replaceChild(freshNode, container);
    } catch {
      container.innerHTML = "";
    }
  }
}

/**
 * Sets up Firebase reCAPTCHA verifier for phone verification
 * @param {string} containerId - DOM element ID for reCAPTCHA widget
 * @param {Function} [onExpired] - Optional callback when reCAPTCHA expires
 * @returns {RecaptchaVerifier|null}
 */
export function setupRecaptcha(containerId = "firebase-recaptcha-container", onExpired) {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    throw new Error(
      "Firebase is not configured. Please add your Firebase API keys to .env."
    );
  }

  // Fully purge old verifier and DOM node before instantiating
  clearRecaptcha(containerId);

  const verifier = new RecaptchaVerifier(firebaseAuth, containerId, {
    size: "invisible",
    callback: () => {
      // reCAPTCHA solved
    },
    "expired-callback": () => {
      if (onExpired) onExpired();
    },
  });

  window.recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Sends a phone verification SMS via Firebase Phone Auth
 * @param {string} phoneNumber - Full phone number with country code, e.g. "+919876543210"
 * @param {RecaptchaVerifier} recaptchaVerifier
 * @returns {Promise<ConfirmationResult>}
 */
export async function sendPhoneOtp(phoneNumber, recaptchaVerifier) {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    throw new Error("Firebase Auth is not initialized");
  }

  // Format as E.164 if needed (+91 for 10-digit Indian numbers)
  const rawDigits = String(phoneNumber).replace(/\D/g, "");
  const formattedPhone =
    rawDigits.length === 10 ? `+91${rawDigits}` : `+${rawDigits}`;

  return await signInWithPhoneNumber(firebaseAuth, formattedPhone, recaptchaVerifier);
}

/**
 * Confirms the SMS OTP entered by user and returns the Firebase ID token
 * @param {ConfirmationResult} confirmationResult
 * @param {string} otpCode - 6-digit SMS code
 * @returns {Promise<{ idToken: string, phoneNumber: string }>}
 */
export async function confirmPhoneOtp(confirmationResult, otpCode) {
  if (!confirmationResult) {
    throw new Error("No active phone verification session found");
  }

  const userCredential = await confirmationResult.confirm(otpCode);
  const idToken = await userCredential.user.getIdToken();
  return {
    idToken,
    phoneNumber: userCredential.user.phoneNumber,
  };
}

