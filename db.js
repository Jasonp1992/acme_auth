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

User.byToken = async (token) => {
  try {
    const isVerified = jwt.verify(token, SECRET_WORD);
    const { id } = isVerified;
    return await User.findByPk(id);
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
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
      User.create(credential);
    })
  );
  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};
