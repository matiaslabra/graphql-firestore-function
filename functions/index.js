'use strict';
const functions = require('firebase-functions');
const server = require('./graphql/server');
const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  credentials: true,
};
// :todo: set cors origin back;
const app = server.createHandler({
  cors: {
    origin: '*',
    credentials: false,
  },
});
// Expose Express API as a single Cloud Function:
exports.graphql = functions.https.onRequest(app);
