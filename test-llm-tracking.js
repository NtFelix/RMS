// Browser Console Test Script for PostHog LLM Tracking
// Copy and paste this into the browser console on http://localhost:3000/documentation

console.log('🚀 Testing PostHog LLM Tracking...');

// Override PostHog capture to monitor LLM events
let llmEvents = [];
let originalCapture;

function startLLMEventMonitoring() {
  console.log('📊 Starting LLM event monitoring...');
  
  if (!window.posthog?.capture) {
    console.error('❌ PostHog not available');
    return;
  }
  
  originalCapture = window.posthog.capture;
  
  window.posthog.capture = function(eventName, properties) {
    // Log all events but highlight LLM events
    if (eventName.startsWith('$ai_') || eventName.includes('ai_') || eventName.includes('llm')) {
      console.log(`🤖 LLM Event: ${eventName}`);
      console.log('   Properties:', properties);
      llmEvents.push({ event: eventName, properties, timestamp: new Date() });
    } else {
      console.log(`📊 Event: ${eventName}`);
    }
    
    return originalCapture.call(this, eventName, properties);
  };
  
  console.log('✅ LLM event monitoring started');
}

function stopLLMEventMonitoring() {
  if (originalCapture && window.posthog) {
    window.posthog.capture = originalCapture;
    console.log('✅ LLM event monitoring stopped');
  }
}

function showLLMEventsSummary() {
  console.log('\n📈 LLM Events Summary:');
  console.log('======================');
  
  if (llmEvents.length === 0) {
    console.log('❌ No LLM events captured');
    return;
  }
  
  const eventTypes = {};
  llmEvents.forEach(event => {
    eventTypes[event.event] = (eventTypes[event.event] || 0) + 1;
  });
  
  Object.entries(eventTypes).forEach(([event, count]) => {
    console.log(`✅ ${event}: ${count} events`);
  });
  
  console.log(`\n📊 Total LLM events: ${llmEvents.length}`);
  
  // Show recent events
  console.log('\n🕒 Recent LLM events:');
  llmEvents.slice(-5).forEach((event, index) => {
    console.log(`${index + 1}. ${event.event} at ${event.timestamp.toLocaleTimeString()}`);
  });
}

async function testAIAssistantLLMTracking() {
  console.log('\n🤖 Testing AI Assistant LLM Tracking...');
  
  // Start monitoring
  startLLMEventMonitoring();
  
  // Enable PostHog if needed
  localStorage.setItem('cookieConsent', 'all');
  if (window.posthog?.has_opted_out_capturing?.()) {
    window.posthog.opt_in_capturing();
  }
  
  console.log('✅ PostHog enabled for tracking');
  
  // Test the AI Assistant API directly
  try {
    const response = await fetch('/api/ai-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test LLM tracking: What is Mietfluss?',
        context: { 
          articles: [
            { id: '1', titel: 'Test Article', kategorie: 'Test', seiteninhalt: 'Test content' }
          ],
          categories: [
            { name: 'Test Category', articleCount: 1 }
          ]
        },
        sessionId: `llm_test_${Date.now()}`
      }),
    });
    
    if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
      console.log('✅ AI Assistant API responded with streaming');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;
      
      if (reader) {
        try {
          while (chunkCount < 5) { // Read first 5 chunks
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonStr = line.slice(6);
                  if (jsonStr.trim() === '') continue;
                  
                  const data = JSON.parse(jsonStr);
                  chunkCount++;
                  
                  if (data.type === 'chunk') {
                    console.log(`   📦 Chunk ${chunkCount}: "${data.content?.substring(0, 30)}..."`);
                  } else if (data.type === 'complete') {
                    console.log('✅ Streaming completed');
                    break;
                  }
                } catch (parseError) {
                  // Expected for incomplete chunks
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
      
      // Wait a bit for events to be processed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('\n📊 LLM Events captured during API test:');
      showLLMEventsSummary();
      
    } else {
      console.log('❌ AI Assistant API failed or not streaming');
    }
    
  } catch (error) {
    console.error('❌ Error testing AI Assistant:', error);
  }
}

function testLLMTrackingDirectly() {
  console.log('\n🧪 Testing LLM tracking functions directly...');
  
  // Test if LLM tracking module is available
  if (typeof window.startAIGeneration === 'undefined') {
    console.log('⚠️  LLM tracking functions not available in global scope');
    console.log('   This is expected - they are imported in components');
  }
  
  // Test manual LLM event
  if (window.posthog?.capture) {
    console.log('📊 Sending test LLM generation event...');
    
    window.posthog.capture('$ai_generation', {
      $ai_generation_id: `test_gen_${Date.now()}`,
      $ai_generation_model: 'test-model',
      $ai_generation_input: 'Test input for LLM tracking',
      $ai_generation_output: 'Test output from LLM',
      $ai_generation_start_time: new Date().toISOString(),
      $ai_generation_end_time: new Date().toISOString(),
      $ai_generation_level: 'INFO',
      $ai_session_id: `test_session_${Date.now()}`,
      application: 'mietfluss',
      feature: 'llm_tracking_test'
    });
    
    console.log('✅ Test LLM generation event sent');
  }
}

// Instructions
console.log('\n📋 LLM Tracking Test Instructions:');
console.log('==================================');
console.log('1. Run testAIAssistantLLMTracking() to test the full flow');
console.log('2. Run testLLMTrackingDirectly() to test manual events');
console.log('3. Run showLLMEventsSummary() to see captured events');
console.log('4. Run stopLLMEventMonitoring() when done');
console.log('\n🎯 Expected LLM events:');
console.log('- $ai_generation (start and completion)');
console.log('- $ai_trace (conversation tracking)');
console.log('- $ai_generation_chunk (streaming updates)');

// Auto-start monitoring
startLLMEventMonitoring();

// Make functions available globally
window.testAIAssistantLLMTracking = testAIAssistantLLMTracking;
window.testLLMTrackingDirectly = testLLMTrackingDirectly;
window.showLLMEventsSummary = showLLMEventsSummary;
window.stopLLMEventMonitoring = stopLLMEventMonitoring;

console.log('\n✅ LLM tracking test ready! Try: testAIAssistantLLMTracking()');