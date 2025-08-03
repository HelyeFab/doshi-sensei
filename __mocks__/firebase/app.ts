export const initializeApp = jest.fn(() => ({
  name: '[DEFAULT]',
  options: {},
}));

export const getApps = jest.fn(() => [
  {
    name: '[DEFAULT]',
    options: {},
  },
]);

export const getApp = jest.fn(() => ({
  name: '[DEFAULT]',
  options: {},
}));