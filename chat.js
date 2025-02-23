// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    // Import Firebase (assurez-vous que Firebase est inclus dans votre HTML)
    // <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js"></script>
    // <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js"></script>
    // <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js"></script>

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

    let currentUser = null;
    let currentChat = null;

    console.log('Firebase initialisé');

    // Vérifier l'authentification et charger les utilisateurs
    auth.onAuthStateChanged(async (user) => {
        console.log('État de l\'authentification changé:', user?.email);

        if (user) {
            try {
                // Charger les données de l'utilisateur
                const userDoc = await db.collection('users').doc(user.uid).get();
                
                if (userDoc.exists) {
                    currentUser = { ...user, ...userDoc.data() };
                    console.log('Données utilisateur chargées:', currentUser);

                    // Mettre à jour le statut en ligne
                    await db.collection('users').doc(user.uid).update({
                        online: true,
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Charger tous les utilisateurs
                    loadUsers();
                } else {
                    console.error('Document utilisateur inexistant');
                    auth.signOut();
                }
            } catch (error) {
                console.error('Erreur lors du chargement des données:', error);
            }
        } else {
            window.location.href = 'login.html';
        }
    });

    // Charger tous les utilisateurs
    function loadUsers() {
        console.log('Chargement des utilisateurs...');

        // Écouter les changements dans la collection users
        db.collection('users').onSnapshot((snapshot) => {
            const usersList = document.querySelector('.chats-container');
            usersList.innerHTML = ''; // Vider la liste

            console.log('Nombre d\'utilisateurs:', snapshot.size);

            snapshot.forEach((doc) => {
                const userData = doc.data();
                console.log('Traitement utilisateur:', userData.email);

                // Ne pas afficher l'utilisateur actuel
                if (userData.uid !== currentUser.uid) {
                    const div = document.createElement('div');
                    div.className = 'chat-item';
                    div.innerHTML = `
                        <img class="chat-avatar" src="${userData.photoURL || 'https://via.placeholder.com/50'}" alt="${userData.name}">
                        <div class="chat-content">
                            <div class="chat-header">
                                <span class="chat-name">${userData.name}</span>
                                <span class="chat-status ${userData.online ? 'online' : 'offline'}">
                                    ${userData.online ? '🟢 En ligne' : '⚫ Hors ligne'}
                                </span>
                            </div>
                            <div class="chat-info">
                                <span class="chat-function">${userData.fonction}</span>
                            </div>
                        </div>
                    `;

                    // Ajouter l'événement de clic
                    div.addEventListener('click', () => startChat(doc.id, userData));
                    usersList.appendChild(div);
                }
            });
        }, (error) => {
            console.error('Erreur lors du chargement des utilisateurs:', error);
        });
    }

    // Démarrer une conversation
    function startChat(userId, userData) {
        console.log('Démarrage conversation avec:', userData.name);
        currentChat = { userId, userData };

        // Basculer vers la page de chat
        document.getElementById('mainPage').classList.remove('active');
        document.getElementById('chatPage').classList.add('active');

        // Mettre à jour l'interface
        document.querySelector('.chat-name').textContent = userData.name;
        document.querySelector('.chat-status').textContent = 
            userData.online ? '🟢 En ligne' : '⚫ Hors ligne';

        // Charger les messages
        loadMessages(userId);
    }

    // Charger les messages
    function loadMessages(chatWithId) {
        console.log('Chargement des messages...');
        const messagesContainer = document.querySelector('.messages-container');
        messagesContainer.innerHTML = '';

        const chatId = [currentUser.uid, chatWithId].sort().join('_');

        db.collection('messages')
            .where('chatId', '==', chatId)
            .orderBy('timestamp', 'asc')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const message = change.doc.data();
                        const messageEl = document.createElement('div');
                        messageEl.className = `message ${message.senderId === currentUser.uid ? 'sent' : 'received'}`;
                        
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
                        console.log('Message envoyé avec succès');
                    } catch (error) {
                        console.error('Erreur lors de l\'envoi du message:', error);
                        alert('Erreur lors de l\'envoi du message');
                    }
                }
            }
        });
    }

    // Gérer le bouton retour
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

    // Gérer la déconnexion
    window.addEventListener('beforeunload', async () => {
        if (currentUser) {
            try {
                await db.collection('users').doc(currentUser.uid).update({
                    online: false,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('Statut hors ligne mis à jour');
            } catch (error) {
                console.error('Erreur lors de la mise à jour du statut:', error);
            }
        }
    });
});