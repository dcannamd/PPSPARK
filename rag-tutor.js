// rag-tutor.js
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Use the key from .env
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// ✅ MATCHING YOUR WORKING APP
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: {
        parts: [{ text: `You are Bridge Buddy (*SPARK)... [Keep your system prompt here]` }]
    }
});

let chatSession = null;

async function callBridgeBuddy(prompt, context) {
  try {
    if (!chatSession) {
        chatSession = model.startChat({ history: [] });
    }

    const fullPrompt = `
    CONTEXT:
    ${context}
    
    QUESTION:
    ${prompt}
    `;

    const result = await chatSession.sendMessage(fullPrompt);
    return result.response.text();

  } catch (error) {
    console.error("❌ AI Interaction Error:", error);
    return "I'm having trouble connecting to the AI model right now.";
  }
}

function resetHistory() {
    chatSession = null;
    console.log("🧹 Chat History Wiped.");
}

module.exports = { callBridgeBuddy, resetHistory };