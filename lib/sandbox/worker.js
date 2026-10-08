const { parentPort, workerData } = require('worker_threads');
const vm = require('vm');

try {
  const { code, context } = workerData;

  // Create a safe restricted sandbox for code execution
  const sandbox = {
    console: {
      log: (...args) => {},
      error: (...args) => {},
      warn: (...args) => {},
      info: (...args) => {},
    },
    context: {
      ...context,
      tempDir: `/tmp/agent-${context.runId}`,
    },
    setTimeout,
    clearTimeout,
    Buffer,
    // Provide standard safe JS objects
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    JSON,
    Math,
    RegExp,
    Error,
    Promise,
  };

  // Harden prototype chains to prevent standard constructor escapes
  Object.freeze(Object.prototype);
  Object.freeze(Array.prototype);

  vm.createContext(sandbox);

  // Execute custom code in the VM
  const result = vm.runInContext(code, sandbox, {
    timeout: workerData.timeout || 30000,
  });

  // Handle both sync and async results
  Promise.resolve(result)
    .then((resolvedResult) => {
      parentPort.postMessage({ result: resolvedResult });
    })
    .catch((err) => {
      parentPort.postMessage({ error: err.message });
    });
} catch (err) {
  parentPort.postMessage({ error: err.message });
}
