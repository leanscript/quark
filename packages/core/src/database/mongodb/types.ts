import { Type } from '@nestjs/common';
import { Db, MongoClient } from 'mongodb';
import { DatabaseServiceInterface } from '../../interfaces';

export type CollectionNameResolver = (target: string) => string;
export type MongoPrimaryKeyResolver = string | ((target: string) => string);
export type ObjectIdFieldResolver = string[] | ((target: string) => string[]);

export interface MongoDatabaseServiceOptions {
  uri?: string;
  client?: MongoClient;
  db?: Db;
  database?: string;
  collectionName?: CollectionNameResolver;
  primaryKey?: MongoPrimaryKeyResolver;
  objectIdFields?: ObjectIdFieldResolver;
  idAlias?: string | false;
  perPage?: number;
  closeClient?: boolean;
}

export type MongoDatabaseServiceType = Type<DatabaseServiceInterface>;
