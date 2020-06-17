// Provide resolver functions for your schema fields
const admin = require('firebase-admin');
const functions = require('firebase-functions');
const fetch = require('node-fetch');
const db = admin.firestore();
const auth = admin.auth();
const isProd = functions.config().runtime.env === 'production';
const algoliasearch = require('algoliasearch');
const algoliaClient = algoliasearch(
  functions.config().algolia.appid,
  functions.config().algolia.apikey,
);

const openLibraryAPIurl = `https://openlibrary.org/`;

const dictionaryAPIen = `https://api.dictionaryapi.dev/api/v2/entries/en/`;

const resolvers = {
  Mutation: {
    setUserFollowingBook: async (_, { bookId, newState }, context) => {
      const userRef = db.collection('users').doc(context.user.uid);
      const bookRef = db.collection('books').doc(bookId);
      if (newState) {
        await userRef.update({
          booksRef: admin.firestore.FieldValue.arrayUnion(bookRef),
          booksID: admin.firestore.FieldValue.arrayUnion(bookRef.id),
        });
      } else {
        await userRef.update({
          booksRef: admin.firestore.FieldValue.arrayRemove(bookRef),
          booksID: admin.firestore.FieldValue.arrayRemove(bookRef.id),
        });
      }
      return newState;
    },
    signUpSocialUser: async (_, { uid }) => {
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
    signUpEmailUser: async (_, { uid, name }) => {
      const snap = await db.collection('users').doc(uid).get();
      if (snap.exists) return uid; //user already exist in db
      const authUser = await auth.getUser(uid);

      const userData = {
        name,
        email: authUser.email,
        photoUrl: '',
        creationTime: authUser.metadata.creationTime,
        booksID: [],
      };
      db.collection('users').doc(uid).set(userData);
      return uid;
    },
    createNewBook: async (_, { book }, context) => {
      // :todo: check somehow if book already exists
      const batch = db.batch();

      const newBookRef = db.collection('books').doc();
      batch.set(newBookRef, { userId: context.user.uid, chapters: 0, ...book });
      // getting bookShelf to add book data for book recommendation
      const bookShelfRef = db.collection('shelfs').doc('bookshelf');
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
      const userRef = db.collection('users').doc(context.user.uid);
      await userRef.update({
        booksRef: admin.firestore.FieldValue.arrayUnion(newBookRef),
        booksID: admin.firestore.FieldValue.arrayUnion(newBookRef.id),
      });

      return { id: newBookRef.id, olCoverId: book.olCoverId };
    },
    createNewList: async (_, { list }, context) => {
      let chapterNumber, listName;

      // :todo: refactor switch, move it to util function
      // const chapterNumber = getChapterNumByListType(list.type);
      switch (list.type) {
        case 'INTRODUCTION':
          chapterNumber = -1;
          listName = 'Introduction';
          break;
        case 'PROLOGUE':
          chapterNumber = 0;
          listName = 'Prologue';
          break;
        case 'CHAPTER':
        default:
          chapterNumber = list.chapterNumber;
          listName = list.name || `Chapter ${chapterNumber}`;
          break;
      }
      const userRef = db.collection('users').doc(context.user.uid);

      const newListRef = await db.collection('lists').add({
        ...list,
        userId: context.user.uid,
        chapterNumber,
        name: listName,
        words: [],
      });

      await userRef.update({
        listsRef: admin.firestore.FieldValue.arrayUnion(newListRef),
      });
      return { id: newListRef.id };
    },
    addWordToList: async (_, { word, position, listId }, context) => {
      const lcWord = word.toLowerCase();
      // check if word already exist in db
      let wordObject, wordRef;
      const wordShelfSnap = await db
        .collection('shelfs')
        .doc('wordshelf')
        .collection('words')
        .doc(lcWord)
        .get();

      if (wordShelfSnap.exists) {
        const wordShelfData = wordShelfSnap.data();
        wordShelfData.id; // ref id

        wordRef = db.collection('words').doc(wordShelfData.id);

        const wordSnap = await wordRef.get();
        wordObject = wordSnap.data();
      } else {
        wordObject = await fetch(`${dictionaryAPIen}${lcWord}`).then((res) =>
          res.json(),
        );
        wordRef = await db.collection('words').add(wordObject[0]);
        // updating word shelf collection
        await db
          .collection('shelfs')
          .doc('wordshelf')
          .collection('words')
          .doc(lcWord)
          .create({ id: wordRef.id });
      }

      const listRef = db.collection('lists').doc(listId);
      await listRef.update({
        words: admin.firestore.FieldValue.arrayUnion({
          ref: wordRef,
          position,
        }),
      });

      //updating user's words with the new word
      const userRef = db.collection('users').doc(context.user.uid);
      userRef.update({
        words: admin.firestore.FieldValue.arrayUnion(wordRef),
      });

      return { id: wordRef.id };
    },
  },
  Query: {
    isUserFollowingBook: async (_, { bookId }, context) => {
      const userSnap = await db.collection('users').doc(context.user.uid).get();
      const user = userSnap.data();
      return user.booksID.includes(bookId);
    },
    algoBooksByQuery: async (_, { query }, context) => {
      const userSnap = await db.collection('users').doc(context.user.uid).get();
      const user = userSnap.data();

      const index = isProd ? 'books_prod' : 'books_dev';
      const collection = algoliaClient.initIndex(index);
      const result = await collection.search(query).then(({ hits }) => hits);
      return result.map((item) => {
        return {
          title: item.title,
          author: item.author,
          id: item.objectID,
          loading: false,
          following: user.booksID.includes(item.objectID),
        };
      });
    },
    olBooksByQuery: async (_, { query }) => {
      const response = await fetch(
        `${openLibraryAPIurl}search.json?q=${query}&mode=ebooks&has_fulltext=true`,
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
    newBooksAdded: async (_, __, context) => {
      // console.log(context.user.uid);
      // user.booksID; // books already reading
      // :todo: add pagination
      const userSnap = await db.collection('users').doc(context.user.uid).get();
      const user = userSnap.data();
      const shelfSnap = await db.collection('shelfs').doc('bookshelf').get();
      const bookShelf = shelfSnap.data();
      if (!bookShelf) return [];
      return bookShelf.books.reduce((acc, item) => {
        if (user.booksID.includes(item.id)) return acc;
        acc.push(item);
        return acc;
      }, []);
    },
    getWordDef: async (_, { word }) => {
      // new word, look for definition in word API
      const wordResponse = await fetch(
        `${dictionaryAPIen}${word}`,
      ).then((res) => res.json());

      // word no founded, typo?
      if (wordResponse.title === 'Word not found') return null; // https://www.apollographql.com/docs/apollo-server/data/errors ?
      // shape
      return {
        word,
        meanings: wordResponse[0].meanings,
        phonetic: wordResponse[0].phonetic,
      };
    },
    user: async (_, __, context) => {
      // console.log(context);
      const snap = await db.collection('users').doc(context.user.uid).get();
      const data = snap.data();
      data.id = context.user.uid;
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
      console.log(data);
      data.id = snap.id;
      return data;
    },
  },
  User: {
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
      return list.words.map(async (word) => {
        const item = await word.ref.get();
        const response = item.data();
        response.id = item.id;
        return {
          ...response,
          id: item.id,
          position: word.position,
        };
      });
    },
  },
};

module.exports = resolvers;
