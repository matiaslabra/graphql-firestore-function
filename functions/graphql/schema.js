const { gql } = require('apollo-server-cloud-functions');

// Construct a schema, using GraphQL schema language
const schema = gql`
  schema {
    query: Query
    mutation: Mutation
  }

  type Query {
    user: User
    list(id: ID!): List
    book(id: ID!): Book
    word(id: ID!): Word
    olBooksByQuery(query: String!): [BookApi!]
    algoBooksByQuery(query: String!): [BookSearch!]
    newBooksAdded: [Book]
    getWordDef(word: String!): WordApi
    isUserFollowingBook(bookId: ID!): Boolean!
  }

  type Mutation {
    createNewBook(book: BookInput!): Book!
    deleteBook(id: ID!): Boolean!
    deleteList(id: ID!): Boolean!
    createNewList(list: ListInput!): List!
    editList(list: EditListInput!): Boolean!
    addWordToList(word: String!, listId: ID!, position: [Int!]!): Word
    # addListToBook(type: String!, listId: ID!): List!
    signUpSocialUser(uid: ID!): ID!
    signUpEmailUser(uid: ID!, name: String!): ID!
    setUserFollowingBook(bookId: ID!, newState: Boolean!): Boolean!
  }

  enum ListType {
    INTRODUCTION
    PROLOGUE
    CHAPTER
  }

  input BookInput {
    author: String!
    title: String!
    olIDs: [String]
    olCoverId: String
  }

  input ListInput {
    bookId: ID!
    name: String
    type: ListType!
    listNumber: Int
  }

  input EditListInput {
    id: ID!
    name: String
    type: ListType!
    listNumber: Int
  }

  type User {
    email: String!
    name: String!
    lists: [List]
    books: [Book]
  }

  type BookApi {
    author: String!
    title: String!
    olIDs: [String]
    olCoverId: String
    loading: Boolean!
    added: Boolean!
  }
  type BookSearch {
    id: ID!
    author: String!
    title: String!
    following: Boolean!
    olCoverId: String
  }

  type Book {
    id: ID!
    author: String!
    title: String!
    lists: [List]
    olIDs: [String]
    olCoverId: String
    userId: ID!
  }

  type List {
    id: ID!
    book: Book
    userId: ID!
    words: [Word]
    wordsCount: Int!
    name: String!
    type: ListType!
    listNumber: Int!
  }

  type Word {
    id: ID!
    word: String!
    meanings: [WordMeaning]!
    phonetic: String
    position: [Int!]!
  }

  type WordApi {
    word: String!
    meanings: [WordMeaning]!
    phonetic: String
  }

  type WordMeaning {
    definitions: [WordDefinition]
    example: String
    partOfSpeech: String
  }

  type WordDefinition {
    synonyms: [String]
    example: String
    definition: String
  }

  type Syllables {
    count: Int!
    list: [String]!
  }
`;

module.exports = schema;
