/**
 * MSW server setup for Node.js (test environment)
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup mock server with default handlers
export const server = setupServer(...handlers);

// Start/stop server automatically
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
