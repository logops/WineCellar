const fs = require('fs');

const results = {
  "success":true,
  "data":{
    "processedWines":[
      {
        "rowIndex":1,
        "originalData":{
          "A":"1995",
          "B":"Robert Mondavi",
          "C":"Reserve Cabernet Sauvignon",
          "D":"USA",
          "E":"CA",
          "F":"Northern CA"
        },
        "mappedData":{
          "userId":2,
          "vintage":1995,
          "quantity":1,
          "region":"USA",
          "name":"Reserve Cabernet Sauvignon",
          "producer":"Robert Mondavi",
          "type":"Red"
        },
        "confidence":"low",
        "missingRequiredFields":[],
        "isPotentialDuplicate":false,
        "needsVerification":true
      },
      {
        "rowIndex":2,
        "originalData":{
          "A":"2018",
          "B":"Alice et Olivier De Moor",
          "C":"L'Humeur du Temps",
          "D":"France",
          "E":"",
          "F":"Chablis"
        },
        "mappedData":{
          "userId":2,
          "vintage":2018,
          "quantity":1,
          "region":"France",
          "name":"L'Humeur du Temps",
          "producer":"Alice et Olivier De Moor",
          "type":"Red"
        },
        "confidence":"low",
        "missingRequiredFields":[],
        "isPotentialDuplicate":false,
        "needsVerification":true
      },
      {
        "rowIndex":3,
        "originalData":{
          "A":"2008",
          "B":"Domain Drouhin",
          "C":"Arthur Chardonnay",
          "D":"USA",
          "E":"OR",
          "F":"Willamette Valley"
        },
        "mappedData":{
          "userId":2,
          "vintage":2008,
          "quantity":1,
          "region":"USA",
          "name":"Arthur Chardonnay",
          "producer":"Domain Drouhin",
          "type":"Red"
        },
        "confidence":"low",
        "missingRequiredFields":[],
        "isPotentialDuplicate":false,
        "needsVerification":true
      }
    ],
    "fieldMappings":[
      {
        "field":"name",
        "columnHeader":"wine (name/varietal(s))",
        "columnIndex":"C",
        "confidence":"high"
      },
      {
        "field":"producer",
        "columnHeader":"winery",
        "columnIndex":"B",
        "confidence":"high"
      },
      {
        "field":"vintage",
        "columnHeader":"vintage",
        "columnIndex":"A",
        "confidence":"high"
      },
      {
        "field":"region",
        "columnHeader":"region",
        "columnIndex":"F",
        "confidence":"high"
      },
      {
        "field":"country",
        "columnHeader":"country",
        "columnIndex":"D",
        "confidence":"high"
      },
      {
        "field":"state",
        "columnHeader":"state",
        "columnIndex":"E",
        "confidence":"high"
      },
      {
        "field":"grapeVarieties",
        "columnHeader":"wine (name/varietal(s))",
        "columnIndex":"C",
        "confidence":"medium"
      },
      {
        "field":"quantity",
        "columnHeader":"country",
        "columnIndex":"D",
        "confidence":"medium"
      }
    ],
    "totalRows":4,
    "processedRows":3,
    "newLocations":[],
    "potentialDuplicatesCount":0,
    "needsVerificationCount":3,
    "highConfidenceCount":0
  }
};

console.log('PROCESSED WINES:');
results.data.processedWines.forEach((wine, index) => {
  console.log();
  console.log();
  console.log();
  console.log();
  console.log();
});
