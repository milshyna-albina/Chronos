const mongoose = require('mongoose');

const initDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    console.error(`DB error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = initDB;