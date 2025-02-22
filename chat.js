 // Utiliser la même version de Firebase que auth.js
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

// Firebase SDK compat
const firebaseConfig = {
    apiKey: "AIzaSyCmm3_mIQijkfcqm9Z3TM2dscjgLPpx4x0",
    authDomain: "base-f4f56.firebaseapp.com",
    projectId: "base-f4f56",
    storageBucket: "base-f4f56.firebasestorage.app",
    messagingSenderId: "1027578753370",
    appId: "1:1027578753370:web:a016bd5f1f60f9cd860363"
};

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let currentChat = null;

// Vérification de l'authentification
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        
        // Charger les informations de l'utilisateur depuis Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            currentUser = { ...currentUser, ...userDoc.data() };
        }

        // Mettre à jour le statut en ligne
        await db.collection('users').doc(user.uid).update({
            online: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Charger les conversations
        loadChats();
    } else {
        window.location.href = 'index.html';
    }
});

// Charger tous les utilisateurs
function loadChats() {
    db.collection('users').onSnapshot((snapshot) => {
        const usersList = document.querySelector('.chats-container');
        usersList.innerHTML = '';

        snapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.uid !== currentUser.uid) {
                const div = document.createElement('div');
                div.className = 'chat-item';
                div.innerHTML = `
                    <div class="chat-avatar">
                        ${userData.photoURL ? 
                            `<img src="${userData.photoURL}" alt="${userData.name}">` :
                            `<div class="avatar-placeholder">${userData.name[0].toUpperCase()}</div>`
                        }
                    </div>
                    <div class="chat-info">
                        <div class="chat-header">
                            <h3>${userData.name}</h3>
                            <span class="chat-function">${userData.fonction}</span>
                        </div>
                        <div class="chat-status ${userData.online ? 'online' : 'offline'}">
                            ${userData.online ? 'En ligne' : 'Hors ligne'}
                        </div>
                    </div>
                `;

                div.onclick = () => startChat(doc.id, userData);
                usersList.appendChild(div);
            }
        });
    });
}

// Démarrer une conversation
function startChat(userId, userData) {
    currentChat = { userId, userData };
    
    // Basculer vers la page de chat
    document.getElementById('mainPage').classList.remove('active');
    document.getElementById('chatPage').classList.add('active');
    
    // Mettre à jour l'interface
    document.querySelector('.chat-name').textContent = userData.name;
    document.querySelector('.chat-status').textContent = 
        userData.online ? 'En ligne' : 'Hors ligne';
    
    // Charger les messages
    loadMessages(userId);
}

// Charger les messages
function loadMessages(chatWithId) {
    const messagesContainer = document.querySelector('.messages-container');
    messagesContainer.innerHTML = '';

    // Créer un ID unique pour la conversation
    const chatId = [currentUser.uid, chatWithId].sort().join('_');

    db.collection('messages')
        .where('chatId', '==', chatId)
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const message = change.doc.data();
                    const messageEl = document.createElement('div');
                    messageEl.className = `message ${
                        message.senderId === currentUser.uid ? 'sent' : 'received'
                    }`;
                    
                    messageEl.innerHTML = `
                        <div class="message-content">${message.text}</div>
                        <div class="message-time">
                            ${formatTime(message.timestamp)}
                        </div>
                    `;
                    
                    messagesContainer.appendChild(messageEl);
                }
            });
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
}

// Envoyer un message
document.querySelector('.message-input input')?.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && currentChat) {
        const input = e.target;
        const message = input.value.trim();
        
        if (message) {
            const chatId = [currentUser.uid, currentChat.userId].sort().join('_');
            
            try {
                await db.collection('messages').add({
                    chatId: chatId,
                    text: message,
                    senderId: currentUser.uid,
                    receiverId: currentChat.userId,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                input.value = '';
            } catch (error) {
                console.error('Erreur envoi message:', error);
                alert('Erreur lors de l\'envoi du message');
            }
        }
    }
});

// Gestion du bouton retour
document.querySelector('.back-btn')?.addEventListener('click', () => {
    document.getElementById('chatPage').classList.remove('active');
    document.getElementById('mainPage').classList.add('active');
    currentChat = null;
});

// Formater l'heure
function formatTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}