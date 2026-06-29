import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { MongoClient, ObjectId } from 'mongodb';
import { mongoConnection } from './database';

export const seedIds = {
  ada: new ObjectId('64f000000000000000000001'),
  grace: new ObjectId('64f000000000000000000002'),
  adaProfile: new ObjectId('64f000000000000000000101'),
  graceProfile: new ObjectId('64f000000000000000000102'),
  adaFirstPost: new ObjectId('64f000000000000000000201'),
  adaSecondPost: new ObjectId('64f000000000000000000202'),
  gracePost: new ObjectId('64f000000000000000000203'),
  adminRole: new ObjectId('64f000000000000000000301'),
  authorRole: new ObjectId('64f000000000000000000302'),
  adaAdminPivot: new ObjectId('64f000000000000000000401'),
  adaAuthorPivot: new ObjectId('64f000000000000000000402'),
  graceAuthorPivot: new ObjectId('64f000000000000000000403'),
};

@Injectable()
export class SchemaService implements OnApplicationBootstrap {
  async onApplicationBootstrap(): Promise<void> {
    const client = new MongoClient(mongoConnection.uri);

    try {
      await client.connect();
      const db = client.db(mongoConnection.database);

      await db
        .collection('profiles')
        .createIndex({ user_id: 1 }, { unique: true });
      await db.collection('posts').createIndex({ user_id: 1 });
      await db
        .collection('user_roles')
        .createIndex({ user_id: 1, role_id: 1 }, { unique: true });

      await db.collection('users').updateOne(
        { _id: seedIds.ada },
        {
          $setOnInsert: {
            _id: seedIds.ada,
            name: 'Ada Lovelace',
            email: 'ada@example.com',
          },
        },
        { upsert: true },
      );
      await db.collection('users').updateOne(
        { _id: seedIds.grace },
        {
          $setOnInsert: {
            _id: seedIds.grace,
            name: 'Grace Hopper',
            email: 'grace@example.com',
          },
        },
        { upsert: true },
      );

      await db.collection('profiles').updateOne(
        { _id: seedIds.adaProfile },
        {
          $setOnInsert: {
            _id: seedIds.adaProfile,
            user_id: seedIds.ada,
            bio: 'Wrote the first published computer program.',
          },
        },
        { upsert: true },
      );
      await db.collection('profiles').updateOne(
        { _id: seedIds.graceProfile },
        {
          $setOnInsert: {
            _id: seedIds.graceProfile,
            user_id: seedIds.grace,
            bio: 'Popularized machine-independent programming languages.',
          },
        },
        { upsert: true },
      );

      await db.collection('posts').updateOne(
        { _id: seedIds.adaFirstPost },
        {
          $setOnInsert: {
            _id: seedIds.adaFirstPost,
            user_id: seedIds.ada,
            title: 'Notes on the Analytical Engine',
            body: 'Long-form private draft.',
          },
        },
        { upsert: true },
      );
      await db.collection('posts').updateOne(
        { _id: seedIds.adaSecondPost },
        {
          $setOnInsert: {
            _id: seedIds.adaSecondPost,
            user_id: seedIds.ada,
            title: 'Loops before loops',
            body: 'Implementation notes.',
          },
        },
        { upsert: true },
      );
      await db.collection('posts').updateOne(
        { _id: seedIds.gracePost },
        {
          $setOnInsert: {
            _id: seedIds.gracePost,
            user_id: seedIds.grace,
            title: 'Debugging the Mark II',
            body: 'Incident report.',
          },
        },
        { upsert: true },
      );

      await db.collection('roles').updateOne(
        { _id: seedIds.adminRole },
        {
          $setOnInsert: {
            _id: seedIds.adminRole,
            name: 'admin',
            internal_code: 'ROLE_ADMIN_PRIVATE',
          },
        },
        { upsert: true },
      );
      await db.collection('roles').updateOne(
        { _id: seedIds.authorRole },
        {
          $setOnInsert: {
            _id: seedIds.authorRole,
            name: 'author',
            internal_code: 'ROLE_AUTHOR_PRIVATE',
          },
        },
        { upsert: true },
      );

      await db.collection('user_roles').updateOne(
        { _id: seedIds.adaAdminPivot },
        {
          $setOnInsert: {
            _id: seedIds.adaAdminPivot,
            user_id: seedIds.ada,
            role_id: seedIds.adminRole,
          },
        },
        { upsert: true },
      );
      await db.collection('user_roles').updateOne(
        { _id: seedIds.adaAuthorPivot },
        {
          $setOnInsert: {
            _id: seedIds.adaAuthorPivot,
            user_id: seedIds.ada,
            role_id: seedIds.authorRole,
          },
        },
        { upsert: true },
      );
      await db.collection('user_roles').updateOne(
        { _id: seedIds.graceAuthorPivot },
        {
          $setOnInsert: {
            _id: seedIds.graceAuthorPivot,
            user_id: seedIds.grace,
            role_id: seedIds.authorRole,
          },
        },
        { upsert: true },
      );
    } finally {
      await client.close();
    }
  }
}
