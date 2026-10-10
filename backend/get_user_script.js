import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const user = await mongoose.connection.collection('users').findOne({});
    console.log("Found User ID:", user._id.toString());
    process.exit(0);
  });
