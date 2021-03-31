const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
var database, collection;
const port = process.env.MEESEAPI_PORT;

const DATABASE_NAME = process.env.DATABASE_NAME;
const CONNECTION_URL = "localhost:27017"

app.listen(process.env.API_PORT || 8000, () => {
  console.log("Running on port ", process.env.API_PORT);
    MongoClient.connect("mongodb://" + CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
        if(error) {
            throw error;
        }
        database = client.db(DATABASE_NAME);
        collection = database.collection("questions");
        console.log("Connected to `" + DATABASE_NAME + "`!");
    });
});

app.use("/", express.static("public"));

app.post("/addQuestion", (request, response) => {
    if (request.headers.apikey !== process.env.API_KEY) {
      response.status(403).send("Invalid API Key");
      return;
    }
    collection.insertOne(request.body, (error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        response.send(result.result);
    });
});

app.get("/questions", (request, response) => {
    collection.find({}).toArray((error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        response.send(result);
    });
});

app.get("/questions/random", (request, response) => {
    collection.find({}).toArray((error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        response.send(result[Math.floor(Math.random() * result.length)]);
    });
});

app.get("/questions/:category", (request, response) => {
    collection.find( {"Category": request.params.category} ).toArray((error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        response.send(result);
    });
});

app.get("/questions/:category/random", (request, response) => {
    collection.find( {"Category": request.params.category} ).toArray((error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        response.send(result[Math.floor(Math.random() * result.length)]);
    });
});

app.get("/questions/:category/:subcategory", (request, response) => {
    collection.find( {"Category": request.params.category, "Subcategory": request.params.subcategory} ).toArray((error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        response.send(result);
    });
});

app.get("/questions/:category/:subcategory/random", (request, response) => {
    collection.find( {"Category": request.params.category, "Subcategory": request.params.subcategory} ).toArray((error, result) => {
        if(error) {
            return response.status(500).send(error);
        }
        response.send(result);
    });
       response.send(result[Math.floor(Math.random() * result.length)]);
});