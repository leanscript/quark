import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  Collection,
  Db,
  Document,
  Filter,
  MongoClient,
  ObjectId,
} from 'mongodb';
import {
  DatabaseServiceInterface,
  QueryParams,
  RelationLoad,
  RelationLoadInput,
  SortParams,
} from '../../interfaces';
import { MongoDatabaseServiceOptions } from './types';

type AggregateQuery =
  | Document[]
  | { pipeline: Document[] }
  | ((db: Db, collection: Collection) => Promise<any> | any);

@Injectable()
export class MongoDatabaseService
  implements DatabaseServiceInterface, OnModuleDestroy
{
  private readonly collectionNameResolver;
  private readonly primaryKeyResolver;
  private readonly perPage: number;
  private readonly idAlias: string | false;
  private client: MongoClient | null = null;
  private dbPromise: Promise<Db> | null = null;
  private ownsClient = false;

  constructor(private readonly options: MongoDatabaseServiceOptions) {
    this.collectionNameResolver =
      options.collectionName || ((target: string) => target);
    this.primaryKeyResolver = options.primaryKey || '_id';
    this.perPage = options.perPage || 14;
    this.idAlias = options.idAlias === undefined ? 'id' : options.idAlias;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client && (this.ownsClient || this.options.closeClient)) {
      await this.client.close();
    }
  }

  async find(
    target: string,
    query: QueryParams = {},
    page = 1,
    sort: SortParams = {},
  ): Promise<any> {
    const rows = await this.findDocuments(
      target,
      query,
      sort,
      this.perPage,
      this.offset(page),
    );

    return this.serializeRows(rows);
  }

  async findWithRel(
    target: string,
    query: QueryParams,
    page: number,
    sort: SortParams,
    relation: RelationLoadInput,
  ): Promise<any> {
    const rows = await this.findDocuments(
      target,
      query,
      sort,
      this.perPage,
      this.offset(page),
    );
    const rowsWithRelations = await this.attachRelations(
      target,
      rows,
      relation,
    );

    return this.serializeRows(rowsWithRelations);
  }

  async findOne(target: string, query: QueryParams): Promise<any> {
    const row = await this.findDocument(target, query);
    return this.serializeDocument(row);
  }

  async findOneWithRel(
    target: string,
    query: QueryParams,
    relation: RelationLoadInput,
  ): Promise<any> {
    const row = await this.findDocument(target, query);
    if (!row) return null;

    const rows = await this.attachRelations(target, [row], relation);
    return this.serializeDocument(rows[0] || null);
  }

  async findById(
    target: string,
    id: any,
    query: QueryParams = {},
  ): Promise<any> {
    return this.findOne(target, {
      ...query,
      [this.primaryKey(target)]: id,
    });
  }

  async all(target: string): Promise<any> {
    const rows = await this.findDocuments(target);
    return this.serializeRows(rows);
  }

  async add(target: string, data): Promise<any> {
    const collection = await this.collection(target);
    const result = await collection.insertOne(data);

    return {
      insertedId: result.insertedId,
      affectedRows: result.acknowledged ? 1 : 0,
    };
  }

  async addMany(target: string, data): Promise<any> {
    if (!Array.isArray(data) || data.length === 0) {
      return { insertedIds: [], affectedRows: 0 };
    }

    const collection = await this.collection(target);
    const result = await collection.insertMany(data);

    return {
      insertedIds: Object.values(result.insertedIds),
      affectedRows: result.insertedCount,
    };
  }

  async update(target: string, query: QueryParams, data: any): Promise<any> {
    this.assertFilteredQuery(query, 'update');

    if (Object.keys(data).length === 0) {
      return { affectedRows: 0 };
    }

    const collection = await this.collection(target);
    const result = await collection.updateOne(this.filter(target, query), {
      $set: data,
    });

    return { affectedRows: result.modifiedCount };
  }

  async updateMany(target: string, query: QueryParams, update): Promise<any> {
    if (Object.keys(update).length === 0) {
      return { affectedRows: 0 };
    }

    const collection = await this.collection(target);
    const result = await collection.updateMany(this.filter(target, query), {
      $set: update,
    });

    return { affectedRows: result.modifiedCount };
  }

  async deleteOne(target: string, query: QueryParams): Promise<any> {
    this.assertFilteredQuery(query, 'deleteOne');

    const collection = await this.collection(target);
    const result = await collection.deleteOne(this.filter(target, query));

    return { affectedRows: result.deletedCount };
  }

  async count(target: string, query: QueryParams = {}): Promise<any> {
    const collection = await this.collection(target);
    return collection.countDocuments(this.filter(target, query));
  }

  async aggregate(target: string, query: AggregateQuery): Promise<any> {
    const db = await this.database();
    const collection = await this.collection(target);

    if (typeof query === 'function') {
      return query(db, collection);
    }

    const pipeline = Array.isArray(query) ? query : query.pipeline;
    return collection.aggregate(pipeline).toArray();
  }

  private async findDocuments(
    target: string,
    query: QueryParams = {},
    sort: SortParams = {},
    limit?: number,
    offset?: number,
    columns?: string[],
  ): Promise<any[]> {
    const collection = await this.collection(target);
    let cursor = collection.find(this.filter(target, query), {
      projection: this.projection(columns),
    });

    if (Object.keys(sort).length > 0) {
      cursor = cursor.sort(sort);
    }

    if (offset !== undefined) {
      cursor = cursor.skip(offset);
    }

    if (limit !== undefined) {
      cursor = cursor.limit(limit);
    }

    return cursor.toArray();
  }

  private async findDocument(
    target: string,
    query: QueryParams = {},
    columns?: string[],
  ): Promise<any> {
    const collection = await this.collection(target);
    return collection.findOne(this.filter(target, query), {
      projection: this.projection(columns),
    });
  }

  private async attachRelations(
    target: string,
    rows: any[],
    relationInput: RelationLoadInput,
  ): Promise<any[]> {
    const baseRows = rows.map((row) => ({ ...row }));
    if (baseRows.length === 0) return baseRows;

    let rowsWithRelations = baseRows;

    for (const relation of this.normalizeRelations(relationInput)) {
      rowsWithRelations = await this.attachRelation(
        target,
        rowsWithRelations,
        relation,
      );
    }

    return rowsWithRelations;
  }

  private async attachRelation(
    target: string,
    rows: any[],
    relation: RelationLoad,
  ): Promise<any[]> {
    if (relation.type === 'belongsTo') {
      return this.attachBelongsTo(rows, relation);
    }

    if (relation.type === 'hasMany') {
      return this.attachHasMany(target, rows, relation);
    }

    if (relation.type === 'oneToOne') {
      return this.attachOneToOne(target, rows, relation);
    }

    return this.attachManyToMany(target, rows, relation);
  }

  private async attachBelongsTo(
    rows: any[],
    relation: RelationLoad,
  ): Promise<any[]> {
    const foreignKeys = this.uniqueValues(rows, relation.property);
    const relatedPrimaryKey = this.primaryKey(relation.target);
    const relatedRows = await this.findDocuments(
      relation.target,
      { [relatedPrimaryKey]: foreignKeys },
      {},
      undefined,
      undefined,
      this.requiredColumns(relation, [relatedPrimaryKey]),
    );
    const relatedById = this.indexBy(relatedRows, relatedPrimaryKey);
    const property = this.relationProperty(relation);

    return rows.map((row) => ({
      ...row,
      [property]: this.projectRow(
        relatedById.get(this.mapKey(row[relation.property])) || null,
        relation.select,
      ),
    }));
  }

  private async attachHasMany(
    target: string,
    rows: any[],
    relation: RelationLoad,
  ): Promise<any[]> {
    if (!relation.fk) return rows;

    const primaryKey = this.primaryKey(target);
    const ids = this.uniqueValues(rows, primaryKey);
    const relatedRows = await this.findDocuments(
      relation.target,
      { [relation.fk]: ids },
      {},
      undefined,
      undefined,
      this.requiredColumns(relation, [relation.fk]),
    );
    const grouped = this.groupBy(relatedRows, relation.fk);
    const property = this.relationProperty(relation);

    return rows.map((row) => ({
      ...row,
      [property]: this.projectRows(
        grouped.get(this.mapKey(row[primaryKey])) || [],
        relation.select,
      ),
    }));
  }

  private async attachOneToOne(
    target: string,
    rows: any[],
    relation: RelationLoad,
  ): Promise<any[]> {
    if (!relation.fk) return rows;

    const primaryKey = this.primaryKey(target);
    const ids = this.uniqueValues(rows, primaryKey);
    const relatedRows = await this.findDocuments(
      relation.target,
      { [relation.fk]: ids },
      {},
      undefined,
      undefined,
      this.requiredColumns(relation, [relation.fk]),
    );
    const grouped = this.groupBy(relatedRows, relation.fk);
    const property = this.relationProperty(relation);

    return rows.map((row) => ({
      ...row,
      [property]: this.projectRow(
        (grouped.get(this.mapKey(row[primaryKey])) || [])[0] || null,
        relation.select,
      ),
    }));
  }

  private async attachManyToMany(
    target: string,
    rows: any[],
    relation: RelationLoad,
  ): Promise<any[]> {
    if (!relation.collection || !relation.ownKey || !relation.fk) return rows;

    const primaryKey = this.primaryKey(target);
    const relatedPrimaryKey = this.primaryKey(relation.target);
    const ids = this.uniqueValues(rows, primaryKey);
    const pivots = await this.findDocuments(relation.collection, {
      [relation.ownKey]: ids,
    });
    const relatedIds = this.uniqueValues(pivots, relation.fk);
    const relatedRows = await this.findDocuments(
      relation.target,
      { [relatedPrimaryKey]: relatedIds },
      {},
      undefined,
      undefined,
      this.requiredColumns(relation, [relatedPrimaryKey]),
    );
    const relatedById = this.indexBy(relatedRows, relatedPrimaryKey);
    const pivotsByOwner = this.groupBy(pivots, relation.ownKey);
    const property = this.relationProperty(relation);

    return rows.map((row) => {
      const ownerPivots = pivotsByOwner.get(this.mapKey(row[primaryKey])) || [];
      const related = ownerPivots
        .map((pivot) => relatedById.get(this.mapKey(pivot[relation.fk])))
        .filter(Boolean)
        .map((relatedRow) => this.projectRow(relatedRow, relation.select));

      return { ...row, [property]: related };
    });
  }

  private serializeRows(rows: any[]): any[] {
    return rows.map((row) => this.serializeDocument(row));
  }

  private serializeDocument(document: any): any {
    if (!document || typeof document !== 'object') return document;

    if (document instanceof ObjectId) {
      return document.toHexString();
    }

    if (document instanceof Date) {
      return document;
    }

    if (Array.isArray(document)) {
      return document.map((entry) => this.serializeDocument(entry));
    }

    const serialized = {};

    if (this.idAlias && document._id !== undefined) {
      serialized[this.idAlias] = this.serializeDocument(document._id);
    }

    Object.entries(document).forEach(([key, value]) => {
      if (key === '_id' && this.idAlias) return;
      serialized[key] = this.serializeDocument(value);
    });

    return serialized;
  }

  private async collection(target: string): Promise<Collection> {
    const db = await this.database();
    return db.collection(this.collectionNameResolver(target));
  }

  private async database(): Promise<Db> {
    if (this.options.db) return this.options.db;

    if (!this.dbPromise) {
      this.dbPromise = this.connect();
    }

    return this.dbPromise;
  }

  private async connect(): Promise<Db> {
    if (this.options.client) {
      this.client = this.options.client;
      return this.client.db(this.options.database);
    }

    if (!this.options.uri) {
      throw new Error('MongoDatabaseService requires `uri`, `client` or `db`.');
    }

    this.client = new MongoClient(this.options.uri);
    this.ownsClient = true;
    await this.client.connect();

    return this.client.db(this.options.database);
  }

  private filter(target: string, query: QueryParams = {}): Filter<Document> {
    return Object.entries(query).reduce((filter, [key, value]) => {
      if (value === undefined) return filter;

      if (Array.isArray(value)) {
        filter[key] = {
          $in: value.map((entry) =>
            this.normalizeQueryValue(target, key, entry),
          ),
        };
        return filter;
      }

      filter[key] = this.normalizeQueryValue(target, key, value);
      return filter;
    }, {});
  }

  private projection(columns?: string[]): Document | undefined {
    const uniqueColumns = this.uniqueColumns(columns || []);
    if (uniqueColumns.length === 0) return undefined;

    const projection = uniqueColumns.reduce((result, column) => {
      result[column] = 1;
      return result;
    }, {});

    if (!uniqueColumns.includes('_id')) {
      projection['_id'] = 0;
    }

    return projection;
  }

  private normalizeQueryValue(target: string, key: string, value: any): any {
    if (this.shouldConvertObjectId(target, key, value)) {
      return new ObjectId(value);
    }

    return value;
  }

  private shouldConvertObjectId(
    target: string,
    key: string,
    value: any,
  ): boolean {
    if (typeof value !== 'string' || !ObjectId.isValid(value)) {
      return false;
    }

    return key === '_id' || this.objectIdFields(target).has(key);
  }

  private objectIdFields(target: string): Set<string> {
    const fields = this.options.objectIdFields;

    if (!fields) return new Set();
    if (Array.isArray(fields)) return new Set(fields);

    return new Set(fields(target));
  }

  private assertFilteredQuery(query: QueryParams, operation: string): void {
    const hasFilter = Object.values(query || {}).some(
      (value) => value !== undefined,
    );

    if (!hasFilter) {
      throw new Error(`${operation} requires at least one query filter.`);
    }
  }

  private normalizeRelations(relationInput: RelationLoadInput): RelationLoad[] {
    return (Array.isArray(relationInput) ? relationInput : [relationInput])
      .filter(Boolean)
      .map((relation) => ({
        ...relation,
        target: relation.target || relation.property,
      }));
  }

  private requiredColumns(
    relation: RelationLoad,
    columns: string[],
  ): string[] | undefined {
    if (!relation.select?.length) return undefined;
    return this.uniqueColumns([...relation.select, ...columns]);
  }

  private relationProperty(relation: RelationLoad): string {
    if (relation.as) return relation.as;
    if (relation.type === 'belongsTo') return relation.target;
    return relation.property;
  }

  private projectRows(rows: any[], columns?: string[]): any[] {
    return rows.map((row) => this.projectRow(row, columns));
  }

  private projectRow(row: any, columns?: string[]): any {
    if (!row || !columns?.length) return row;

    return columns.reduce((projected, column) => {
      if (Object.prototype.hasOwnProperty.call(row, column)) {
        projected[column] = row[column];
      }

      return projected;
    }, {});
  }

  private offset(page: number): number {
    return (Math.max(1, Number(page) || 1) - 1) * this.perPage;
  }

  private primaryKey(target: string): string {
    if (typeof this.primaryKeyResolver === 'function') {
      return this.primaryKeyResolver(target);
    }

    return this.primaryKeyResolver;
  }

  private uniqueValues(rows: any[], key: string): any[] {
    const seen = new Set<string>();
    const values: any[] = [];

    rows.forEach((row) => {
      const value = row[key];
      if (value === null || value === undefined) return;

      const mapKey = this.mapKey(value);
      if (seen.has(mapKey)) return;

      seen.add(mapKey);
      values.push(value);
    });

    return values;
  }

  private indexBy(rows: any[], key: string): Map<string, any> {
    return new Map(rows.map((row) => [this.mapKey(row[key]), row]));
  }

  private groupBy(rows: any[], key: string): Map<string, any[]> {
    return rows.reduce((groups, row) => {
      const groupKey = this.mapKey(row[key]);
      groups.set(groupKey, [...(groups.get(groupKey) || []), row]);
      return groups;
    }, new Map<string, any[]>());
  }

  private mapKey(value: any): string {
    return value instanceof ObjectId ? value.toHexString() : String(value);
  }

  private uniqueColumns(columns: string[]): string[] {
    return Array.from(
      new Set(columns.map((column) => String(column).trim()).filter(Boolean)),
    );
  }
}
