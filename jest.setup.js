// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Add fetch polyfill for Node.js environment (Firebase auth needs this)
import 'cross-fetch/polyfill'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  },
  db: {},
  storage: {},
}))

// Mock Firebase Admin
jest.mock('@/lib/firebase-admin', () => ({
  adminAuth: {},
  adminDb: {},
}))

// Mock the 'idb' library completely
jest.mock('idb', () => ({
  openDB: jest.fn(() => {
    const mockStore = new Map()
    const mockIndexes = new Map()
    
    const mockObjectStore = {
      get: jest.fn((key) => Promise.resolve(mockStore.get(key))),
      put: jest.fn((value, key) => {
        if (typeof value === 'object' && value.progressId) {
          mockStore.set(value.progressId, value)
        } else {
          mockStore.set(key || value.id, value)
        }
        return Promise.resolve(key || value.id)
      }),
      delete: jest.fn((key) => {
        mockStore.delete(key)
        return Promise.resolve()
      }),
      getAll: jest.fn(() => Promise.resolve(Array.from(mockStore.values()))),
      getAllKeys: jest.fn(() => Promise.resolve(Array.from(mockStore.keys()))),
      count: jest.fn(() => Promise.resolve(mockStore.size)),
      clear: jest.fn(() => {
        mockStore.clear()
        return Promise.resolve()
      }),
      add: jest.fn((value) => {
        const key = value.id || Date.now().toString()
        mockStore.set(key, value)
        return Promise.resolve(key)
      }),
      index: jest.fn((indexName) => ({
        get: jest.fn((key) => {
          // Simple mock - find first item matching the index
          const values = Array.from(mockStore.values())
          return Promise.resolve(values.find(v => v[indexName] === key))
        }),
        getAll: jest.fn((key) => {
          if (!key) return Promise.resolve(Array.from(mockStore.values()))
          const values = Array.from(mockStore.values())
          return Promise.resolve(values.filter(v => v[indexName] === key))
        }),
        getAllKeys: jest.fn((key) => {
          if (!key) return Promise.resolve(Array.from(mockStore.keys()))
          const values = Array.from(mockStore.values())
          const filtered = values.filter(v => v[indexName] === key)
          return Promise.resolve(filtered.map(v => v.progressId || v.id))
        }),
        count: jest.fn((key) => {
          if (!key) return Promise.resolve(mockStore.size)
          const values = Array.from(mockStore.values())
          return Promise.resolve(values.filter(v => v[indexName] === key).length)
        })
      }))
    }

    const mockTransaction = {
      store: mockObjectStore,
      objectStore: jest.fn((storeName) => mockObjectStore),
      done: Promise.resolve()
    }

    const mockDB = {
      get: jest.fn((storeName, key) => mockObjectStore.get(key)),
      put: jest.fn((storeName, value, key) => mockObjectStore.put(value, key)),
      delete: jest.fn((storeName, key) => mockObjectStore.delete(key)),
      transaction: jest.fn((storeNames, mode) => mockTransaction),
      close: jest.fn(),
      objectStoreNames: {
        contains: jest.fn(() => true)
      }
    }

    return Promise.resolve(mockDB)
  })
}))

// Basic IndexedDB globals for compatibility
global.IDBKeyRange = {
  bound: jest.fn(),
  lowerBound: jest.fn(), 
  upperBound: jest.fn(),
  only: jest.fn()
}

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
})

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock localStorage
const localStorageMock = (() => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Suppress console errors in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  sessionStorageMock.clear()
  localStorageMock.clear()
})