import '@testing-library/jest-dom';

// Suppress React act() warnings in test output
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock window.URL.createObjectURL used by CSV export helpers
global.URL.createObjectURL = vi.fn(() => 'blob:mock');
global.URL.revokeObjectURL = vi.fn();
