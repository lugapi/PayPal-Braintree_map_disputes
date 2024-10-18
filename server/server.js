const express = require('express');
const axios = require('axios')
const app = express();
const path = require("path");

app.use(express.json());

app.set("view engine", "ejs");
app.set("views", path.join("views"));

app.use(express.static(__dirname + '/public')); // Servez les fichiers statiques à partir du répertoire public

const { encodedJWT } = require('../utils');
const config = require('../config');

const gateway = config.gateway;
const clientID = config.clientID;
const emailBuyer = config.emailBuyer;
const pmToken = config.buyerToken;
const secret = config.secret;
const baerer = Buffer.from(clientID + ':' + secret).toString('base64')

////////////
// ROUTES //
////////////

// serve the htm file
app.get('/', (req, res) => {
  // send param to view
  res.render('index', {
    BTMID: process.env.BRAINTREE_MERCHANT_ID,
  });

  // res.sendFile(__dirname + '/public/index.html');
});
/**
 * Loop through creating transactions based on input number
 * @param {string} number - number of times to create a transaction
 */
app.post('/loop-transactions', async (req, res) => {
  const number = parseInt(req.body.number, 10); // Convertir en entier
  if (isNaN(number) || number <= 0) {
    return res.status(400).send({ message: 'Invalid number of transactions' });
  }

  try {
    const result = await loopTransction(number);
    res.send(result); // Envoyer les résultats au front-end
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error processing transactions' });
  }
});

app.post('/create-the-disputes', async (req, res) => {
  const buyerTransactions = req.body.buyerTrx;

  // Vérifie que caseNumberList est bien défini
  if (!buyerTransactions) {
    return res.status(400).send({ message: 'No buyer transactions provided' });
  }

  try {
    const result = await checkAndCreateDisputes(buyerTransactions);
    res.send(result); // Envoyer les résultats au front-end une fois la recherche terminée
  } catch (error) {
    console.error('Error during dispute search:', error);
    res.status(500).send({ message: 'Error during dispute search' });
  }
});

app.post('/search-disputes-created', async (req, res) => {
  const caseNumberList = req.body.caseNumbers;

  console.log("Request body:", req.body);  // Ajoute cette ligne pour voir les données reçues
  console.log("Request body caseNumbers:", req.body.caseNumbers);  // Ajoute cette ligne pour voir les données reçues

  // Vérifie que caseNumberList est bien défini
  if (!caseNumberList) {
    return res.status(400).send({ message: 'No case numbers provided' });
  }

  try {
    const result = await searchDisputesCreatedBasedOnCaseNumber(caseNumberList);
    res.send(result); // Envoyer les résultats au front-end une fois la recherche terminée
  } catch (error) {
    console.error('Error during dispute search:', error);
    res.status(500).send({ message: 'Error during dispute search' });
  }
});


///////////////
// FUNCTIONS //
///////////////


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
/////////////////////////////////////////////////////// Create transaction /////////////////////////////////////////////////////////////////  
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  


/**
 * Function to create multiple transactions
 * @param {number} number - number of times to create a transaction
 */
async function loopTransction(number) {
  const trxResult = [];

  for (let i = 0; i < number; i++) {
    // amount add random between 100 and 200
    let amount = 10.00 + Math.floor((Math.random() * 100));

    try {
      const result = await new Promise((resolve, reject) => {
        gateway.transaction.sale({
          amount: amount.toFixed(2),
          paymentMethodToken: pmToken,
          orderId: "testLucasForDisputes" + Math.floor(Math.random() * 9999),
          options: {
            submitForSettlement: true
          }
        }, (err, result) => {
          if (err || !result.success) {
            reject(err || result);
          } else {
            resolve(result.transaction);
          }
        });
      });

      let trxRes = {
        transactionID: result.id,
        amount: result.amount,
        orderId: result.orderId,
        success: true
      }

      console.log(trxRes);

      trxResult.push(trxRes);
    } catch (error) {
      trxResult.push({
        error: error.message || 'Transaction failed',
        success: false
      });
    }
  }

  return trxResult;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
/////////////////////////////////////////// Eligibility And Create Dispute /////////////////////////////////////////////////////////////////  
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  


async function checkDisputeElibilityExec(trx, baerer) {
  let data = JSON.stringify({
    "encrypted_transaction_id": trx
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api-m.sandbox.paypal.com/v1/customer/disputes/validate-eligibility',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${baerer}`,
    },
    data: data
  };

  const res = await axios(config)
  if (res.status === 200) {
    return res.data
  } else {
    console.log('Invalid response from PayPal API')
    // throw new Error('Invalid response from PayPal API')
  }
}


// dispute create the dispute
async function createDisputeExec(trx, baerer, jwt, reason) {

  let data = JSON.stringify({
    "disputed_transactions": [
      {
        "buyer_transaction_id": trx
      }
    ],
    "reason": `${reason}`,
    "dispute_amount": {
      "currency_code": "EUR",
      "value": "10"
    },
    "extensions": {
      "merchant_contacted": true,
      "merchant_contacted_outcome": "NO_RESPONSE",
      "merchandize_dispute_properties": {
        "issue_type": "PRODUCT"
      }
    }
  });

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://api-m.sandbox.paypal.com/v1/customer/disputes',
    headers: {
      'PayPal-Auth-Assertion': jwt,
      'Content-Type': 'application/json',
      'Authorization': `Basic ${baerer}`,
    },
    data: data
  };


  try {
    const res = await axios(config);
    if (res.status === 201) {
      const responseBody = await res.data;
      console.log('Dispute created successfully:', responseBody);
      return responseBody;
    } else {
      console.log("fail to create dispute")
      throw new Error(`Failed to create dispute: ${res.statusText}`);
    }
  } catch (error) {
    console.error('Error creating dispute:', error);
    return error;
  }
}



async function checkAndCreateDisputes(buyerTransactions) {
  // Détecte et sépare les transactions selon les virgules, espaces ou autres
  let buyerTrx = buyerTransactions.includes(",")
    ? buyerTransactions.split(',')
    : buyerTransactions.includes(" ")
      ? buyerTransactions.split(' ')
      : buyerTransactions;

  // Supprime les espaces inutiles
  buyerTrx = buyerTrx.map(trx => trx.trim());

  const responses = [];

  // Fonction pour gérer une seule transaction
  async function processTransaction(transaction) {
    const res = await checkDisputeElibilityExec(transaction, baerer);

    const results = {
      transaction_id: res.buyer_transaction_id,
      eligible_dispute_reasons: res.eligible_dispute_reasons,
    };

    // console.log(results);

    if (results.eligible_dispute_reasons.length > 0) {
      let randomReason = "";
      // Choisir aléatoirement entre les deux raisons spécifiques
      const validReasons = results.eligible_dispute_reasons.filter(r =>
        r.dispute_reason === 'MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED' ||
        r.dispute_reason === 'MERCHANDISE_OR_SERVICE_NOT_RECEIVED'
      );

      if (validReasons.length > 0) {
        // Si au moins une des raisons est valide, choisir aléatoirement entre elles
        randomReason = validReasons[Math.floor(Math.random() * validReasons.length)].dispute_reason;
      }

      if (randomReason) { // Si une raison valide a été trouvée
        const jwt = encodedJWT(clientID, emailBuyer);

        // Créer la dispute et retourner le résultat
        const disputeResult = await createDisputeExec(results.transaction_id, baerer, jwt, randomReason);
        console.log('Dispute created successfully:', disputeResult);
        return disputeResult;
      } else {
        console.log("No valid dispute reasons found for transaction:", transaction);
        return { message: "No valid dispute reasons", transaction_id: transaction };
      }
    } else {
      console.log("No eligible dispute reasons for transaction:", transaction);
      return { message: "No eligible dispute reasons", transaction_id: transaction };
    }
  }

  // Si plusieurs transactions sont présentes, on map chaque transaction et attend la résolution des promesses
  if (buyerTrx.length > 1) {
    console.log("Processing multiple transactions...");
    const promises = buyerTrx.map(transaction => processTransaction(transaction));
    await Promise.all(promises).then(res => responses.push(...res));
  } else {
    // Traitement d'une seule transaction
    console.log("Processing a single transaction...");
    const singleResponse = await processTransaction(buyerTrx[0]);
    return singleResponse;  // Retourne directement si une seule transaction
  }

  console.log(responses);
  return responses;  // Retourne les réponses pour les transactions multiples
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
/////////////////////////////////////////////// Search And Compare Dispute /////////////////////////////////////////////////////////////////  
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////  


async function searchDisputesCreatedBasedOnCaseNumber(cases) {
  const lookup = [];

  let caseNumberList = ""
  
  // cases devrait être une chaîne avec des numéros séparés par des virgules (si elle est une chaîne) ou un objet JSON (si c'est l'API)
  if (typeof cases === 'string') {
    caseNumberList = cases.split(',');
  } else if (typeof cases === 'object') {
    // Si c'est un objet JSON, on récupère la liste des casNumbers directement
    caseNumberList = Object.values(cases).map((value) => value);
  } else {
    throw new Error('Invalid input type');
  }

  // Utilise `for...of` pour itérer sur caseNumberList avec async/await
  for (const caseNumber of caseNumberList) {
    try {
      // Utilise une promesse pour attendre la fin de la recherche pour chaque cas
      const disputes = await new Promise((resolve, reject) => {
        gateway.dispute.search((search) => {
          search.caseNumber().is(caseNumber);
        }, (err, response) => {
          if (err) {
            reject(err); // Rejette en cas d'erreur
          } else {
            resolve(response); // Résout avec les résultats
          }
        });
      });

      // Si des disputes sont trouvées, on les ajoute au tableau
      if (disputes && disputes.length > 0) {
        disputes.forEach((dispute) => {
          if (dispute.id) {
            lookup.push({
              PayPal_Dispute: dispute.caseNumber,
              Braintree_Dispute: dispute.id
            });
            console.log(dispute.caseNumber + " <==> " + dispute.id);
          }
        });
      } else {
        // Si aucune dispute n'est trouvée, ajouter quand même le numéro de cas avec un message indiquant l'absence de correspondance
        lookup.push({
          PayPal_Dispute: caseNumber,
          // Braintree_Dispute: "No Braintree Dispute for this PayPal reference",  // ou un autre indicateur pour signifier qu'il n'y a pas de correspondance
          Braintree_Dispute: null,  // ou un autre indicateur pour signifier qu'il n'y a pas de correspondance
          message: "No dispute found for this case number"
        });
        console.log(`No disputes found for case number: ${caseNumber}`);
      }

    } catch (error) {
      console.error(`Error searching disputes for case number ${caseNumber}:`, error);

      // En cas d'erreur, ajouter une entrée avec l'erreur
      lookup.push({
        PayPal_Dispute: caseNumber,
        Braintree_Dispute: null,  // ou un autre indicateur pour signifier qu'il n'y a pas de correspondance
        message: `Error searching dispute: ${error.message}`
      });
    }
  }

  // Une fois toutes les recherches terminées, retourne le tableau lookup
  return lookup;
}



const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});