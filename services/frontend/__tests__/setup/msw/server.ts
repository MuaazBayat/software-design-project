import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { moderationHandlers } from './moderation-handler';
import {messagingHandlers} from './messaging-handler';
import { matchmakingHandlers } from './matchmaking-handler';
/** Node-side MSW server for Jest */
export const server = setupServer(...handlers,  ...moderationHandlers, ...messagingHandlers, ...matchmakingHandlers);
