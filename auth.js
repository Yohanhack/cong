// auth.js
document.addEventListener('DOMContentLoaded', function() {
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyCmm3_mIQijkfcqm9Z3TM2dscjgLPpx4x0",
        authDomain: "base-f4f56.firebaseapp.com",
        projectId: "base-f4f56",
        storageBucket: "base-f4f56.firebasestorage.app",
        messagingSenderId: "1027578753370",
        appId: "1:1027578753370:web:a016bd5f1f60f9cd860363"
    };

    // Initialize Firebase
    const app = firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Configure persistence
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    // Loading state handler
    function setLoading(button, isLoading) {
        if (button) {
            button.disabled = isLoading;
            button.innerHTML = isLoading ? 'Chargement...' : button.getAttribute('data-original-text');
        }
    }

    // Register button handler
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.setAttribute('data-original-text', registerBtn.innerHTML);
        registerBtn.addEventListener('click', async () => {
            setLoading(registerBtn, true);

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const fonction = document.getElementById('function').value;

            // Validation
            if (!name || !email || !password || !fonction) {
                alert("Veuillez remplir tous les champs");
                setLoading(registerBtn, false);
                return;
            }

            try {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    name: name,
                    email: email,
                    fonction: fonction,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                    online: true,
                    photoURL: null
                });

                window.location.replace('chat.html');
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
                setLoading(registerBtn, false);
            }
        });
    }

    // Login button handler
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.setAttribute('data-original-text', loginBtn.innerHTML);
        loginBtn.addEventListener('click', async () => {
            setLoading(loginBtn, true);

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Validation
            if (!email || !password) {
                alert("Veuillez remplir tous les champs");
                setLoading(loginBtn, false);
                return;
            }

            try {
                await auth.signInWithEmailAndPassword(email, password);
                
                // Update online status
                const userDoc = db.collection('users').doc(auth.currentUser.uid);
                await userDoc.update({
                    online: true,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });

                window.location.replace('chat.html');
            } catch (error) {
                alert("Email ou mot de passe incorrect");
                setLoading(loginBtn, false);
            }
        });
    }

    // Handle Enter key press
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const loginBtn = document.getElementById('loginBtn');
            const registerBtn = document.getElementById('registerBtn');
            
            if (loginBtn && !loginBtn.disabled) {
                loginBtn.click();
            } else if (registerBtn && !registerBtn.disabled) {
                registerBtn.click();
            }
        }
    });

    // Auth state observer
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const currentPath = window.location.pathname;
            if (currentPath.includes('index.html') || currentPath.includes('register.html')) {
                window.location.replace('chat.html');
            }
        } else {
            if (window.location.pathname.includes('chat.html')) {
                window.location.replace('index.html');
            }
        }
    });
});