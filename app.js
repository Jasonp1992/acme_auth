const express = require("express");
const app = express();
const {
  models: { User, Note },
} = require("./db");
const path = require("path");
require("dotenv").config();

const requireToken = async (req, res, next) => {
  try {
    const data = await User.byToken(req.headers.authorization);
    req.user = data;
    next();
  } catch (error) {
    next(error);
  }
};

// middleware
app.use(express.json());

// routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.post("/api/auth", async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth", requireToken, async (req, res, next) => {
  try {
    res.send(req.user);
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth/:userId/notes", requireToken, async (req, res, next) => {
  try {
    if (req.user.id === Number(req.params.userId)) {
      res.send(req.user.notes);
    } else {
      throw new Error("User id doesnt match");
    }
  } catch (ex) {
    next(ex);
  }
});

// error handling
app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
