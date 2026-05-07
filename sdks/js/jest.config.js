module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  testMatch: ['**/tests/**/*.test.[jt]s'],
  moduleFileExtensions: ['ts', 'js', 'json']
};
