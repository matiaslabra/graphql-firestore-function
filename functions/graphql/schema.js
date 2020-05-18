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
    # allWords: [Word]
    # wordsInList(listId: ID!): [Word]
  }

  type Mutation {
    createNewBook(book: BookInput!, userId: ID!): Book!
    addWordToList(word: String!, listId: ID!, userId: ID!): Word!
  }

  input BookInput {
    author: String!
    title: String!
    chapters: Int!
    isbn: String
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
    chapters: Int!
    description: String!
    isbn: String
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
