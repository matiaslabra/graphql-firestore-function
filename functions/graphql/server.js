const { ApolloServer } = require('apollo-server-cloud-functions');
const admin = require('firebase-admin');
const schema = require('./schema');
const resolvers = require('./resolvers');
const auth = admin.auth();

const getUIDbyToken = require('../util/getUIDByToken');
const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  context: ({ req }) => ({
    headers: req.headers,
    uid: getUIDbyToken(req.headers),
  }),
  playground: true,
  introspection: true,
});

module.exports = server;
