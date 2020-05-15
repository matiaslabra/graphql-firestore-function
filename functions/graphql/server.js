const { ApolloServer } = require('apollo-server-cloud-functions');
const schema = require('./schema');
const resolvers = require('./resolvers');

const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  context: ({ req, res }) => ({
    headers: req.headers,
    req,
    res,
  }),
  playground: true,
  introspection: true,
});

module.exports = server;
