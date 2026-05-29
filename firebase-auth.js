// El sistema original no usa Firebase Auth (login es local con localStorage).
// Firestore se conecta directamente — no intentar signInAnonymously.
window.firebaseReady = Promise.resolve();
