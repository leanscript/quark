import { createMongoDatabaseService } from '@quark/core';

export const mongoConnection = {
  uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  database: process.env.MONGODB_DATABASE || 'quark',
};

export const DatabaseService = createMongoDatabaseService(mongoConnection);
