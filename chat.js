import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    query, 
    onSnapshot,
    doc,
    setDoc,
    serverTimestamp,
    getDocs
} from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCmm3_mIQijkfcqm9Z3TM2dscjgLPpx4x0",
    authDomain: "base-f4f56.firebaseapp.com",
    projectId: "base-f4f56",
    storageBucket: "base-f4f56.firebasestorage.app",
    messagingSenderId: "1027578753370",
    appId: "1:1027578753370:web:a016bd5f1f60f9cd860363"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentChat = null;

// Vérification de l'authentification
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Mettre à jour le statut en ligne
        const userDoc = doc(db, 'users', user.uid);
        await setDoc(userDoc, {
            online: true,
            lastSeen: serverTimestamp()
        }, { merge: true });

        // Charger les conversations
        loadChats();
    } else {
        // Redirection vers la page de connexion si non authentifié
        window.location.href = 'login.html';
    }
});

// Charger tous les utilisateurs
async function loadChats() {
    // Query pour obtenir TOUS les utilisateurs sauf l'utilisateur actuel
    const usersQuery = query(collection(db, 'users'));

    onSnapshot(usersQuery, (snapshot) => {
        const usersList = document.querySelector('.chats-container');
        usersList.innerHTML = '';

        snapshot.forEach((doc) => {
            const userData = doc.data();
            // Ne pas afficher l'utilisateur actuel dans la liste
            if (userData.email !== currentUser.email) {
                const div = document.createElement('div');
                div.className = 'chat-item';
                div.innerHTML = `
                    <div class="chat-avatar">
                        ${userData.photoURL ? 
                            `<img src="${userData.photoURL}" alt="${userData.name}">` :
                            `<div class="avatar-placeholder">${userData.name[0]}</div>`
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

// Gestion de la déconnexion
window.addEventListener('beforeunload', async () => {
    if (auth.currentUser) {
        const userDoc = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userDoc, {
            online: false,
            lastSeen: serverTimestamp()
        }, { merge: true });
    }
});

// Ajout d'un écouteur pour la déconnexion manuelle
window.addEventListener('unload', async () => {
    if (auth.currentUser) {
        const userDoc = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userDoc, {
            online: false,
            lastSeen: serverTimestamp()
        }, { merge: true });
    }
});

// Déclaration de la fonction startChat
async function startChat(userId, userData) {
    currentChat = {
        userId: userId,
        userData: userData
    };

    // Mise à jour de l'affichage du nom du contact dans l'en-tête
    document.querySelector('.contact-name').textContent = userData.name;

    // Charger les messages de la conversation
    loadMessages();
}

async function loadMessages() {
    const chatContainer = document.querySelector('.chat');
    chatContainer.innerHTML = ''; // Clear existing messages

    const chatId = getChatId(currentUser.uid, currentChat.userId);
    const messagesQuery = query(collection(db, 'chats', chatId, 'messages'));

    onSnapshot(messagesQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const message = change.doc.data();
                displayMessage(message);
            }
        });
        chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to bottom
    });
}

function getChatId(user1, user2) {
    if (user1 < user2) {
        return user1 + "_" + user2;
    } else {
        return user2 + "_" + user1;
    }
}

function displayMessage(message) {
    const chatContainer = document.querySelector('.chat');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(message.senderId === currentUser.uid ? 'sent' : 'received');

    messageElement.innerHTML = `
        <div class="message-content">
            ${message.text}
        </div>
        <div class="message-time">
            ${formatTimestamp(message.timestamp)}
        </div>
    `;

    chatContainer.appendChild(messageElement);
}

function formatTimestamp(timestamp) {
    const date = timestamp.toDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

document.querySelector('.send-button').addEventListener('click', sendMessage);

async function sendMessage() {
    const messageInput = document.querySelector('.message-input');
    const text = messageInput.value.trim();

    if (text !== '') {
        const chatId = getChatId(currentUser.uid, currentChat.userId);
        const messagesCollection = collection(db, 'chats', chatId, 'messages');

        await setDoc(doc(messagesCollection), {
            senderId: currentUser.uid,
            receiverId: currentChat.userId,
            text: text,
            timestamp: serverTimestamp()
        });

        messageInput.value = '';
    }
}