// services/frontend/jest.setup.js

// Optional: configure or set up a testing framework before each test
// If you are using the fetch API in your components, you might want to mock it
import '@testing-library/jest-dom';
const origError = console.error;
console.error = (...args) => {
  if (/not wrapped in act/.test(String(args[0]))) return;
  return origError(...args);
};