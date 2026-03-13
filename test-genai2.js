const { GoogleGenAI } = require("@google/genai");

async function run() {
  const process = require('process');
  require('dotenv').config({ path: '.env.local' });
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const chat = client.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      tools: [{
        functionDeclarations: [
          {
            name: "get_weather",
            description: "Get the weather",
            parameters: { type: "OBJECT", properties: { location: { type: "STRING" } } }
          }
        ]
      }]
    }
  });

  let res = await chat.sendMessage({ message: "What is the weather in Berlin?" });
  console.log("Function Calls:", JSON.stringify(res.functionCalls, null, 2));

  if (res.functionCalls) {
    // try different formats
    try {
      res = await chat.sendMessage(res.functionCalls.map(c => ({
        functionResponse: {
          name: c.name,
          id: c.id,
          response: { weather: "Sunny, 25C" }
        }
      })));
      console.log("Final reply:", res.text);
    } catch (e) {
      console.error("ERROR Details:", e.message);
    }
  }
}

run().catch(e => console.error("Global Error:", e.message));
