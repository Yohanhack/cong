// Firebase SDK compat
const firebaseConfig = {
    apiKey: "AIzaSyCmm3_mIQijkfcqm9Z3TM2dscjgLPpx4x0",
    authDomain: "base-f4f56.firebaseapp.com",
    projectId: "base-f4f56",
    storageBucket: "base-f4f56.firebasestorage.app",
    messagingSenderId: "1027578753370",
    appId: "1:1027578753370:web:a016bd5f1f60f9cd860363"
};

// Initialiser Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Gestion de l'inscription
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault(); // Empêche le rechargement de la page

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const fonction = document.getElementById('function').value;

    try {
        // Créer un utilisateur avec email et mot de passe
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Ajouter les informations dans Firestore
        await db.collection('users').doc(user.uid).set({
            password: password,
            name: name,
            email: email,
            fonction: fonction,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            online: true,
            photoURL: null
        });

        // Rediriger l'utilisateur après inscription réussie
        window.location.href = 'chat.html';

    } catch (error) {
        let errorMessage = "Une erreur est survenue";
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = "Cet email est déjà utilisé";
                break;
            case 'auth/invalid-email':
                errorMessage = "Email invalide";
                break;
            case 'auth/weak-password':
                errorMessage = "Le mot de passe doit contenir au moins 6 caractères";
                break;
        }
        alert(errorMessage);
    }
});

// Connexion utilisateur
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Connexion de l'utilisateur
        await auth.signInWithEmailAndPassword(email, password);

        // Mettre à jour le statut de l'utilisateur (en ligne)
        const userDoc = db.collection('users').doc(auth.currentUser.uid);
        await userDoc.update({
            online: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Redirection vers la page d'accueil
        window.location.href = 'chat.html';

    } catch (error) {
        let errorMessage = "Email ou mot de passe incorrect";
        alert(errorMessage);
    }
});

// Déconnexion automatique
window.addEventListener('beforeunload', async () => {
    if (auth.currentUser) {
        const userDoc = db.collection('users').doc(auth.currentUser.uid);
        await userDoc.update({
            online: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
});