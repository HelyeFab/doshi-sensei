// Add custom matchers
require('@testing-library/jest-dom');

// Mock fetch globally
global.fetch = jest.fn();

// Mock Response
global.Response = jest.fn().mockImplementation(() => ({
  ok: true,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
  status: 200,
  statusText: 'OK',
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
};

// Mock Service Worker API
global.ServiceWorkerRegistration = class ServiceWorkerRegistration {
  constructor() {
    this.scope = '/';
    this.active = null;
    this.installing = null;
    this.waiting = null;
  }
  showNotification() {
    return Promise.resolve();
  }
  update() {
    return Promise.resolve(this);
  }
  unregister() {
    return Promise.resolve(true);
  }
};

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Warning: An invalid form control') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});