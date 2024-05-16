const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { ObjectId } = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
});

const Users = mongoose.model("Users", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Create new user in the database
app.post("/api/users", async (req, res) => {
  const userName = req.body.username;
  const newUser = new Users({
    username: userName,
  });
  await newUser.save();
  res.json(newUser);
});

// get all the users details
app.get("/api/users", async (req, res) => {
  const allUsers = await Users.find({});
  res.json(allUsers);
});

app.post("/api/users/:id/exercises", async (req, res) => {
  const userId = req.params.id;
  const description = req.body.description;
  const duration = req.body.duration;
  let date;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (req.body.date && regex.test(req.body.date)) {
    date = new Date(req.body.date);
  } else {
    date = new Date();
  }
  const user = await Users.findById(userId);
  if (!user) {
    res.json({ error: "User not found" });
  }
  const newExercise = new Exercise({
    userId: user._id,
    duration: duration,
    description: description,
    date: date,
  });
  await newExercise.save();
  res.json({
    username: user.username,
    description: newExercise.description,
    duration: newExercise.duration,
    date: newExercise.date.toDateString(),
    _id: user._id,
  });
});

app.get("/api/users/:id/logs", async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await Users.findById(userId);
    if (!user) {
      return res.json({ error: "User not found" });
    }

    let query = { userId: user._id };

    // Parse optional query parameters: from, to, and limit
    if (req.query.from || req.query.to) {
      query.date = {};
      if (req.query.from) {
        query.date.$gte = new Date(req.query.from);
      }
      if (req.query.to) {
        query.date.$lte = new Date(req.query.to);
      }
    }

    let logQuery = Exercise.find(query).select(
      "-_id description duration date"
    );

    if (req.query.limit) {
      const limit = parseInt(req.query.limit);
      logQuery = logQuery.limit(limit);
    }

    const log = await logQuery.exec();
    const filteredLog = log.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: filteredLog,
    });
  } catch (error) {
    console.error(error);
    res.json({ error: "Internal server error" });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
