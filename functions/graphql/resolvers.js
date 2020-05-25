// Provide resolver functions for your schema fields
const admin = require('firebase-admin');
const serviceAccount = require('../../key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DB_HOST,
});

const fetch = require('node-fetch');
const db = admin.firestore();

const openLibraryApiUrl = `https://openlibrary.org/`;
// const Wordnik = require('wordnik-as-promised');
// const wn = new Wordnik('69cb40606211293cb7e81018c4d0b231e657a10ae78c924c9');

const dictionaryapi = `https://api.dictionaryapi.dev/api/v2/entries/`;

const resolvers = {
  Mutation: {
    createNewBook: async (_, { userId, book }) => {
      const newBookRef = await db
        .collection('books')
        .add({ user: userId, chapters: 0, ...book });

      const userRef = await db.collection('users').doc(userId);
      await userRef.update({
        books: admin.firestore.FieldValue.arrayUnion(newBookRef),
      });
      return { id: newBookRef.id, olCoverId: book.olCoverId };
    },
    createNewList: async (_, { list }) => {
      console.log(list);
      let chapterNumber;
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
        lists: admin.firestore.FieldValue.arrayUnion(newListRef),
      });
      return { id: newListRef.id };
    },
    addWordToList: async (_, { word, listId, userId }) => {
      //get word data from API

      // console.log(word, listId, userId);
      try {
        const wordResponse = await fetch(
          `${dictionaryapi}en/${word}`,
        ).then((res) => res.json());
        // const wordResponse = await wn
        //   .definitions(word, {
        //     limit: 3,
        //   })
        //   .then((res) => res);
        // console.log(wordResponse);
        const wordObject = {
          word,
          def: wordResponse
            .slice(0, 3)
            .map((def) => def.meanings[0].definitions[0]),
          phonetic: wordResponse.map((word) => word.phonetic),
        };
        // console.log(wordObject);

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
      } catch (error) {
        console.error(error);
      }
    },
  },
  Query: {
    booksByTitle: async (_, { query }) => {
      console.log(query);
      const response = await fetch(
        `${openLibraryApiUrl}search.json?q=${query}&mode=ebooks`,
      )
        .then((res) => res.json())
        .then((json) => json.docs);
      const data = response.reduce((acc, item) => {
        let bookItem = {
          title: item.title,
          author: item.author_name ? item.author_name[0] : 'No author',
          olIDs: [],
          olCoverId: item.cover_i ? item.cover_i : null,
        };
        if (item.lending_edition_s) bookItem.olIDs.push(item.lending_edition_s);
        if (item.cover_edition_key) bookItem.olIDs.push(item.cover_edition_key);

        acc.push(bookItem);
        return acc;
      }, []);
      return data;
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
    books: async (user) => {
      if (user.books) {
        return user.books.map(async (snap) => {
          const item = await snap.get();
          const response = item.data();
          response.id = item.id;
          return response;
        });
      }

      return [];
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
      // console.log(list);
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
