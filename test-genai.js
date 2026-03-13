const { GoogleGenAI, Type } = require("@google/genai");

async function run() {
  const process = require('process');
  require('dotenv').config({ path: '.env.local' });
  const aiKey = process.env.GEMINI_API_KEY;
  const client = new GoogleGenAI({ apiKey: aiKey });

  const chat = client.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      tools: [{
        functionDeclarations: [
          {
            name: "get_weather",
            description: "Get the weather",
            parameters: {
              type: "OBJECT",
              properties: {
                location: { type: "STRING" }
              }
            }
          }
        ]
      }]
    }
  });

  const res = await chat.sendMessage({ message: "What is the weather in Berlin?" });
  console.log("Function Calls:", JSON.stringify(res.functionCalls, null, 2));
}

run().catch(console.error);
