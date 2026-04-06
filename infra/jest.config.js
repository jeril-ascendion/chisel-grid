module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  setupFilesAfterSetup: ['aws-cdk-lib/testhelpers/jest-autoclean'],
  passWithNoTests: true,
};
