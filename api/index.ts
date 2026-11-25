// Vercel Serverless Function entry: every /api/* request is rewritten here (see vercel.json)
// and handled by the same Express app used in local development.
import { createApp } from '../server/index.js';

const app = createApp();

export default app;
