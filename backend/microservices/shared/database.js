import mongoose from 'mongoose';
import config from './config.js';

let connectionPromise;

export const connectToDatabase = async (serviceName) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    mongoose.set('strictQuery', true);
    connectionPromise = mongoose.connect(config.mongoUri, {
      dbName: config.databaseName,
    });
  }

  const connection = await connectionPromise;
  console.log(
    `[${serviceName}] MongoDB connected at ${connection.connection.host}/${connection.connection.name}`,
  );

  return connection;
};

export default connectToDatabase;
