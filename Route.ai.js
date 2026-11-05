

const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatArea = document.getElementById("chatArea");
const sendButton = document.getElementById("sendButton");
const chatHistory = document.getElementById("chatHistory");

const API_URL = "http://127.0.0.1:8000";

let conversations = JSON.parse(
    localStorage.getItem("routeAI_conversations") || "[]"
);

let sessionId =
    localStorage.getItem("routeAI_currentSession") ||
    crypto.randomUUID();

function saveConversations() {
    localStorage.setItem(
        "routeAI_conversations",
        JSON.stringify(conversations)
    );
    localStorage.setItem("routeAI_currentSession", sessionId);
}

function addConversation(id, title) {
    if (!conversations.some(chat => chat.id === id)) {
        conversations.unshift({ id, title });
    }

    saveConversations();
    renderHistory();
}

function renderHistory() {
    if (!chatHistory) return;

    chatHistory.innerHTML = "";

    conversations.forEach(conversation => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "history-item";
        button.textContent = conversation.title;
        button.title = conversation.title;

        if (conversation.id === sessionId) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            loadConversation(conversation.id);
        });

        chatHistory.appendChild(button);
    });
}

function addMessage(sender, message) {
    const element = document.createElement("div");

    element.style.maxWidth = "750px";
    element.style.width = "100%";
    element.style.boxSizing = "border-box";
    element.style.padding = "15px";
    element.style.margin = "15px auto";
    element.style.borderRadius = "12px";
    element.style.whiteSpace = "pre-wrap";
    element.style.lineHeight = "1.6";

    if (sender === "You") {
        element.style.backgroundColor = "#f0f0f0";
    }

    element.textContent = `${sender}: ${message}`;
    chatArea.appendChild(element);
    chatArea.scrollTop = chatArea.scrollHeight;

    return element;
}

async function loadConversation(id) {
    sessionId = id;
    saveConversations();
    renderHistory();

    const title = document.getElementById("chatTitle");
    const selected = conversations.find(chat => chat.id === id);

    if (title) {
        title.textContent = selected?.title || "Chat";
    }

    chatArea.innerHTML = "<p>Loading chat history...</p>";

    try {
        const response = await fetch(
            `${API_URL}/chat-history/${encodeURIComponent(id)}`
        );

        if (!response.ok) {
            throw new Error("Failed to load chat history");
        }

        const data = await response.json();
        chatArea.innerHTML = "";

        if (!data.messages || data.messages.length === 0) {
            addMessage("Route.AI", "No messages in this conversation yet.");
            return;
        }

        data.messages.forEach(item => {
            addMessage("You", item.user_message);
            addMessage("Route.AI", item.ai_response);
        });
    } catch (error) {
        chatArea.innerHTML = "";
        addMessage("Route.AI", "Could not load history: " + error.message);
        console.error(error);
    }
}

chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const message = userInput.value.trim();
    if (!message) return;

    if (sendButton) sendButton.disabled = true;

    addMessage("You", message);
    userInput.value = "";

    const loadingMessage = addMessage("Route.AI", "Thinking...");

    try {
        const response = await fetch(`${API_URL}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                message: message
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Chat request failed");
        }

        loadingMessage.textContent = `Route.AI: ${data.reply}`;

        const existing = conversations.find(chat => chat.id === sessionId);

        if (!existing) {
            addConversation(sessionId, message.slice(0, 35));
        } else {
            renderHistory();
        }
    } catch (error) {
        loadingMessage.textContent = "Error: " + error.message;
        console.error("Route.AI API error:", error);
    } finally {
        if (sendButton) sendButton.disabled = false;
        userInput.focus();
    }
});

function setPrompt(prompt) {
    userInput.value = prompt;
    userInput.focus();
}

function newChat() {
    sessionId = crypto.randomUUID();
    saveConversations();

    const title = document.getElementById("chatTitle");
    if (title) title.textContent = "New Chat";

    chatArea.innerHTML = `
        <div class="welcome">
            <h1>Welcome to Route.AI</h1>
            <h2>How can I help you today?</h2>
            <p>Ask a question or plan your journey.</p>
        </div>
    `;

    userInput.value = "";
    renderHistory();
    userInput.focus();
}

function showMessage(section) {
    setPrompt(section);
}

renderHistory();
loadConversation(sessionId);
