// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDM9C1LXvSqB1wN6z0WgGSlRKggO29-z0U",
    authDomain: "iglesia-agua-viva.firebaseapp.com",
    projectId: "iglesia-agua-viva",
    storageBucket: "iglesia-agua-viva.firebasestorage.app",
    messagingSenderId: "473262628582",
    appId: "1:473262628582:web:f76f8cdc200b28dd062527"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

console.log('✅ Firebase conectado correctamente');