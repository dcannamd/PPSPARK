// server.js - Final Working Version
require('dotenv').config(); // Load environment variables

const express = require('express');
const path = require('path');
const { HNSWLib } = require("@langchain/community/vectorstores/hnswlib");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");
const { callBridgeBuddy, resetHistory } = require('./rag-tutor.js');

// --- CONFIG ---
const VECTOR_STORE_PATH = path.join(__dirname, 'vector_store');
const API_KEY = process.env.GOOGLE_API_KEY; 
// -------------

const app = express();
const port = 3000;
let vectorStore; 

async function initializeVectorStore() {
  try {
    console.log("⏳ Loading Knowledge Base...");

    // 👇 THIS IS THE CRITICAL MISSING PIECE 👇
    const embeddings = new GoogleGenerativeAIEmbeddings({ 
      model: "gemini-embedding-001",     // Matches your build-kb.js
      modelName: "gemini-embedding-001", // Extra safety
      apiKey: API_KEY 
    });

    vectorStore = await HNSWLib.load(VECTOR_STORE_PATH, embeddings);
    console.log('✅ Knowledge Base READY.');
  } catch (error) {
    console.error('❌ FATAL: Vector Store load failed. Run "node build-kb.js" first.');
    console.error(error.message);
  }
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 1. The Chat Endpoint
app.post('/ask-buddy', async (req, res) => {
  console.log("------------------------------------------------");
  console.log("🔔 Incoming Request received!"); 

  try {
    const userPrompt = req.body.prompt;
    console.log(`👤 User Prompt: "${userPrompt}"`);
    
    if (!vectorStore) {
        console.warn("⚠️ WARNING: Vector Store is NULL. Searching is disabled.");
    } else {
        console.log("🧠 Brain is Active. Searching...");
    }

    let context = "";
    if (vectorStore) {
      // Search with a limit of 6
      const results = await vectorStore.similaritySearch(userPrompt, 6);
      
      console.log(`📚 Found ${results.length} relevant chunks.`);
      
      results.forEach((r, i) => console.log(`   ${i+1}. [${r.metadata.type}] ${r.metadata.title}`));

      context = results.map(doc => `
        [RESOURCE TITLE]: ${doc.metadata.title}
        [CLASSIFICATION]: ${doc.metadata.classification}
        [TYPE]: ${doc.metadata.type}
        [SOURCE]: ${doc.metadata.source}
        CONTENT:
        ${doc.pageContent}
      `).join('\n\n----------------\n\n');
    }

    console.log("🤖 Asking Gemini...");
    const buddyResponse = await callBridgeBuddy(userPrompt, context);
    
    console.log("✅ Response sent to browser.");
    res.json({ response: buddyResponse });

  } catch (error) {
    console.error("❌ PROCESSING ERROR:", error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

// 2. The Reset Endpoint
app.post('/reset-chat', (req, res) => {
    resetHistory(); 
    console.log("🧹 Memory Cleared request received.");
    res.json({ status: "Memory Cleared" });
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
  initializeVectorStore();
});