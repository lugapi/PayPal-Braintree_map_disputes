// utils.js

function base64url(source) {
  var encodedSource = btoa(source);
  encodedSource = encodedSource.replace(/=+$/, '');
  encodedSource = encodedSource.replace(/\+/g, '-');
  encodedSource = encodedSource.replace(/\//g, '-');
  return encodedSource;
}

function encodedJWT(clientID, email) {
  const header = { "alg": "none", "typ": "JWT" };
  const data = { "iss": clientID, "email": email };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(data));
  const tokenJWT = `${encodedHeader}.${encodedPayload}.`;
  return tokenJWT;
}

module.exports = {
  base64url,
  encodedJWT
};
