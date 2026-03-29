// main.js — Global functionality across all PawPedia pages

document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Mobile Navigation
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.innerHTML = navLinks.classList.contains('active') ? '&times;' : '&#9776;';
        });
    }

    // 2. Setup Dark Mode Toggle
    setupDarkMode();

    // 3. Setup global Toast Container
    setupToastContainer();

    // Setup AI Chatbot
    setupChatbot();

    // 4. Hook up Get Started buttons (now handled in HTML via openAuthModal)

    // 5. Smart Scroll Animations (Reveal)
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});

function setupDarkMode() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    // Create Dark Mode Toggle Button
    const themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle-btn';
    themeBtn.innerHTML = '🌙';
    themeBtn.title = 'Toggle Dark Mode';
    
    // Insert before the CTA button
    const cta = document.querySelector('.nav-cta');
    if (cta) {
        nav.insertBefore(themeBtn, cta);
    } else {
        nav.appendChild(themeBtn);
    }

    // Check LocalStorage
    const savedTheme = localStorage.getItem('pawpedia-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeBtn.innerHTML = '☀️';
    }

    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('pawpedia-theme', 'dark');
            themeBtn.innerHTML = '☀️';
        } else {
            localStorage.setItem('pawpedia-theme', 'light');
            themeBtn.innerHTML = '🌙';
        }
    });
}

function setupToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastArea';
    container.className = 'toast-area';
    document.body.appendChild(container);

    // Overwrite native alert for all interactive mock actions
    window.originalAlert = window.alert;
    window.alert = function(msg) {
        showToast(msg);
    };
}

// Global Toast function
window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toastArea');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '🐾'}</span>
        <span class="toast-msg">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        if(toast.parentElement) {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000); // 4 seconds
}

// Global Modal helper
window.openModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

/* ===== AUTH MODAL LOGIC ===== */
let currentAuthTab = 'login';
let currentUser = null;

window.openAuthModal = function() {
    if (currentUser) {
        window.location.href = 'dashboard.html';
        return;
    }
    openModal('authModal');
}

window.switchAuthTab = function(tab) {
    currentAuthTab = tab;
    
    // Update Tabs UI
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.auth-tab[onclick*="${tab}"]`).classList.add('active');
    
    // Update Form fields
    const nameField = document.getElementById('authNameField');
    const submitBtn = document.getElementById('authSubmitBtn');
    
    if (tab === 'signup') {
        nameField.style.display = 'block';
        submitBtn.textContent = 'Create Account';
    } else {
        nameField.style.display = 'none';
        submitBtn.textContent = 'Login';
    }
}

window.handleAuthSubmit = async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const name = document.getElementById('authName').value;
    
    const endpoint = currentAuthTab === 'signup' ? '/api/signup' : '/api/login';
    const payload = currentAuthTab === 'signup' ? { email, password, name } : { email, password };

    try {
        const res = await fetch(`http://localhost:3000${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast(currentAuthTab === 'signup' ? 'Account created! Welcome.' : 'Welcome back!', 'success');
            closeModal('authModal');
            currentUser = data.user;
            localStorage.setItem('pawpedia_user', JSON.stringify(currentUser));
            updateNavForUser();
        } else {
            showToast(data.error || 'Authentication failed', 'error');
        }
    } catch (err) {
        // Fallback for UI if backend isn't ready
        showToast(`Simulated ${currentAuthTab} successful!`, 'info');
        currentUser = { id: 1, name: currentAuthTab === 'signup'? name : 'Explorer' };
        localStorage.setItem('pawpedia_user', JSON.stringify(currentUser));
        closeModal('authModal');
        updateNavForUser();
    }
}

window.simulateGoogleLogin = function() {
    showToast('Simulated Google Login successful!', 'info');
    currentUser = { id: 2, name: 'Google User' };
    localStorage.setItem('pawpedia_user', JSON.stringify(currentUser));
    closeModal('authModal');
    updateNavForUser();
}

function updateNavForUser() {
    if (!currentUser) {
        const stored = localStorage.getItem('pawpedia_user');
        if (stored) currentUser = JSON.parse(stored);
    }
    
    const ctas = document.querySelectorAll('.nav-cta');
    if (currentUser && ctas.length > 0) {
        ctas.forEach(cta => {
            cta.textContent = 'Dashboard';
            cta.onclick = () => window.location.href = 'dashboard.html';
        });
    }
}

document.addEventListener('DOMContentLoaded', updateNavForUser);

/* ===== AI CHATBOT LOGIC ===== */
function setupChatbot() {
    // Inject Chatbot UI into body
    const chatHTML = `
        <div class="chatbot-container" id="chatbotContainer">
            <button class="chatbot-toggle" id="chatbotToggle">
                🤖
            </button>
            <div class="chatbot-window" id="chatbotWindow">
                <div class="chat-header">
                    <span class="chat-title">PawPedia AI</span>
                    <button class="chat-close" id="chatClose">&times;</button>
                </div>
                <div class="chat-body" id="chatBody">
                    <div class="chat-bubble bot">Hi! I'm PawPedia AI. Ask me anything about animals or pet care! 🐾</div>
                </div>
                <div class="chat-input-area">
                    <input type="text" id="chatInput" placeholder="Type your question..." />
                    <button id="chatSend">➤</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatHTML);

    const toggleBtn = document.getElementById('chatbotToggle');
    const closeBtn = document.getElementById('chatClose');
    const chatWindow = document.getElementById('chatbotWindow');
    const sendBtn = document.getElementById('chatSend');
    const chatInput = document.getElementById('chatInput');
    const chatBody = document.getElementById('chatBody');

    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('active');
        if (chatWindow.classList.contains('active')) {
            chatInput.focus();
        }
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.remove('active');
    });

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Add user message
        const userMsg = document.createElement('div');
        userMsg.className = 'chat-bubble user';
        userMsg.innerText = text;
        chatBody.appendChild(userMsg);
        chatInput.value = '';
        chatBody.scrollTop = chatBody.scrollHeight;

        // Add typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'chat-bubble bot typing';
        typingIndicator.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
        chatBody.appendChild(typingIndicator);
        chatBody.scrollTop = chatBody.scrollHeight;

        try {
            const res = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            
            chatBody.removeChild(typingIndicator);
            
            const botMsg = document.createElement('div');
            botMsg.className = 'chat-bubble bot';
            // Simple markdown parsing for bold text
            let parsedReply = data.reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            botMsg.innerHTML = parsedReply;
            chatBody.appendChild(botMsg);
        } catch (error) {
            chatBody.removeChild(typingIndicator);
            const errMsg = document.createElement('div');
            errMsg.className = 'chat-bubble bot error';
            errMsg.innerText = "Sorry, I'm having trouble connecting right now.";
            chatBody.appendChild(errMsg);
        }
        
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

// Global search handler
function doSearch() {
    const el = document.getElementById('heroSearch');
    if (el && el.value.trim() !== '') {
        window.location.href = 'encyclopedia.html?q=' + encodeURIComponent(el.value.trim());
    }
}

// Auto-bind enter key to heroSearch if present
document.addEventListener('DOMContentLoaded', () => {
    const heroSearchEl = document.getElementById('heroSearch');
    if (heroSearchEl) {
        heroSearchEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                doSearch();
            }
        });
    }
});
