import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Node-side MSW server for Jest */
export const server = setupServer(...handlers);
