'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const isProd = functions.config().runtime.env === 'production';
const serviceAccount = functions.config().service_account;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://myvocab-fa620.firebaseio.com',
});

const server = require('./graphql/server');
const corsOptions = {
  origin: isProd ? 'https://myvocab-fa620.web.app/' : 'http://localhost:3000',
  credentials: true,
};
// :todo: set cors origin back;
const app = server.createHandler({
  cors: corsOptions,
});
// Expose Express API as a single Cloud Function:
exports.graphql = functions.https.onRequest(app);
