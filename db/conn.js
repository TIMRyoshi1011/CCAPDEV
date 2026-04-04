import mongoose from 'mongoose';

const mongoURI = "mongodb://adminUser:adminUserPassword@ac-tcyvp62-shard-00-00.ccrzj8t.mongodb.net:27017,ac-tcyvp62-shard-00-01.ccrzj8t.mongodb.net:27017,ac-tcyvp62-shard-00-02.ccrzj8t.mongodb.net:27017/?ssl=true&replicaSet=atlas-10gktb-shard-0&authSource=admin&appName=Cluster0"

const connectToMongoose = async () => {
  try {
    await mongoose.connect(mongoURI, {
      dbName: 'forum'
    }); 
    console.log('Connected to MongoDB server');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

export default connectToMongoose;