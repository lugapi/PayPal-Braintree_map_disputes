// braintreeConfig.js

const braintree = require('braintree');
const env = require('dotenv').config();

module.exports = {
  gateway: new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox,
    merchantId: process.env.BRAINTREE_MERCHANT_ID,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY
  }),
  btMAID: process.env.BRAINTREE_MAID,
  clientID: process.env.PAYPAL_CLIENT_ID,
  secret: process.env.PAYPAL_SECRET,
  emailBuyer: process.env.PAYPAL_BUYER_EMAIL,
  buyerToken: process.env.PAYPAL_BUYER_TOKEN,
  baseOrderId: process.env.BASE_ORDERID,
  clientIDForDisputeCheck: process.env.PAYPAL_CLIENT_ID_FOR_PPDISPUTECHECK,
  secretForDisputeCheck: process.env.PAYPAL_SECRET_FOR_PPDISPUTECHECK,
};