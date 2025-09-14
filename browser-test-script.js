// Browser Console Test Script for PostHog Events
// Copy and paste this into the browser console on http://localhost:3000/documentation

console.log('🚀 Starting PostHog Events Test...');

// Test 1: Check PostHog Setup
function testPostHogSetup() {
  console.log('\n📊 Testing PostHog Setup...');
  
  if (typeof window.posthog === 'undefined') {
    console.error('❌ PostHog not loaded');
    return false;
  }
  
  console.log('✅ PostHog loaded');
  console.log('   Opted in:', window.posthog.has_opted_in_capturing?.());
  console.log('   Opted out:', window.posthog.has_opted_out_capturing?.());
  
  // Test manual event
  try {
    window.posthog.capture('test_posthog_setup', { 
      test: true, 
      timestamp: new Date().toISOString() 
    });
    console.log('✅ Test event sent');
    return true;
  } catch (error) {
    console.error('❌ Error sending test event:', error);
    return false;
  }
}

// Test 2: Enable PostHog if needed
function enablePostHog() {
  console.log('\n🔧 Enabling PostHog...');
  
  // Accept cookies
  localStorage.setItem('cookieConsent', 'all');
  console.log('✅ Cookie consent set');
  
  // Opt in to tracking
  if (window.posthog?.has_opted_out_capturing?.()) {
    window.posthog.opt_in_capturing();
    console.log('✅ Opted in to tracking');
  }
  
  // Reload feature flags
  window.posthog?.reloadFeatureFlags?.();
  console.log('✅ Feature flags reloaded');
}

// Test 3: Test AI Assistant API
async function testAIAssistant() {
  console.log('\n🤖 Testing AI Assistant API...');
  
  try {
    const response = await fetch('/api/ai-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Test message from browser console',
        context: { articles: [], categories: [] },
        sessionId: `browser_test_${Date.now()}`
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log('✅ AI Assistant API responded');
    
    // Check if it's streaming
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      console.log('✅ Streaming response detected');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let chunkCount = 0;
      
      if (reader) {
        try {
          while (chunkCount < 3) { // Read first 3 chunks
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
                  console.log(`   📦 Chunk ${chunkCount}:`, data.type, data.content?.substring(0, 30) + '...');
                  
                  if (data.type === 'complete') {
                    console.log('✅ Streaming completed');
                    break;
                  }
                } catch (parseError) {
                  console.log('⚠️  Parse error:', parseError.message);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } else {
      const data = await response.json();
      console.log('✅ JSON response received');
    }
    
    return true;
  } catch (error) {
    console.error('❌ AI Assistant test failed:', error);
    return false;
  }
}

// Test 4: Monitor PostHog Events
function monitorPostHogEvents() {
  console.log('\n👀 Starting PostHog event monitoring...');
  
  if (!window.posthog?.capture) {
    console.error('❌ PostHog capture not available');
    return;
  }
  
  // Store original capture function
  const originalCapture = window.posthog.capture;
  
  // Override capture to log events
  window.posthog.capture = function(eventName, properties) {
    console.log(`📊 PostHog Event: ${eventName}`);
    console.log('   Properties:', properties);
    
    // Call original function
    return originalCapture.call(this, eventName, properties);
  };
  
  console.log('✅ Event monitoring started');
  
  // Return function to stop monitoring
  return function stopMonitoring() {
    window.posthog.capture = originalCapture;
    console.log('✅ Event monitoring stopped');
  };
}

// Test 5: Test AI Assistant UI
function testAIAssistantUI() {
  console.log('\n🎨 Testing AI Assistant UI...');
  
  // Look for AI toggle button (atom icon)
  const atomButton = document.querySelector('[data-testid="ai-toggle"], button[aria-label*="AI"], .atom-icon');
  if (atomButton) {
    console.log('✅ AI toggle button found');
    atomButton.click();
    console.log('✅ AI toggle clicked');
  } else {
    console.log('⚠️  AI toggle button not found, looking for alternative...');
    
    // Look for search input and try to find AI functionality
    const searchInput = document.querySelector('input[placeholder*="Dokumentation"], input[placeholder*="durchsuchen"]');
    if (searchInput) {
      console.log('✅ Search input found');
      // Look for atom icon near search input
      const atomIcon = searchInput.parentElement?.querySelector('svg, .lucide-atom');
      if (atomIcon) {
        console.log('✅ Atom icon found near search');
        atomIcon.click();
      }
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Running all PostHog tests...\n');
  
  // Enable PostHog first
  enablePostHog();
  
  // Wait a bit for PostHog to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const results = {
    posthogSetup: testPostHogSetup(),
    aiAssistant: await testAIAssistant(),
  };
  
  // Start monitoring
  const stopMonitoring = monitorPostHogEvents();
  
  // Test UI
  testAIAssistantUI();
  
  console.log('\n📊 Test Results:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log('\n🎯 Next steps:');
  console.log('1. Try using the AI assistant in the UI');
  console.log('2. Watch for PostHog events in the console');
  console.log('3. Check Network tab for requests to eu.i.posthog.com');
  console.log('4. Run stopMonitoring() when done testing');
  
  // Return stop function
  window.stopPostHogMonitoring = stopMonitoring;
}

// Auto-run tests
runAllTests();