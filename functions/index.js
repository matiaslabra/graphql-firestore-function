'use strict';
require('dotenv').config({ path: '../.env' });
const functions = require('firebase-functions');
const server = require('./graphql/server');
const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  credentials: true,
};

const app = server.createHandler({
  cors: corsOptions,
});
// Expose Express API as a single Cloud Function:
exports.graphql = functions.https.onRequest(app);
