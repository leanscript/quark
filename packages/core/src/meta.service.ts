import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import {
  DatabaseServiceInterface,
  MetaModel,
  QueryParams,
  SearchServiceInterface,
  SortParams,
} from './interfaces';

type MetaModelConstructor = new (...args: any[]) => MetaModel & {
  syncing?: boolean;
};

@Injectable()
export class MetaService {
  constructor(
    @Inject('DatabaseService') private db: DatabaseServiceInterface,
    @Inject('SearchService') private search: SearchServiceInterface,
    @Inject(REQUEST) private request: any,
  ) {}

  getReq() {
    return this.request;
  }

  getRouteParams(): QueryParams {
    return this.request.params || {};
  }

  getBody() {
    return this.request.body || {};
  }

  getQueryParams(): QueryParams {
    return this.request.query || {};
  }

  getQueryParam(key: string) {
    return this.getQueryParams()[key] || null;
  }

  async getMany(
    target: string,
    page = 1,
    query: QueryParams = {},
    sort: SortParams = {},
  ) {
    return await this.db.find(target, query, page, sort);
  }

  async getManyWithRel(
    target: string,
    page = 1,
    query: QueryParams = {},
    sort: SortParams = {},
    relation,
  ) {
    return await this.db.findWithRel(target, query, page, sort, relation);
  }

  async countRows(target: string, query: QueryParams = {}) {
    return await this.db.count(target, query);
  }

  async getOne(target: string, query: QueryParams) {
    return await this.db.findOne(target, query);
  }

  async getOneWithRel(target: string, query: QueryParams, relation) {
    return await this.db.findOneWithRel(target, query, relation);
  }

  async addOne(
    target: string,
    data,
    schema: MetaModelConstructor | null = null,
  ) {
    const res = await this.db.add(target, data);
    const inserted = await this.resolveInserted(target, data, res, schema);

    await this.syncSearch(target, inserted, schema);

    return inserted;
  }

  async updateOne(
    target: string,
    query: QueryParams,
    data,
    schema: MetaModelConstructor | null = null,
  ) {
    await this.db.update(target, query, data);
    const updated = (await this.getOne(target, query)) || { ...query, ...data };

    await this.syncSearch(target, updated, schema);

    return updated;
  }

  async deleteOne(target: string, query: QueryParams) {
    return await this.db.deleteOne(target, query);
  }

  private async resolveInserted(
    target: string,
    data,
    result,
    schema: MetaModelConstructor | null,
  ) {
    if (!result || result.insertedId === undefined) return result || data;

    const pk = this.getPrimaryKey(schema);
    return (
      (await this.getOne(target, { [pk]: result.insertedId })) || {
        ...data,
        [pk]: result.insertedId,
      }
    );
  }

  private getPrimaryKey(schema: MetaModelConstructor | null): string {
    if (!schema) return 'id';
    return new schema().getPk();
  }

  private async syncSearch(
    target: string,
    data,
    schema: MetaModelConstructor | null,
  ) {
    if (!schema || !data) return;

    const model = new schema();
    if (model.syncing) await this.search.indexData(target, data);
  }
}
