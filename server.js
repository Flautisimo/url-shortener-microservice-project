require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const dns = require("dns");
const bodyParser = require("body-parser");
const urlparser = require("url");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;
// Set up 'bodyParser'
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

/* Database connection */
mongoose.connect(process.env.DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});

/* Create a Schema */
const urlSchema = new mongoose.Schema({
  original: { type: String, required: true },
  short: Number
});

/* Create a 'Url' model */
const Url = mongoose.model("Url", urlSchema);

const responseObject = {};

// Your first API endpoint
app.post("/api/shorturl/new", (req, res) => {
  /* Get input from the body object (first the field named 'url') */
  let inputUrl = req.body.url;

  const isItValid = dns.lookup(
    urlparser.parse(inputUrl).hostname,
    (err, address) => {
      if (!address) {
        res.json({ error: "invalid url" });
      } else {
        /* Asign input url to the first field of the response object ('original-url') */
        responseObject["original_url"] = inputUrl;
        /* Create a variable to store the value of the second field of the response object ('short') */
        let inputShort = 1;
        /* Find the highest short and make inputShort one bigger*/
        Url.findOne({})
          .sort({ short: "desc" })
          .exec((err, data) => {
            if (!err && data != undefined) {
              inputShort = data.short + 1;
            }
            if (!err) {
              Url.findOneAndUpdate(
                { original: inputUrl },
                { original: inputUrl, short: inputShort },
                { new: true, upsert: true },
                (err, updatedUrl) => {
                  if (!err) {
                    responseObject["short_url"] = updatedUrl.short;
                    res.json(responseObject);
                  }
                }
              );
            }
          });
      }
    }
  );
});

app.get("/api/shorturl/:input", (req, res) => {
  let input = req.params.input;

  Url.findOne({ short: input }, (err, result) => {
    if (!err && result != undefined) {
      res.redirect(result.original);
    } else {
      res.json({ error: "URL does not exist" });
    }
  });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
