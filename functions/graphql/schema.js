const { gql } = require('apollo-server-cloud-functions');

// Construct a schema, using GraphQL schema language
const schema = gql`
  schema {
    query: Query
    mutation: Mutation
  }

  type Query {
    user(userId: ID!): User
    list(id: ID!): List
    book(id: ID!): Book
    word(id: ID!): Word
    booksByTitle(query: String!): [Book!]
  }

  type Mutation {
    createNewBook(book: BookInput!, userId: ID!): Book!
    createNewList(list: ListInput!): List!
    addWordToList(word: String!, listId: ID!, userId: ID!): Word!
    addListToBook(chapterType: String!, listId: ID!, userId: ID!): List!
  }

  enum ListType {
    INTRODUCTION
    PROLOGUE
    CHAPTER
    EPILOGUE
  }

  input BookInput {
    author: String!
    title: String!
    olIDs: [String]
    olCoverId: String
  }

  input ListInput {
    bookId: ID!
    userId: ID!
    listName: String!
    listType: ListType!
  }

  type User {
    email: String!
    name: String!
    lists: [List]
    books: [Book]
  }

  type Book {
    id: ID!
    author: String!
    title: String!
    lists: [List]
    chapters: Int
    olIDs: [String]
    olCoverId: String
    userId: ID!
  }

  type List {
    id: ID!
    book: Book
    user: ID!
    words: [Word]
    wordsCount: Int!
    name: String!
    ListType: ListType!
  }

  type Word {
    id: ID!
    word: String!
    def: [WordDefinition]!
    phonetic: String!
  }
  type WordDefinition {
    definition: String!
    example: String!
    phonetic: [String]!
  }

  type Syllables {
    count: Int!
    list: [String]!
  }
`;

module.exports = schema;
