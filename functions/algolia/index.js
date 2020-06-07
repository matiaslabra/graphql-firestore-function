'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const isProd = functions.config().runtime.env === 'production';
const serviceAccount = functions.config().service_account;
const algoliasearch = require('algoliasearch');
const operators = require('./operators');
// const db = admin.firestore();

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://myvocab-fa620.firebaseio.com',
// });

// Set up Algolia.
// The app id and API key are coming from the cloud functions environment, as we set up in Part 1, Step 3.
const algoliaClient = algoliasearch(
  functions.config().algolia.appid,
  functions.config().algolia.apikey,
);

const collectionIndexName = isProd ? 'books_prod' : 'books_dev';
const collectionIndex = algoliaClient.initIndex(collectionIndexName);

const collectionOnCreate = functions.firestore
  .document('books/{bookId}')
  .onCreate(async (snapshot, context) => {
    await operators.save(snapshot, collectionIndex);
  });

const collectionOnUpdate = functions.firestore
  .document('books/{bookId}')
  .onUpdate(async (change, context) => {
    await operators.update(change, collectionIndex);
  });

const collectionOnDelete = functions.firestore
  .document('books/{bookId}')
  .onDelete(async (snapshot, context) => {
    await operators.delete(snapshot, collectionIndex);
  });

exports.create = collectionOnCreate;
exports.update = collectionOnUpdate;
exports.delete = collectionOnDelete;
