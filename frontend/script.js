const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const suggestionsBox = document.getElementById('suggestions');
const welcomeMessage = document.getElementById('welcome-message');

let suggestionSelected = false;
let messageSent = false;
let botIsTyping = false;

let suggestions = [];
let conversationId = localStorage.getItem('conversationId');

// Hàm tải các gợi ý từ file cấu hình
async function loadSuggestions() {
    try {
        const response = await fetch('../config.json');
        const data = await response.json();
        suggestions = data.suggestions;
        renderSuggestions();
    } catch (error) {
        console.error('Error loading suggestions:', error);
    }
}

// Hàm render các gợi ý
function renderSuggestions() {
    if (!suggestionsBox) return;

    suggestionsBox.innerHTML = ''; 

    suggestions.forEach(suggestion => {
        const button = document.createElement('button');
        button.classList.add('suggestion-btn');
        
        const icon = document.createElement('i');
        icon.classList.add(...suggestion.icon.split(' '));

        button.appendChild(icon);
        button.appendChild(document.createTextNode(suggestion.label));

        button.addEventListener('click', () => {
            const randomMessage = getRandomMessage(suggestion.messages);
            addMessageToChat(randomMessage, 'user');

            suggestionSelected = true;
            messageSent = true;

            if (suggestionsBox) {
                suggestionsBox.style.display = 'none';
            }

            sendMessageToAI(randomMessage);
        });

        suggestionsBox.appendChild(button);
    });
}

// Hàm chọn ngẫu nhiên một tin nhắn từ danh sách
function getRandomMessage(messages) {
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
}

// Hàm thêm tin nhắn vào chat
function addMessageToChat(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message');
    
    if (sender === 'user') {
        messageDiv.classList.add('user-message');
        messageDiv.textContent = message;
    } else if (sender === 'ai') {
        messageDiv.classList.add('ai-message');

        if (isCodeMessage(message)) {
            messageDiv.classList.add('code-message');
            message = formatCodeMessage(message);
        } else {
            message = message.replace(/\n/g, '%BR%');
        }

        typeMessage(messageDiv, message, () => {
            botIsTyping = false;
        });
    }

    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    if (welcomeMessage && chatBox.childElementCount > 1) {
        welcomeMessage.style.display = 'none';
    }
}

// Hàm kiểm tra nếu tin nhắn có chứa mã
function isCodeMessage(message) {
    return message.includes('```');
}

// Hàm định dạng mã, loại bỏ dấu ``` và làm nổi bật đoạn mã
function formatCodeMessage(message) {
    const codeContent = message.replace(/```/g, '').trim();
    return codeContent;
}

// Hàm gõ tin nhắn
function typeMessage(messageDiv, message, onComplete) {
    let index = 0;
    const typingSpeed = 5;

    messageDiv.innerHTML = '';

    const interval = setInterval(() => {
        const currentChar = message[index];

        if (currentChar === '%') {
            messageDiv.innerHTML += '<br>';
            index += 4;
        } else {
            messageDiv.innerHTML += currentChar;
            index++;
        }

        if (index === message.length) {
            clearInterval(interval);
            onComplete();
        }
    }, typingSpeed);
}

// Lắng nghe sự kiện click vào nút gửi
sendBtn.addEventListener('click', async () => {
    const prompt = userInput.value;
    if (prompt.trim() === '' || botIsTyping) return;

    addMessageToChat(prompt, 'user');
    userInput.value = '';

    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('typing-indicator');
    chatBox.appendChild(typingIndicator);

    chatBox.scrollTop = chatBox.scrollHeight;

    if (suggestionsBox) {
        suggestionsBox.style.display = 'none';
    }

    messageSent = true;
    botIsTyping = true;

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt, conversationId }) 
        });
        const data = await response.json();

        if (data.conversationId && !conversationId) {
            conversationId = data.conversationId;
            localStorage.setItem('conversationId', conversationId);
        }

        const aiMessage = data.text;

        chatBox.removeChild(typingIndicator);
        addMessageToChat(aiMessage, 'ai');

    } catch (error) {
        console.error('Error generating AI response:', error);
        botIsTyping = false;
    }
});

// Các sự kiện khác để kiểm soát giao diện
userInput.addEventListener('focus', () => {
    if (!suggestionSelected && !messageSent && userInput.value.trim() === '') {
        if (suggestionsBox) {
            suggestionsBox.style.display = 'flex';
        }
    } else {
        suggestionSelected = false;
        messageSent = false;
        if (suggestionsBox) {
            suggestionsBox.style.display = 'none';
        }
    }
});

userInput.addEventListener('input', function() {
    sendBtn.style.display = userInput.value.trim() === "" ? 'none' : 'inline-block';
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendBtn.click();
    }
});

// Tải gợi ý ban đầu
loadSuggestions();
