const { ApolloServer } = require('apollo-server-cloud-functions');
const schema = require('./schema');
const resolvers = require('./resolvers');

const getUserByToken = require('../util/getUserByToken');
const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  context: async ({ req }) => ({
    headers: req.headers,
    user: await getUserByToken(req.headers),
  }),
  playground: true,
  introspection: true,
});

module.exports = server;
