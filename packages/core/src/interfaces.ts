import { Exclude } from 'class-transformer';

export interface SearchServiceInterface {
  indexData(target: string, data: any, SerializerCallback?: any): Promise<void>;
  purgeIndex(target: string): Promise<void>;
}

export interface DatabaseServiceInterface {
  find(target: string, query?: any, page?: number, sort?: any): Promise<any>;
  findOne(target: string, query: any): Promise<any>;
  findById(target: string, id: any, query?: any): Promise<any>;
  all(target: string): Promise<any>;

  add(target: string, data): Promise<any>;
  addMany(target: string, data): Promise<any>;

  update(target: string, query: any, data: any): Promise<any>;
  updateMany(target: string, query, update): Promise<any>;

  count(target: string, query?: any): Promise<any>;

  aggregate(target: string, query: any): Promise<any>;
}

export class MetaModel {
  public relations: {};

  @Exclude()
  public _pk;

  loadRelation(target: string) {
    if (this.relations[target]) return this.relations[target];
    return null;
  }

  getPk() {
    if (!this._pk) return 'id';
    return this._pk;
  }
}

export function BelongsTo(key: string) {
  return function (target: any, propertyKey): void {
    const id = `${propertyKey}:${key}:belongsTo`;
    target['relations'] = target['relations'] || {};
    target['relations'][key] = { id, property: propertyKey, type: 'belongsTo' };
  };
}

export function HasMany(key: string, fk: string) {
  return function (target: any, propertyKey): void {
    const id = `${propertyKey}:${key}:hasMany`;
    target['relations'] = target['relations'] || {};
    target['relations'][key] = {
      id,
      property: propertyKey,
      fk,
      type: 'hasMany',
    };
  };
}

export function ManyToMany(key: string, ownKey: string, fk: string) {
  return function (target: any, propertyKey): void {
    const id = `${propertyKey}:${key}:manyToMany`;
    target['relations'] = target['relations'] || {};
    target['relations'][propertyKey] = {
      id,
      property: propertyKey,
      collection: key,
      ownKey,
      fk,
      type: 'manyToMany',
    };
  };
}

export function PrimaryKey() {
  return function (target: any, propertyKey): void {
    target['_pk'] = propertyKey;
  };
}
