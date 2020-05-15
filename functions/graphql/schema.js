const { gql } = require('apollo-server-cloud-functions');

// Construct a schema, using GraphQL schema language
const schema = gql`
  schema {
    query: Query
  }

  type Query {
    user(id: ID!): User
    list(id: ID!): List
    book(id: ID!): Book
    # allWords: [Word]
    # wordsInList(listId: ID!): [Word]
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
    name: String!
    lists: [List]
    chapters: Int!
    description: String!
  }

  type List {
    id: ID!
    book: Book
    user: ID!
    words: [Word]
    wordsCount: Int!
    chapterNumber: Int!
  }

  type Word {
    id: ID!
    word: String!
    definition: String!
    pronunciation: String!
    syllables: Syllables
    list: [String]!
  }

  type Syllables {
    count: Int!
    list: [String]!
  }
`;

module.exports = schema;
