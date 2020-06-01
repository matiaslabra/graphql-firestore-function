// Provide resolver functions for your schema fields
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const isProd = process.env.NODE_ENV === 'production';
console.log('isProd', process.env.NODE_ENV);
const serviceAccount = isProd
  ? functions.config().service_account
  : require('../../.runtimeconfig.json').service_account;
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://myvocab-fa620.firebaseio.com',
});

const fetch = require('node-fetch');
const db = admin.firestore();
const auth = admin.auth();

const openLibraryAPIurl = `https://openlibrary.org/`;

const dictionaryAPIen = `https://api.dictionaryapi.dev/api/v2/entries/en/`;

const resolvers = {
  Mutation: {
    signInUser: async (_, { uid }) => {
      const snap = await db.collection('users').doc(uid).get();
      console.log(snap.exists);
      if (snap.exists) return uid; //user already exist in db
      const authUser = await auth.getUser(uid);
      const userData = {
        name: authUser.displayName,
        email: authUser.email,
        photoUrl: authUser.photoURL,
        creationTime: authUser.metadata.creationTime,
        booksID: [],
      };
      db.collection('users').doc(uid).set(userData);
      return uid;
    },
    createNewBook: async (_, { userId, book }) => {
      // :todo: check somehow if book already exists
      let batch = db.batch();

      const newBookRef = db.collection('books').doc();
      batch.set(newBookRef, { user: userId, chapters: 0, ...book });
      // getting bookShelf to add book data for book recommendation
      const bookShelfRef = db.collection('shelf').doc('books');
      batch.update(
        bookShelfRef,
        'books',
        admin.firestore.FieldValue.arrayUnion({
          id: newBookRef.id,
          title: book.title,
          author: book.author,
          olCoverId: book.olCoverId,
        }),
      );

      await batch.commit();
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        booksRef: admin.firestore.FieldValue.arrayUnion(newBookRef),
        booksID: admin.firestore.FieldValue.arrayUnion(newBookRef.id),
      });

      return { id: newBookRef.id, olCoverId: book.olCoverId };
    },
    createNewList: async (_, { list }) => {
      let chapterNumber;

      // :todo: refactor switch, move it to util function
      // const chapterNumber = getChapterNumByListType(list.type);
      switch (list.type) {
        case 'INTRODUCTION':
          chapterNumber = -1;
          break;
        case 'PROLOGUE':
          chapterNumber = 0;
          break;
        case 'CHAPTER':
        default:
          chapterNumber = list.chapterNumber;
          break;
      }
      const userRef = await db.collection('users').doc(list.userId);

      const newListRef = await db
        .collection('lists')
        .add({ user: userRef, chapterNumber, ...list, words: [] });

      await userRef.update({
        listsRef: admin.firestore.FieldValue.arrayUnion(newListRef),
      });
      return { id: newListRef.id };
    },
    addWordToList: async (_, { word, listId, userId }) => {
      const wordResponse = await fetch(
        `${dictionaryAPIen}${word}`,
      ).then((res) => res.json());
      const wordObject = {
        word,
        def: wordResponse
          .slice(0, 3)
          .map((def) => def.meanings[0].definitions[0]),
        phonetic: wordResponse.map((word) => word.phonetic),
      };

      const newWordRef = await db.collection('words').add(wordObject);
      //updating list with the new word
      const listRef = await db.collection('lists').doc(listId);
      await listRef.update({
        words: admin.firestore.FieldValue.arrayUnion(newWordRef),
      });

      //updating user's words with the new word
      const userRef = await db.collection('users').doc(userId);
      userRef.update({
        words: admin.firestore.FieldValue.arrayUnion(newWordRef),
      });
      return { id: newWordRef.id };
    },
  },
  Query: {
    booksByTitle: async (_, { query }) => {
      const response = await fetch(
        `${openLibraryAPIurl}search.json?q=${query}&mode=ebooks`,
      )
        .then((res) => res.json())
        .then((json) => json.docs);

      return response.reduce((acc, item) => {
        const bookItem = {
          title: item.title,
          author: item.author_name ? item.author_name[0] : 'No author',
          olIDs: [],
          olCoverId: item.cover_i ? item.cover_i : null,
          loading: false,
          added: false,
        };
        if (item.lending_edition_s) bookItem.olIDs.push(item.lending_edition_s);
        if (item.cover_edition_key) bookItem.olIDs.push(item.cover_edition_key);

        acc.push(bookItem);
        return acc;
      }, []);
    },
    user: async (_, { userId }) => {
      const snap = await db.collection('users').doc(userId).get();
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
    word: async (_, { id }) => {
      const snap = await db.collection('words').doc(id).get();
      const data = snap.data();
      data.id = snap.id;
      return data;
    },
  },
  User: {
    booksAdded: async (user) => {
      // user.booksID; // books already reading
      // :todo: add pagination
      const snap = await db.collection('shelf').doc('books').get();
      const bookShelf = snap.data();
      return bookShelf.books.reduce((acc, item) => {
        console.log(item);
        if (user.booksID.includes(item.id)) return acc;
        acc.push(item);
        return acc;
      }, []);
    },
    lists: async (user) => {
      return user.listsRef.map(async (snap) => {
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
    books: async (user) => {
      if (!user.booksRef) return [];

      return user.booksRef.map(async (snap) => {
        const item = await snap.get();
        const response = item.data();
        response.id = item.id;
        return response;
      });
    },
  },
  Book: {
    lists: async (book) => {
      const snap = await db
        .collection('lists')
        .where('bookId', '==', book.id)
        .orderBy('chapterNumber')
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
      if (!list.words) return [];
      return list.words.map(async (snap) => {
        const item = await snap.get();
        const response = item.data();
        response.id = item.id;
        return response;
      });
    },
  },
};

module.exports = resolvers;
