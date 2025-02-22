// Import Firebase (adjust the path if necessary)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.2.0/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/9.2.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.2.0/firebase-auth.js";

// Configuration Firebase
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "VOTRE_AUTH_DOMAIN",
    projectId: "VOTRE_PROJECT_ID",
    storageBucket: "VOTRE_STORAGE_BUCKET",
    messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
    appId: "VOTRE_APP_ID"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Gestion de l'interface
document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.querySelector('.message-input input');
    const sendButton = document.querySelector('.send-btn');
    const messagesContainer = document.querySelector('.messages');
    const chatItems = document.querySelectorAll('.chat-item');
    
    // Gestion de la navigation mobile
    const menuBtn = document.querySelector('.menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const chatArea = document.querySelector('.chat-area');
    
    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        chatArea.classList.toggle('visible');
    });

    // Envoi de message
    async function sendMessage(text) {
        if (!text.trim()) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message sent';
        messageElement.innerHTML = `
            <p>${text}</p>
            <span class="time">${new Date().toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            })}</span>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        messageInput.value = '';
        
        // Ici, vous pouvez ajouter la logique pour envoyer le message à Firebase
        try {
            await addDoc(collection(db, 'messages'), {
                text: text,
                timestamp: new Date(),
                userId: auth.currentUser.uid // Assuming user is logged in
            });
        } catch (error) {
            console.error("Error sending message to Firebase:", error);
        }
    }

    // Écouteurs d'événements
    sendButton.addEventListener('click', () => {
        sendMessage(messageInput.value);
    });

    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage(messageInput.value);
        }
    });

    // Simulation de messages reçus (à remplacer par Firebase)
    function simulateReceivedMessage() {
        const messages = [
            "Message reçu",
            "Nouvelle notification",
            "Réunion à 14h",
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        const messageElement = document.createElement('div');
        messageElement.className = 'message received';
        messageElement.innerHTML = `
            <p>${randomMessage}</p>
            <span class="time">${new Date().toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            })}</span>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Gestion des conversations
    chatItems.forEach(item => {
        item.addEventListener('click', () => {
            chatItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            if (window.innerWidth <= 768) {
                sidebar.classList.add('hidden');
                chatArea.classList.add('visible');
            }
        });
    });

    // Listen for messages from Firebase
    const q = query(collection(db, 'messages'), orderBy('timestamp'), limit(50));

    onSnapshot(q, (querySnapshot) => {
        messagesContainer.innerHTML = ''; // Clear existing messages
        querySnapshot.forEach((doc) => {
            const messageData = doc.data();
            const messageElement = document.createElement('div');
            messageElement.className = messageData.userId === auth.currentUser?.uid ? 'message sent' : 'message received';
            messageElement.innerHTML = `
                <p>${messageData.text}</p>
                <span class="time">${new Date(messageData.timestamp?.toDate()).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}</span>
            `;
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    });
});

// Gestion de l'authentification
function login(email, password) {
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Utilisateur connecté
            const user = userCredential.user;
            console.log("Connecté:", user);
        })
        .catch((error) => {
            console.error("Erreur de connexion:", error);
        });
}

// Écouter les changements d'état de connexion
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Utilisateur connecté
        console.log("Utilisateur connecté");
    } else {
        // Utilisateur déconnecté
        console.log("Utilisateur déconnecté");
    }
});

