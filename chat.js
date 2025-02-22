import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { 
    getFirestore, 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    addDoc,
    doc,
    setDoc,
    serverTimestamp 
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
        window.location.href = 'login.html';
    }
});

// Charger les conversations
async function loadChats() {
    const usersQuery = query(
        collection(db, 'users'),
        where('uid', '!=', currentUser.uid)
    );

    onSnapshot(usersQuery, (snapshot) => {
        const usersList = document.querySelector('.chats-container');
        usersList.innerHTML = '';

        snapshot.forEach((doc) => {
            const userData = doc.data();
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
                    <div class="chat-status">
                        ${userData.online ? 'En ligne' : 'Hors ligne'}
                    </div>
                </div>
            `;

            div.onclick = () => startChat(doc.id, userData);
            usersList.appendChild(div);
        });
    });
}

// Démarrer une conversation
async function startChat(userId, userData) {
    currentChat = userId;
    
    // Mettre à jour l'interface
    document.querySelector('.chat-header h2').textContent = userData.name;
    document.querySelector('.chat-header .status').textContent = 
        userData.online ? 'En ligne' : 'Hors ligne';
    
    // Charger les messages
    loadMessages(userId);
}

// Charger les messages
function loadMessages(chatWithId) {
    const messagesQuery = query(
        collection(db, 'messages'),
        where('participants', 'array-contains', [currentUser.uid, chatWithId].sort().join('_')),
        orderBy('timestamp', 'asc')
    );

    const messagesContainer = document.querySelector('.messages-container');
    messagesContainer.innerHTML = '';

    onSnapshot(messagesQuery, (snapshot) => {
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
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        });
    });
}

// Envoyer un message
document.querySelector('.message-input')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const input = e.target.querySelector('input');
    const message = input.value.trim();
    
    if (message && currentChat) {
        try {
            const messageData = {
                text: message,
                senderId: currentUser.uid,
                participants: [currentUser.uid, currentChat].sort().join('_'),
                timestamp: serverTimestamp()
            };

            await addDoc(collection(db, 'messages'), messageData);
            input.value = '';
        } catch (error) {
            console.error('Erreur envoi message:', error);
            alert('Erreur lors de l\'envoi du message');
        }
    }
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