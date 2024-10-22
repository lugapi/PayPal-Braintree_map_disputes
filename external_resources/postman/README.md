### Create disputes: `POST /create-the-disputes`
- Request 
```json
{
    "buyerTrx": [
        "57B33410AL633261W",
        "3XD2509525082880M"
    ]
}
```

- Response 
```json
[
    {
        "message": "No valid dispute reasons",
        "transaction_id": "57B33410AL633261W"
    },
    {
        "message": "No valid dispute reasons",
        "transaction_id": "3XD2509525082880M"
    },
    {
        "links": [
            {
                "href": "https://api-m.sandbox.paypal.com/v1/customer/disputes/PP-R-PZT-10101450",
                "rel": "self",
                "method": "GET"
            }
        ]
    }
]
```

### Retrieve dispute mapping: `POST /search-disputes-created`
- Request 
```json
{
  "caseNumbers": ["PP-R-XVW-10101436", "PP-R-XVW-10101437"]
}
```

- Response 
```json
[
    {
        "PayPal_Dispute": "PP-R-XVW-10101436",
        "Braintree_Dispute": "5bpq7phhfw5c6bx5"
    },
    {
        "PayPal_Dispute": "PP-R-XVW-10101439",
        "Braintree_Dispute": null,
        "message": "No dispute found for this case number"
    }
]
```

