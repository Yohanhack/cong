// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    // Import Firebase (assuming you're using modular imports)
    import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
    import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
    import { getFirestore, collection, doc, getDoc, updateDoc, onSnapshot, addDoc, query, where, orderBy, serverTimestamp, FieldValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

    // Configuration Firebase
    const firebaseConfig = {
        apiKey: "AIzaSyCmm3_mIQijkfcqm9Z3TM2dscjgLPpx4x0",
        authDomain: "base-f4f56.firebaseapp.com",
        projectId: "base-f4f56",
        storageBucket: "base-f4f56.firebasestorage.app",
        messagingSenderId: "1027578753370",
        appId: "1:1027578753370:web:a016bd5f1f60f9cd860363"
    };

    // Initialiser Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    let currentUser = null;
    let currentChat = null;

    // Vérification de l'authentification
    onAuthStateChanged(auth, async (user) => {
        console.log("Auth state changed:", user ? user.email : 'No user');
        
        if (user) {
            try {
                // Charger les informations de l'utilisateur depuis Firestore
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                
                if (userDoc.exists()) {
                    currentUser = { ...user, ...userDoc.data() };
                    console.log("User data loaded:", currentUser);

                    // Mettre à jour le statut en ligne
                    await updateDoc(doc(db, 'users', user.uid), {
                        online: true,
                        lastSeen: serverTimestamp()
                    });

                    // Charger les conversations
                    loadChats();
                } else {
                    console.error("User document doesn't exist");
                    signOut(auth);
                }
            } catch (error) {
                console.error("Error loading user data:", error);
                signOut(auth);
            }
        } else {
            window.location.replace('login.html');
        }
    });

    // Charger tous les utilisateurs
    function loadChats() {
        console.log("Loading chats...");
        
        onSnapshot(collection(db, 'users'), (snapshot) => {
            const usersList = document.querySelector('.chats-container');
            usersList.innerHTML = '';
            
            console.log("Users snapshot size:", snapshot.size);

            snapshot.forEach((doc) => {
                const userData = doc.data();
                console.log("Processing user:", userData.email);
                
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
        }, error => {
            console.error("Error loading users:", error);
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

        const messagesRef = collection(db, 'messages');
        const q = query(messagesRef, where('chatId', '==', chatId), orderBy('timestamp', 'asc'));

        onSnapshot(q, (snapshot) => {
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
        }, error => {
            console.error("Error loading messages:", error);
        });
    }

    // Envoyer un message
    const messageInput = document.querySelector('.message-input input');
    if (messageInput) {
        messageInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && currentChat) {
                const message = e.target.value.trim();
                
                if (message) {
                    const chatId = [currentUser.uid, currentChat.userId].sort().join('_');
                    
                    try {
                        await addDoc(collection(db, 'messages'), {
                            chatId: chatId,
                            text: message,
                            senderId: currentUser.uid,
                            receiverId: currentChat.userId,
                            timestamp: serverTimestamp()
                        });
                        
                        e.target.value = '';
                    } catch (error) {
                        console.error('Erreur envoi message:', error);
                        alert('Erreur lors de l\'envoi du message');
                    }
                }
            }
        });
    }

    // Gestion du bouton retour
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('chatPage').classList.remove('active');
            document.getElementById('mainPage').classList.add('active');
            currentChat = null;
        });
    }

    // Formater l'heure
    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Gestion de la déconnexion
    window.addEventListener('beforeunload', async () => {
        if (currentUser) {
            try {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    online: false,
                    lastSeen: serverTimestamp()
                });
            } catch (error) {
                console.error("Error updating online status:", error);
            }
        }
    });
});