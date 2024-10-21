// ==UserScript==
// @name         Get all Buyer TRX
// @namespace    http://tampermonkey.net/
// @version      2024-10-21
// @description  Extract transaction ID from PayPal activities page?
// @author       Lugapi
// @match        https://www.sandbox.paypal.com/myaccount/activities/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=paypal.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    // Fonction pour extraire et copier les IDs de transactions
    function extractAndCopyTransactionIDs() {
        // Sélectionner tous les divs qui contiennent 'js_transactionItem-' dans leur classe
        const divs = document.querySelectorAll('div[class*="js_transactionItem-"]');

        // Créer un tableau pour stocker les IDs extraits
        const transactionIDs = [];

        // Parcourir les divs et extraire les IDs
        divs.forEach(div => {
            // Trouver la classe qui contient l'ID de transaction
            const classList = div.className.split(' ');

            // Rechercher la classe avec le format 'js_transactionItem-' et récupérer l'ID
            classList.forEach(className => {
                const match = className.match(/js_transactionItem-(\w+)/);
                if (match) {
                    transactionIDs.push(match[1]);
                }
            });
        });

        // Transformer le tableau en une chaîne de caractères avec les IDs séparés par des virgules
        const idsAsString = transactionIDs.join(',');

        // Afficher la chaîne de caractères dans la console
        console.log(idsAsString);

        // Copier la chaîne de caractères dans le presse-papiers
        navigator.clipboard.writeText(idsAsString).then(() => {
            alert('Transaction IDs in the clipboard !');
        }).catch(err => {
            console.error('Erreur lors de la copie dans le presse-papiers :', err);
        });
    }

    // Fonction pour créer un bouton rouge fixe en bas à gauche
    function createActionButton() {
        // Créer le bouton
        const button = document.createElement('button');
        button.innerText = 'Get buyer transaction IDs';
        button.style.position = 'fixed';
        button.style.bottom = '20px';
        button.style.left = '20px';
        button.style.backgroundColor = 'red';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.padding = '10px 20px';
        button.style.cursor = 'pointer';
        button.style.zIndex = '1000'; // Assure que le bouton est toujours visible

        // Ajouter l'événement au clic
        button.addEventListener('click', extractAndCopyTransactionIDs);

        // Ajouter le bouton au corps de la page
        document.body.appendChild(button);
    }

    // Appeler la fonction pour créer le bouton
    createActionButton();

})();