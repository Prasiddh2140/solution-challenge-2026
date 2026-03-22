/**
 * SmartNGO ChatBot Widget
 * A persistent, context-aware floating chat assistant.
 */

const CHATBOT_HTML = `
<div id="smartngo-chatbot-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; font-family: sans-serif;">
    <!-- Floating Toggle Button -->
    <button id="chatbot-toggle" style="width: 65px; height: 65px; border-radius: 20px; background: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef); color: white; border: none; cursor: pointer; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4); display: flex; align-items: center; justify-content: center; font-size: 28px; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); outline: none; position: relative; overflow: hidden;">
        <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(255,255,255,0.2), transparent); opacity: 0.5;"></div>
        <i class="fa-solid fa-comment-dots" id="chatbot-icon" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"></i>
        <div id="chatbot-pulse" style="position: absolute; inset: 0; border-radius: 20px; border: 2px solid #8b5cf6; animation: pulse-border 2s infinite;"></div>
    </button>

    <!-- Chat Window -->
    <div id="chatbot-window" style="position: absolute; bottom: 80px; right: 0; width: 350px; height: 500px; background: white; border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); display: none; flex-direction: column; overflow: hidden; border: 1px solid rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(to right, #8a2be2, #4b0082); padding: 15px 20px; color: white; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-weight: bold; display: flex; items-center: center; gap: 8px;">
                <i class="fa-solid fa-sparkles"></i>
                SmartNGO AI
            </div>
            <button id="chatbot-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        
        <div id="chatbot-messages" style="flex: 1; padding: 15px; overflow-y: auto; background: #f8f9fa; display: flex; flex-direction: column; gap: 10px;">
            <div style="background: rgba(138, 43, 226, 0.1); padding: 12px 18px; border-radius: 18px 18px 18px 5px; font-size: 13px; color: #4b0082; max-width: 90%; border: 1px solid rgba(138, 43, 226, 0.2); box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                <div style="font-weight: bold; margin-bottom: 5px; display: flex; items-center: center; gap: 5px;">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Sentinel Analysis
                </div>
                I'm active on the <b>${document.title}</b> page. Would you like me to analyze what's here or guide you elsewhere?
                <div style="margin-top: 10px; display: flex; gap: 5px;">
                    <button id="chatbot-analyze-btn" style="background: #8a2be2; color: white; border: none; padding: 5px 12px; border-radius: 20px; font-size: 11px; cursor: pointer; font-weight: bold; transition: all 0.2s;">Analyze This Page</button>
                    <button id="chatbot-guide-btn" style="background: white; color: #8a2be2; border: 1px solid #8a2be2; padding: 5px 12px; border-radius: 20px; font-size: 11px; cursor: pointer; font-weight: bold; transition: all 0.2s;">Guide Me</button>
                </div>
            </div>
        </div>

        <div style="padding: 15px; border-top: 1px solid #eee; display: flex; gap: 8px; background: white;">
            <input type="text" id="chatbot-input" placeholder="Ask me anything..." style="flex: 1; border: 1px solid #ddd; border-radius: 25px; padding: 10px 15px; font-size: 13px; outline: none;">
            <button id="chatbot-send" style="background: #8a2be2; color: white; border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer;"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
<style>
    @keyframes pulse-border {
        0% { transform: scale(1); opacity: 0.8; }
        100% { transform: scale(1.4); opacity: 0; }
    }
    #chatbot-toggle:hover {
        transform: translateY(-5px) scale(1.05);
        box-shadow: 0 15px 35px rgba(99, 102, 241, 0.5);
    }
    #chatbot-toggle:active {
        transform: scale(0.95);
    }
</style>
`;

function initChatbot() {
    // Check if FontAwesome is loaded, if not, add it
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fa);
    }

    // Inject Widget
    const container = document.createElement('div');
    container.innerHTML = CHATBOT_HTML;
    document.body.appendChild(container);

    const toggle = document.getElementById('chatbot-toggle');
    const window = document.getElementById('chatbot-window');
    const close = document.getElementById('chatbot-close');
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');
    const messages = document.getElementById('chatbot-messages');
    const icon = document.getElementById('chatbot-icon');

    let chatHistory = [];

    toggle.onclick = () => {
        const isHidden = window.style.display === 'none';
        window.style.display = isHidden ? 'flex' : 'none';
        toggle.style.transform = isHidden ? 'scale(0.9) rotate(5deg)' : 'scale(1)';
        if (isHidden) input.focus();
    };

    close.onclick = () => {
        window.style.display = 'none';
        toggle.style.transform = 'scale(1)';
    };

    async function sendMessage() {
        const text = input.value.trim();
        if (!text) return;

        // Add user message to UI
        appendMessage('user', text);
        input.value = '';

        // Capture Page Context ("Monitoring the screen")
        const { db, auth } = await import('./app.js');
        const userDoc = auth.currentUser ? await (await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js")).getDoc((await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js")).doc(db, 'users', auth.currentUser.uid)) : null;
        const userRole = userDoc?.data()?.role || 'guest';

        const pageContext = `
            Page Title: ${document.title}
            URL Path: ${window.location.pathname}
            User Role: ${userRole}
            Current Viewport Text Summary: ${document.body.innerText.substring(0, 3000).replace(/\s+/g, ' ')}
            Active Data: ${JSON.stringify({
                isNgoDashboard: !!document.getElementById('stat-total'),
                stats: {
                    total: document.getElementById('stat-total')?.textContent,
                    mapped: document.getElementById('stat-assigned')?.textContent,
                    remaining: document.getElementById('stat-remaining')?.textContent
                }
            })}
        `;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: chatHistory,
                    pageContext: pageContext
                })
            });

            const data = await response.json();
            appendMessage('ai', data.text);
            chatHistory.push({ role: 'user', text: text });
            chatHistory.push({ role: 'ai', text: data.text });
            
            // Limit history
            if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

        } catch (err) {
            appendMessage('ai', "Sorry, I'm having trouble connecting to the brain center.");
        }
    }

    function appendMessage(role, text) {
        const msgDiv = document.createElement('div');
        const isUser = role === 'user';
        msgDiv.style.cssText = `
            padding: 10px 15px;
            border-radius: ${isUser ? '15px 15px 5px 15px' : '15px 15px 15px 5px'};
            font-size: 13px;
            max-width: 85%;
            margin-bottom: 5px;
            align-self: ${isUser ? 'flex-end' : 'flex-start'};
            background: ${isUser ? '#8a2be2' : 'white'};
            color: ${isUser ? 'white' : '#333'};
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            border: ${isUser ? 'none' : '1px solid #eee'};
        `;
        msgDiv.textContent = text;
        messages.appendChild(msgDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    sendBtn.onclick = sendMessage;
    input.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };

    // Proactive Buttons Listener
    messages.addEventListener('click', (e) => {
        if (e.target.id === 'chatbot-analyze-btn') {
            input.value = "Analyze this page for me and tell me what I can do here.";
            sendMessage();
            e.target.parentElement.style.display = 'none';
        } else if (e.target.id === 'chatbot-guide-btn') {
            input.value = "Guide me through the platform features and where to go.";
            sendMessage();
            e.target.parentElement.style.display = 'none';
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
} else {
    initChatbot();
}
