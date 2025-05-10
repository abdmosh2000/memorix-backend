/* eslint-disable no-process-exit */
const mongoose = require('mongoose');
const config = require('./config');

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('MongoDB URI from config:', config.database.uri);
        
    const conn = await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

module.exports = { connectDB };
