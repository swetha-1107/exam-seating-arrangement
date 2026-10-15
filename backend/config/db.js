const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/exam_seating_system';
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host} (Database: ${conn.connection.name})`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('>> Troubleshooting Tips:');
    console.error('1. Check that MONGO_URI is set correctly in .env or Render environment variables.');
    console.error('2. In MongoDB Atlas, ensure Network Access allows 0.0.0.0/0 (Allow access from anywhere).');
    console.error('3. Ensure your MongoDB Atlas Database User has readWriteAnyDatabase or readWrite permissions.');
    process.exit(1);
  }
};

module.exports = connectDB;
