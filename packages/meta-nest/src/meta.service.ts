import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';

@Injectable()
export class MetaService {
  constructor(
    @Inject('DatabaseService') private db,
    @Inject('SearchService') private search,
    @Inject(REQUEST) private request
  ) {}

  async getReq() {
    return this.request
  }

  getRouteParams() {
    const req = this.request
    return req.params
  }

  getBody() {
    const req = this.request
    return req.body
  }

  getQueryParams() {
    const req = this.request
    return req.query
  }

  getQueryParam(key) {
    const req = this.request
    return req.query[key] || null
  }

  async getMany(target, page = 1, query = {}, sort = {}) {
    return await this.db.find(target, query, page, sort);
  }

  async getManyWithRel(target, page = 1, query = {}, sort = {}, relation) {
    return await this.db.findWithRel(target, query, page, sort, relation);
  }

  async countRows(target, query = {}) {
    return await this.db.count(target, query);
  }

  async getOne(target, query) {
    return await this.db.findOne(target, query);
  }

  async getOneWithRel(target, query, relation) {
    return await this.db.findOneWithRel(target, query, relation);
  }

  async addOne(target, query, schema = null) {
    const res = await this.db.add(target, query);
    const inserted = await this.getOne(target, { id: res.insertedId })

    if(schema) {
      const obj = new schema
      if(obj.syncing) await this.search.indexData(target, inserted)
    }

    return inserted;
  }

  async updateOne(target, query, data, schema = null) {
    const res = await this.db.update(target, query, data);
    const updated = { id: res.insertedId, ...data };

    if(schema) {
     const obj = new schema
     if(obj.syncing) await this.search.indexData(target, updated)
    }

    return updated;
  }

  async deleteOne(target: string, query: any, schema: any) {
    const res = await this.db.deleteOne(target, query);

    return res;
  }
}
