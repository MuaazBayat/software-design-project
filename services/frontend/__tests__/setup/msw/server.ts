import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { moderationHandlers } from './moderation-handler';

/** Node-side MSW server for Jest */
export const server = setupServer(...handlers,  ...moderationHandlers);
