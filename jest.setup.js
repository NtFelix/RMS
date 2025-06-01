// Extends Jest expect with custom matchers from jest-dom
require('@testing-library/jest-dom');

// Polyfill for TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill for fetch, Request, Response
require('whatwg-fetch'); // Makes fetch, Request, Response globally available

// You can add other global setups here if needed
// For example, mocking global objects:
// global.matchMedia = global.matchMedia || function() {
//   return {
//     matches : false,
//     addListener : function() {},
//     removeListener: function() {}
//   }
// }
