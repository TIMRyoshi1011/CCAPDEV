import mongoose from 'mongoose';
import 'dotenv/config';

const mongoURI = process.env.MONGODB_URL;
const dbName = process.env.DB_NAME;

const connectToMongoose = async () => {
  try {
    await mongoose.connect(mongoURI, {
      dbName: dbName
    }); 
    console.log('Connected to MongoDB server');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export default connectToMongoose;