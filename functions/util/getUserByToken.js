const admin = require('firebase-admin');

const getUserByToken = (headers) => {
  const token = headers.authorization || null;
  if (!token) return token;
  const parsedToken = token.replace('Bearer ', '');
  return admin
    .auth()
    .verifyIdToken(parsedToken)
    .then((decodedToken) => decodedToken)
    .catch((error) => {
      // Handle error
      console.log('uid failed', error);
      return null;
    });
};

module.exports = getUserByToken;
