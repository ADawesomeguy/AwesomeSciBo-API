//TODO: Migrate to JWT instead of API Keys

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const pdf = require('html-pdf');

const Question = require('./models/question');
const GeneratedRound = require('./models/generatedRound');
const APIKey = require('./models/apiKey');

const { categories, categoryNames } = require('./helpers/data/categories');
const db = require('./helpers/db');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const port = process.env.API_PORT || 8000;

app.listen(port, () => {
  console.log(`Running on port ${port}!`);
  db.connect();
});

app.set('view engine', 'pug');

app.get("/", async (req, res) => {
  res.render('index');
})

app.get("/round/:id", async (req, res) => {
  GeneratedRound.findById(req.params.id, async (error, result) => {
    if (result) {
      htmlContent = result.htmlContent;
      res.status(200).send(htmlContent);
    } else {
      return res.status(400);
    }
  });
});

app.get("/round/pdf/:id", async (req, res) => {
  GeneratedRound.findById(req.params.id, async (error, result) => {
    if (result) {
      htmlContent = result.htmlContent;
      pdf.create(htmlContent).toBuffer(function(err, buffer){
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=asb-round.pdf`);
        res.send(buffer);
      });
    } else {
      return res.status(400);
    }
  });
});

app.get("/questions/add", async (req, res) => {
  res.render('question', { categories: categories, questionData: {}, requestInfo: { method: "POST", endpoint: `/questions/add` }, title: "Add" });
});

app.get("/questions/:id/update", (request, response) => {
  Question.findOne( { "_id": new mongoose.Types.ObjectId(request.params.id) }, (error, result) => {
      if(error) {
        return response.status(500).send(error);
      }

      let questionJSON;

      if (result) {
        questionJSON = result;
        console.log(questionJSON);
        response.render('question', { categories: categories, questionData: questionJSON, requestInfo: { method: "POST", endpoint: `/questions/${request.params.id}/update` }, title: "Update" });
      } else {
        response.redirect('/questions/add?updateNotFound=true')
      }
  });
});

app.post("/questions/:id/update", async (request, response) => {
  //const qJSON = { "category": request.body.category, "subcategory": request.body[request.body.category]};
  const apiKey = request.body['API Key'];
  const qJSON = request.body;
  console.log(qJSON);
  qJSON['Toss-Up Question'] = qJSON['Toss-Up Question'].replace(/w\)/gi, "\nW)").replace(/x\)/gi, "\nX)").replace(/y\)/gi, "\nY)").replace(/z\)/gi, "\nZ)")
  qJSON['Bonus Question'] = qJSON['Bonus Question'].replace(/w\)/gi, "\nW)").replace(/x\)/gi, "\nX)").replace(/y\)/gi, "\nY)").replace(/z\)/gi, "\nZ)")
  qJSON['Toss-Up Explanation'] = qJSON['Toss-Up Explanation'].replace(/\r/gi, "");
  qJSON['Bonus Explanation'] = qJSON['Bonus Explanation'].replace(/\r/gi, "");
  let responseJSON = {};
  let subcategories;

  const missingElements = [];

  if (!request.body['Category'] || !request.body['Toss-Up Subcategory'] || !request.body['Bonus Subcategory'] || !request.body['Toss-Up Question Format'] || !request.body['Toss-Up Question'] || !request.body['Toss-Up Answer'] || !request.body['Bonus Question Format'] || !request.body['Bonus Question'] || !request.body['Bonus Answer'] || !request.body['API Key'] || !request.body['Source']) {
    console.log(request.body)
    Object.keys(request.body).forEach(key => {
      if (!request.body[key]) {
        missingElements.push(key);
      }
    });
  }

  const apiKeyData = await APIKey.findOne( { "API Key": apiKey.toLowerCase() });
  if (apiKeyData) {
    const qData = await Question.findOne( { "_id": new mongoose.Types.ObjectId(request.params.id) });
    const isSubmitter = apiKeyData['Email'] === qData['Submitter'];
    if (!isSubmitter) {
      return response.status(401).send("You're not the submitter");
    } else if (!apiKeyData["Valid"]) {
      return response.status(401).redirect(`/questions/${request.params.id}/update/?missing=a valid API key`);
    }
  } else {
    return response.status(401).redirect(`/questions/${request.params.id}/update/?missing=a valid API key`);
  }

  delete qJSON['API Key'];

  categories.some(category => {
    if (qJSON['Category'] === category.name) {
      subcategories = category.subcategories;
      return true;
    } else {
      return false;
    }
  });

  if (categoryNames.includes(qJSON['Category'])) {
    if (!subcategories.includes(qJSON['Toss-Up Subcategory'])) {
      //responseJSON.subcategory = "invalid";
      missingElements.push("a valid toss-up subcategory");
    }

    if (!subcategories.includes(qJSON['Bonus Subcategory'])) {
      missingElements.push("a valid bonus subcategory");
    }
  } else {
    missingElements.push("a valid category");
  }

  let statusArray = [];

  for (var key in responseJSON) {
    const value = responseJSON[key];
    statusArray.push(value);
  }
  if (missingElements.length > 0) {
    return response.status(400).redirect(`/questions/${request.params.id.toString()}/update/?missing=${missingElements}`);
  } else {
    Question.findByIdAndUpdate(request.params.id, qJSON, function (err) {
      if (err) {
        return response.status(500).send(err);
      }
      return response.status(200).redirect(`/questions/${request.params.id}`);
    });
  }
});

app.post("/questions/add", async (request, response) => {
  const apiKey = request.body['API Key'];
  const qJSON = request.body;
  qJSON['Toss-Up Question'] = qJSON['Toss-Up Question'].replace(/w\)/gi, "\nW)").replace(/x\)/gi, "\nX)").replace(/y\)/gi, "\nY)").replace(/z\)/gi, "\nZ)")
  qJSON['Bonus Question'] = qJSON['Bonus Question'].replace(/w\)/gi, "\nW)").replace(/x\)/gi, "\nX)").replace(/y\)/gi, "\nY)").replace(/z\)/gi, "\nZ)")
  qJSON['Toss-Up Explanation'] = qJSON['Toss-Up Explanation'].replace(/\r/gi, "");
  qJSON['Bonus Explanation'] = qJSON['Bonus Explanation'].replace(/\r/gi, "");
  let responseJSON = {};
  let subcategories;

  const missingElements = [];

  if (!request.body['Category'] || !request.body['Toss-Up Subcategory'] || !request.body['Bonus Subcategory'] || !request.body['Toss-Up Question Format'] || !request.body['Toss-Up Question'] || !request.body['Toss-Up Answer'] || !request.body['Bonus Question Format'] || !request.body['Bonus Question'] || !request.body['Bonus Answer'] || !request.body['API Key'] || !request.body['Source']) {
    Object.keys(request.body).forEach(key => {
      if (!request.body[key]) {
        missingElements.push(key);
      }
    });
  }

  const apiKeyData = await APIKey.findOne( { "API Key": apiKey.toLowerCase() });
  if (apiKeyData) {
    qJSON['Submitter'] = apiKeyData['Email'];
    qJSON['Timestamp'] = new Date().toISOString();
    if (!apiKeyData['Valid']) {
      return response.status(401).redirect(`/questions/add/?missing=a valid API key`);
    }
  } else {
    return response.status(401).redirect(`/questions/add/?missing=a valid API key`);
  }

  delete qJSON['API Key'];

  categories.some(category => {
    if (qJSON['Category'] === category.name) {
      subcategories = category.subcategories;
      return true;
    } else {
      return false;
    }
  });

  if (categoryNames.includes(qJSON['Category'])) {
    if (!subcategories.includes(qJSON['Toss-Up Subcategory'])) {
      //responseJSON.subcategory = "invalid";
      missingElements.push("a valid toss-up subcategory");
    }

    if (!subcategories.includes(qJSON['Bonus Subcategory'])) {
      missingElements.push("a valid bonus subcategory");
    }
  } else {
    missingElements.push("a valid category");
  }

  let statusArray = [];

  for (var key in responseJSON) {
    const value = responseJSON[key];
    statusArray.push(value);
  }
  if (missingElements.length > 0) {
    return response.status(400).redirect(`/questions/add?missing=${missingElements}`);
  } else {
    const question = new Question(qJSON);
    question.save(function (err) {
      if (err) {
        return response.status(500).send(err);
      }
      return response.status(200).redirect("/questions/add");
    });
  }
});

app.get("/questions", (req, res) => {
  let filter = {};
  let limit = '0';

  if (req.query['Limit']) {
    limit = req.query['Limit'];
  }

  if (req.query['Category']) {
    filter['Category'] = { $in: req.query['Category'] };
    if (req.query['Subcategory']) {
        filter['Subcategory'] = { $in: req.query['Subcategory'] };
    }
  }

  if (req.query['Submitter']) {
      filter['Submitter'] = { $in: req.query['Submitter'] };
  }

  if (req.query['Source']) {
    filter['Source'] = { $in: req.query['Source']}
  }

  if (req.query['q']) {
    filter['$text'] = { $search: req.query['q']}
  }

  Question.find(filter, (error, result) => {
      if(error) {
          return res.status(500).send(error);
      }

      if (limit === '0') {
        return res.send(result);
      } else {
        return res.send(result.slice(0, limit));
      }
  });
});

app.get("/questions/random", (req, res) => {
  let filter = {};
  let limit = 1;

  if (req.query['Limit']) {
    limit = req.query['Limit'];
  }

  if (req.query['Category']) {
    filter['Category'] = { $in: req.query['Category'] };
    if (req.query['Subcategory']) {
        filter['Subcategory'] = { $in: req.query['Subcategory'] };
    }
  }

  if (req.query['Submitter']) {
      filter['Submitter'] = { $in: req.query['Submitter'] };
  }

  if (req.query['Source']) {
    filter['Source'] = { $in: req.query['Source']}
  }

  if (req.query['q']) {
    filter['$text'] = { $search: req.query['q']}
  }

  Question.find(filter, (error, result) => {
      if(error) {
          return res.status(500).send(error);
      }

      const randomArray = result;

      for (let i = randomArray.length -1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = randomArray[i];
        randomArray[i] = randomArray[j];
        randomArray[j] = temp;
      }
      if (limit === '0') {
        return res.send(randomArray);
      } else {
        return res.send(randomArray.slice(0, limit));
      }
  });
});

app.get("/questions/:id", (request, response) => {
  Question.findOne( { "_id": new mongoose.Types.ObjectId(request.params.id) }, (error, result) => {
      if(error) {
          return response.status(500).send(error);
      }
      return response.send(result);
  });
});

app.get("/view", (req, res) => {
  return res.render('view', { id: null })
});

app.get("/view/:id", (req, res) => {
  Question.findOne( { "_id": new mongoose.Types.ObjectId(req.params.id) }, (error, result) => {
      if(error) {
          return res.status(500).send(error);
      }
      return res.render('view', { id: req.params.id });
  });
});
