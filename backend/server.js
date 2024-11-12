const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 7777;

const API_KEYS = [
    'AIzaSyDfyni3DAsiDasXwzpPCuvnYFNsC5H2kTw',
    'AIzaSyDSFQTodWCEVU6GI8LBxczmviEPdWlnoao',
    'AIzaSyAGF9sxNoeFonDokV6h9D4qGbJCGitAM0Y',
    'AIzaSyDYUeSj9-8n1S0j239-QHZrZYF_r_EdZDM'
];

let currentAPIIndex = 0;
const conversationFilePath = path.join(__dirname, 'database', 'conversations.json');

let model;
const createAPIConnection = (apiKey) => {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
};

const switchAPIKey = () => {
    currentAPIIndex = (currentAPIIndex + 1) % API_KEYS.length;
    model = createAPIConnection(API_KEYS[currentAPIIndex]);
};

model = createAPIConnection(API_KEYS[currentAPIIndex]);

// Hàm đọc và ghi file
const readConversations = () => {
    if (!fs.existsSync(conversationFilePath)) {
        return {};
    }
    const data = fs.readFileSync(conversationFilePath, 'utf8');
    try {
        return JSON.parse(data);
    } catch (error) {
        console.error("Error parsing JSON data:", error);
        return {};
    }
};

const writeConversations = (conversations) => {
    fs.writeFileSync(conversationFilePath, JSON.stringify(conversations, null, 2), 'utf8');
};

app.use(express.json());
app.use(express.static('frontend'));

app.post('/generate', async (req, res) => {
    const { prompt, conversationId } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    let conversations = readConversations();
    let currentConversationId = conversationId || Date.now().toString();

    // Nếu conversationId không tồn tại trong dữ liệu, tạo mới
    if (!conversations[currentConversationId]) {
        conversations[currentConversationId] = {
            conversationId: currentConversationId,
            messages: []
        };
    }

    // Tạo ngữ cảnh từ các tin nhắn trước đó
    let context = conversations[currentConversationId].messages
        .map(msg => `${msg.sender}: ${msg.message}`)
        .join('\n');

    const promptForAI = `
        You are a highly skilled software engineer named "AI-Craft" created by "Kenji Akira( Ngọc Từ )". 
        Your main task is to assist with programming tasks, solve coding problems, and explain technical concepts. 
        Previous conversation context:
        ${context}
        
        Task: ${prompt}
    `;

    try {
        const result = await model.generateContent(promptForAI);
        const aiResponse = result.response.text();

        // Cập nhật hội thoại với tin nhắn mới
        conversations[currentConversationId].messages.push({ sender: 'user', message: prompt });
        conversations[currentConversationId].messages.push({ sender: 'ai', message: aiResponse });

        // Ghi lại toàn bộ hội thoại vào file
        writeConversations(conversations);

        // Trả về phản hồi kèm conversationId để frontend lưu
        res.json({ text: aiResponse, conversationId: currentConversationId });
    } catch (error) {
        console.error(`Error with API key ${API_KEYS[currentAPIIndex]}: ${error.message}`);
        switchAPIKey();
        
        // Thử lại yêu cầu với API key mới nếu còn
        if (currentAPIIndex < API_KEYS.length - 1) {
            return res.status(500).json({ error: 'All API attempts failed' });
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}/index.html`);
});

module.exports = app;