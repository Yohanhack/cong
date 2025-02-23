document.addEventListener('DOMContentLoaded', function() {
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
    try {
        firebase.initializeApp(firebaseConfig);
    } catch (e) {
        console.error("Firebase initialization error:", e);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();

    let currentUser = null;
    let currentChat = null;

    // Vérification de l'authentification
    auth.onAuthStateChanged(async (user) => {
        console.log('État de l\'authentification changé:', user?.email);

        if (!user) {
            console.log('Redirection vers login...');
            window.location.href = 'login.html';
            return;
        }

        try {
            // Charger les données de l'utilisateur
            const userDoc = await db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                console.error('Document utilisateur inexistant');
                auth.signOut();
                return;
            }

            currentUser = { ...user, ...userDoc.data() };
            console.log('Données utilisateur chargées:', currentUser);

            // Mettre à jour le statut en ligne
            await db.collection('users').doc(user.uid).update({
                online: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });

            // S'assurer que le conteneur principal est visible
            document.getElementById('mainPage').classList.add('active');
            document.getElementById('chatPage').classList.remove('active');

            // Charger les utilisateurs
            loadUsers();

        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur de chargement des données');
        }
    });

    function loadUsers() {
        console.log('Chargement des utilisateurs...');
        const usersList = document.querySelector('.chats-container');
        
        if (!usersList) {
            console.error('Container des chats non trouvé');
            return;
        }

        // Vider la liste
        usersList.innerHTML = '';

        // Observer les changements dans la collection users
        db.collection('users').onSnapshot((snapshot) => {
            console.log('Nombre d\'utilisateurs:', snapshot.size);
            
            snapshot.forEach((doc) => {
                const userData = doc.data();
                console.log('Traitement utilisateur:', userData.email);

                if (userData.uid !== currentUser.uid) {
                    // Créer l'élément de chat
                    const chatItem = document.createElement('div');
                    chatItem.className = 'chat-item';
                    
                    // Définir le HTML
                    chatItem.innerHTML = `
                        <div class="chat-avatar">
                            ${userData.photoURL ? 
                                `<img src="${userData.photoURL}" alt="${userData.name}">` :
                                `<div class="avatar-placeholder">${userData.name ? userData.name[0].toUpperCase() : '?'}</div>`
                            }
                        </div>
                        <div class="chat-content">
                            <div class="chat-header">
                                <h3 class="chat-name">${userData.name || 'Sans nom'}</h3>
                                <span class="chat-function">${userData.fonction || ''}</span>
                            </div>
                            <div class="chat-status ${userData.online ? 'online' : 'offline'}">
                                ${userData.online ? '🟢 En ligne' : '⚫ Hors ligne'}
                            </div>
                        </div>
                    `;

                    // Ajouter l'événement de clic
                    chatItem.addEventListener('click', () => {
                        startChat(doc.id, userData);
                    });

                    // Ajouter à la liste
                    usersList.appendChild(chatItem);
                }
            });
        }, (error) => {
            console.error('Erreur de chargement des utilisateurs:', error);
            alert('Erreur de chargement des utilisateurs');
        });
    }

    function startChat(userId, userData) {
        currentChat = { userId, userData };
        
        // Basculer l'affichage
        document.getElementById('mainPage').classList.remove('active');
        document.getElementById('chatPage').classList.add('active');
        
        // Mettre à jour l'interface
        const chatName = document.querySelector('.chat-name');
        const chatStatus = document.querySelector('.chat-status');
        
        if (chatName) chatName.textContent = userData.name || 'Sans nom';
        if (chatStatus) chatStatus.textContent = userData.online ? '🟢 En ligne' : '⚫ Hors ligne';
        
        // Charger les messages
        loadMessages(userId);
    }

    // Gérer le bouton retour
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('mainPage').classList.add('active');
            document.getElementById('chatPage').classList.remove('active');
            currentChat = null;
        });
    }

    function loadMessages(userId) {
        console.log(`Chargement des messages pour l'utilisateur ${userId}...`);
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer) return;

        messagesContainer.innerHTML = '';
        const chatId = [currentUser.uid, userId].sort().join('_');

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
                        messagesContainer.scrollTop = messagesContainer.scrollHeight;
                    }
                });
            });
    }

    // Gérer l'envoi de messages
    const messageInput = document.querySelector('.message-input input');
    if (messageInput) {
        messageInput.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter' && currentChat) {
                const text = e.target.value.trim();
                
                if (text) {
                    try {
                        const chatId = [currentUser.uid, currentChat.userId].sort().join('_');
                        
                        await db.collection('messages').add({
                            chatId: chatId,
                            text: text,
                            senderId: currentUser.uid,
                            receiverId: currentChat.userId,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
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

    function formatTime(timestamp) {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Gérer la déconnexion
    window.addEventListener('beforeunload', async () => {
        if (currentUser) {
            try {
                await db.collection('users').doc(currentUser.uid).update({
                    online: false,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error('Erreur mise à jour statut:', error);
            }
        }
    });
});