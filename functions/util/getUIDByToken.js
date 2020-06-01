const admin = require('firebase-admin');

const getUIDbyToken = (headers) => {
  console.log(headers);
  const token = headers.authorization || null;

  if (!token) return token;
  console.log('raw token', token);
  const parsedToken = token.replace('Bearer ', '');
  console.log('parsedToken token', parsedToken);
  return admin
    .auth()
    .verifyIdToken(parsedToken)
    .then((decodedToken) => decodedToken.uid)
    .catch((error) => {
      // Handle error
      console.log('uid failed', error);
      return null;
    });
};

module.exports = getUIDbyToken;
