const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const SALT_COUNT = 5;
const SECRET_WORD = process.env.JWT;

const config = {
  logging: false,
};

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("notes", {
  text: STRING,
});

User.hasMany(Note);
Note.belongsTo(User);

User.byToken = async (token) => {
  try {
    const isVerified = jwt.verify(token, SECRET_WORD);
    const { id } = isVerified;
    return await User.findOne({ where: { id }, include: Note });
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({ where: { username } });
  const isValid = bcrypt.compare(password, user.password);
  if (isValid) {
    return jwt.sign({ id: user.id }, SECRET_WORD);
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_COUNT);
};

User.beforeCreate(async (credential) => {
  credential.password = await hashPassword(credential.password);
});

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];

  const [lucy, moe, larry] = await Promise.all(
    credentials.map(async (credential) => {
      return User.create(credential);
    })
  );

  const notes = [{ text: "note 1" }, { text: "note 2" }, { text: "note 3" }];

  const [note1, note2, note3] = await Promise.all(
    notes.map(async (note) => {
      return Note.create(note);
    })
  );

  await note1.setUser(lucy);
  await note2.setUser(moe);
  await note3.setUser(moe);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
    notes: {
      note1,
      note2,
      note3,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
