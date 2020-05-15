// Provide resolver functions for your schema fields
const admin = require('firebase-admin');
const serviceAccount = require('./../key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DB_HOST,
});

const db = admin.firestore();
const resolvers = {
  Query: {
    // allWords: () =>
    //   db
    //     .collection('words')
    //     .get()
    //     .then((snap) => {
    //       // if (snap.empty) return;
    //       return snap.docs.map((word) => word.data());
    //     }),
    user: async (_, { id }) => {
      const snap = await db.collection('users').doc(id).get();
      const data = snap.data();
      data.id = snap.id;
      return data;
    },
    book: async (_, { id }) => {
      const snap = await db.collection('books').doc(id).get();
      const data = snap.data();
      data.id = snap.id;
      return data;
    },
    list: async (_, { id }) => {
      const snap = await db.collection('lists').doc(id).get();
      const data = snap.data();
      data.id = snap.id;
      data.wordsCount = data.words.length;
      return data;
    },
  },
  User: {
    lists: async (user) => {
      return user.lists.map(async (snap) => {
        const item = await snap.get();
        const response = item.data();
        response.id = item.id;
        const bookDoc = await response.book.get();
        response.book = bookDoc.data();
        response.book.id = bookDoc.id;
        response.wordsCount = response.words.length;
        return response;
      });
    },
  },
  Book: {
    lists: async (book) => {
      const bookRef = db.collection('books').doc(book.id);
      const snap = await db
        .collection('lists')
        .where('book', '==', bookRef)
        .get();
      return snap.docs.map((snap) => {
        const response = snap.data();
        response.id = snap.id;
        response.wordsCount = response.words.length;
        return response;
      });
    },
  },
  List: {
    words: async (list) => {
      const snap = await db.collection('lists').doc(list.id).get();
      const items = snap.data();
      const response = await Promise.all(
        items.words.map((wordRef) => wordRef.get()),
      );
      return response.map((word) => {
        const wordData = word.data();
        wordData.id = word.id;
        return wordData;
      });
    },
  },
};

module.exports = resolvers;
