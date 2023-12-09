import { Injectable, Inject } from '@nestjs/common';
import { MongoClient, ObjectId } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import { SearchService } from './search.service';
import { DatabaseServiceInterface } from 'meta-nest'

@Injectable()
export class DatabaseService implements DatabaseServiceInterface {
  private database = null;
  private client = null;

  constructor(
    private configService: ConfigService,
    @Inject('SearchService') private searchService: SearchService,
  ) {
    const url = this.configService.get<string>('MONGO_CONNECTION_STRING');
    this.database = this.configService.get<string>('MONGO_DATABASE_NAME');

    this.client = new MongoClient(url);
  }

  async getConnection() {
    await this.client.connect();
    return await this.client.db(this.database);
  }

  async closeClient() {
    return await this.client.close();
  }

  async purgeDatabase() {
    await (await this.getConnection()).dropDatabase();
  }

  async addMany(target: string, data) {
    const collection = (await this.getConnection()).collection(target);
    const insertResult = await collection.insertMany([...data]);
    await this.closeClient();
    return insertResult;
  }

  async updateMany(target: string, query, update) {
    const collection = (await this.getConnection()).collection(target);
    const insertResult = await collection.updateMany(query, update);
    await this.closeClient();
    return insertResult;
  }

  async add(target: string, data) {
    const collection = (await this.getConnection()).collection(target);
    const res = await collection.insertOne({ ...data });
    await this.closeClient();
    return res;
  }

  async update(target: string, query, data) {
    const collection = (await this.getConnection()).collection(target);

    if(query._id) { delete query._id }

    const res = await collection.updateOne({ ...query }, { $set: { ...data } });
    await this.closeClient();
    return res;
  }

  async all(target: string) {
    const collection = (await this.getConnection()).collection(target);
    const data = await collection.find({}).toArray();
    await this.closeClient();
    return data;
  }

  async count(target: string, query = {}) {
    const collection = (await this.getConnection()).collection(target);
    const data = await collection
    .countDocuments({ ...query });
    await this.closeClient();
    return data;
  }
  async find(target: string, query = {}, page = 1, sort = {}) {

    const collection = (await this.getConnection()).collection(target);

    if(page < 1) { page = 1 }

    const data = await collection
    .find({ ...query })
    .sort(sort)
    .limit(14)
    .skip((page - 1) * 14)
    .toArray();

    await this.closeClient();
    return data;
  }

  async findWithRel(target: string, query = {}, page = 1, sort = {}, relation = null) {

    const outputTarget = relation.property.replace('_id', '');

    if(relation.type === "belongsTo") {
      const res = await this.aggregate(target, [
        { $match : query },
        {
          $lookup: {
            from: relation.target,
            localField: relation.property,
            foreignField: '_id',
            as: outputTarget,
            pipeline: [ { $limit: 1 } ]
          },
        },
        { $unwind: `$${outputTarget}` },
        { $limit : 14 },
        {$skip: (page - 1) * 14}
      ])
      return res;
    }

    if(relation.type === "manyToMany") {
      // https://stackoverflow.com/questions/56923505/mongodb-many-to-many-get-related-items

      const res = await this.aggregate(target, [
        { $match : query },
        {
             $lookup: {
                 from: relation.collection, // users_projects
                 localField: "_id", // fk
                 foreignField: relation.ownKey, // relation.ownKey
                 as: relation.collection // users_projects
             }
         },
         {
             $lookup : {
                 from : relation.property, // projects
                 localField : `${relation.collection}.${relation.fk}`, // `${relation.collection}.${relation.fk}` $users_projects.project_id
                 foreignField : "_id", // fk
                 as : relation.property // project
             }
         },
         { $unset: relation.collection } //  relation.collection
       ])

      return res;
    }

    if(relation.type === "hasMany") {
      const res = await this.aggregate(target, [
        { $match : query },
        {
          $lookup: {
            from: relation.target,
            localField: '_id',
            foreignField: relation.fk,
            as: relation.property,
          },
        },
        { $unwind: `$${relation.property}` },
        { $limit : 14 },
        {$skip: (page - 1) * 14}
      ])
      return res;
    }


  }

  async deleteOne(target: string, query: any) {

    const collection = (await this.getConnection()).collection(target);

    if(query._id) query._id = new ObjectId(query._id)

    const data = await collection.deleteOne({ ...query });

    await this.closeClient();

    return true;
  }

  async findOne(target: string, query) {
    const collection = (await this.getConnection()).collection(target);

    if(query._id) query._id = new ObjectId(query._id)

    const data = await collection.find({ ...query }).limit(1).toArray();

    await this.closeClient();

    return data[0];
  }

  async findOneWithRel(target: string, query, relation) {

    if(query._id) query._id = new ObjectId(query._id)

    const res = await this.aggregate(target, [{
      $lookup: {
        from: relation.target,
        localField: relation.property,
        foreignField: '_id',
        as: relation.property
      },
    },
    { $unwind: `$${relation.property}` },
    { $limit : 1 }
    ])
    return res[0];
  }

  async findById(target: string, id, query = {}) {
    const collection = (await this.getConnection()).collection(target);

    const data = await collection
      .find({ _id: new ObjectId(id), ...query })
      .toArray();

    await this.closeClient();

    return data[0];
  }

  async aggregate(target: string, query) {
    const collection = (await this.getConnection()).collection(target);

    const data = await collection.aggregate(query).toArray();

    await this.closeClient();

    return data;
  }
}
