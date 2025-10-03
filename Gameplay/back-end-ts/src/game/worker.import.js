// worker.import.js
const path = require('path');
const { parentPort } = require('worker_threads');

try {
  require('ts-node').register({ /* project: path.resolve(__dirname, '../../tsconfig.json') */transpileOnly: true });
  require(path.resolve(__dirname, './server_worker.ts'));
} catch (err) {
  const msg = {
    __error: true,
    name: err && err.name,
    message: err && err.message,
    stack: err && err.stack,
  };
  try { parentPort?.postMessage(msg); } catch (e) { }
  console.error('ts-node register failed:', err);
  throw err;
}