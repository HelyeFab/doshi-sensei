export const doc = jest.fn();
export const setDoc = jest.fn();
export const getDoc = jest.fn();
export const updateDoc = jest.fn();
export const deleteDoc = jest.fn();
export const collection = jest.fn();
export const query = jest.fn();
export const where = jest.fn();
export const orderBy = jest.fn();
export const limit = jest.fn();
export const getDocs = jest.fn();
export const addDoc = jest.fn();
export const serverTimestamp = jest.fn(() => new Date());
export const Timestamp = {
  now: jest.fn(() => ({ toDate: () => new Date() })),
  fromDate: jest.fn((date) => ({ toDate: () => date })),
};