// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    // Import Firebase (assurez-vous que Firebase est inclus dans votre HTML)
    // <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
    // <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js"></script>
    // <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js"></script>
    // <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-storage-compat.js"></script>
    // <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js"></script>

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
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    // Activer la persistance pour une meilleure expérience hors ligne
    db.enablePersistence()
        .catch((err) => {
            console.error("Erreur persistance:", err);
        });

    let currentUser = null;
    let currentChat = null;

    // Vérifier si l'utilisateur est déjà connecté
    auth.onAuthStateChanged(async (user) => {
        console.log("État auth changé:", user?.email);

        if (!user) {
            window.location.href = 'login.html';
            return;
        }

        try {
            // Charger les données utilisateur
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                console.error("Utilisateur non trouvé dans Firestore");
                auth.signOut();
                return;
            }

            currentUser = {
                uid: user.uid,
                email: user.email,
                ...userDoc.data()
            };

            console.log("Utilisateur chargé:", currentUser);

            // Mettre à jour le statut
            await db.collection('users').doc(user.uid).update({
                online: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Charger la liste des utilisateurs
            loadUsersList();

        } catch (error) {
            console.error("Erreur chargement:", error);
            alert("Erreur de chargement des données");
        }
    });

    function loadUsersList() {
        const container = document.querySelector('.chats-container');
        if (!container) {
            console.error("Container non trouvé");
            return;
        }

        // Vider le container
        container.innerHTML = '';

        // Écouter les changements dans la collection users
        const unsubscribe = db.collection('users')
            .orderBy('lastSeen', 'desc')
            .onSnapshot((snapshot) => {
                console.log("Mise à jour users, nombre:", snapshot.size);
                
                snapshot.forEach((doc) => {
                    const userData = doc.data();
                    
                    // Ne pas afficher l'utilisateur actuel
                    if (userData.uid === currentUser.uid) return;

                    console.log("Ajout utilisateur:", userData.email);

                    const div = document.createElement('div');
                    div.className = 'chat-item';
                    div.innerHTML = `
                        <div class="chat-avatar">
                            ${userData.photoURL ? 
                                `<img src="${userData.photoURL}" alt="${userData.name}" class="chat-avatar">` :
                                `<div class="avatar-placeholder">${userData.name ? userData.name[0].toUpperCase() : '?'}</div>`
                            }
                        </div>
                        <div class="chat-content">
                            <div class="chat-header">
                                <span class="chat-name">${userData.name || 'Sans nom'}</span>
                                <span class="chat-function">${userData.fonction || ''}</span>
                            </div>
                            <div class="chat-status ${userData.online ? 'online' : 'offline'}">
                                ${userData.online ? '🟢 En ligne' : '⚫ Hors ligne'}
                            </div>
                        </div>
                    `;

                    div.onclick = () => startChat(doc.id, userData);
                    container.appendChild(div);
                });
            }, (error) => {
                console.error("Erreur snapshot:", error);
            });

        // Nettoyer l'écouteur quand la page est fermée
        window.addEventListener('unload', () => unsubscribe());
    }

    function startChat(userId, userData) {
        currentChat = { userId, userData };
        
        const mainPage = document.getElementById('mainPage');
        const chatPage = document.getElementById('chatPage');
        
        if (mainPage && chatPage) {
            mainPage.classList.remove('active');
            chatPage.classList.add('active');
            
            const nameEl = chatPage.querySelector('.chat-name');
            const statusEl = chatPage.querySelector('.chat-status');
            
            if (nameEl) nameEl.textContent = userData.name || 'Sans nom';
            if (statusEl) statusEl.textContent = userData.online ? '🟢 En ligne' : '⚫ Hors ligne';
            
            loadMessages(userId);
        }
    }

    // Gérer le bouton retour
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            const mainPage = document.getElementById('mainPage');
            const chatPage = document.getElementById('chatPage');
            
            if (mainPage && chatPage) {
                chatPage.classList.remove('active');
                mainPage.classList.add('active');
                currentChat = null;
            }
        });
    }

    // Gérer l'envoi de messages
    const messageInput = document.querySelector('.message-input input');
    if (messageInput) {
        messageInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && currentChat && e.target.value.trim()) {
                try {
                    const chatId = [currentUser.uid, currentChat.userId].sort().join('_');
                    await db.collection('messages').add({
                        chatId: chatId,
                        text: e.target.value.trim(),
                        senderId: currentUser.uid,
                        receiverId: currentChat.userId,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    e.target.value = '';
                } catch (error) {
                    console.error("Erreur envoi message:", error);
                    alert("Erreur d'envoi du message");
                }
            }
        });
    }

    // Gérer la déconnexion
    window.addEventListener('beforeunload', async (e) => {
        if (currentUser) {
            try {
                await db.collection('users').doc(currentUser.uid).update({
                    online: false,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error("Erreur déconnexion:", error);
            }
        }
    });

    // Fonction pour charger les messages
    function loadMessages(userId) {
        const container = document.querySelector('.messages-container');
        if (!container) return;

        container.innerHTML = '';
        const chatId = [currentUser.uid, userId].sort().join('_');

        db.collection('messages')
            .where('chatId', '==', chatId)
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        const div = document.createElement('div');
                        div.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
                        
                        div.innerHTML = `
                            <div class="message-content">${message.text}</div>
                            <div class="message-time">
                                ${formatTime(message.timestamp)}
                            </div>
                        `;
                        
                        container.appendChild(div);
                        container.scrollTop = container.scrollHeight;
                    }
                });
            });
    }

    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
});