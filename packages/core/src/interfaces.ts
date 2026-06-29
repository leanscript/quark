import { Exclude } from 'class-transformer';

export type QueryParams = Record<string, any>;
export type SortParams = Record<string, 1 | -1>;

export interface RelationMetadata {
  id: string;
  property: string;
  type: 'belongsTo' | 'hasMany' | 'manyToMany';
  collection?: string;
  fk?: string;
  ownKey?: string;
}

export interface SearchServiceInterface {
  indexData(target: string, data: any, SerializerCallback?: any): Promise<void>;
  purgeIndex(target: string): Promise<void>;
}

export interface DatabaseServiceInterface {
  find(
    target: string,
    query?: QueryParams,
    page?: number,
    sort?: SortParams,
  ): Promise<any>;
  findWithRel(
    target: string,
    query: QueryParams,
    page: number,
    sort: SortParams,
    relation: RelationMetadata & { target: string },
  ): Promise<any>;
  findOne(target: string, query: QueryParams): Promise<any>;
  findOneWithRel(
    target: string,
    query: QueryParams,
    relation: RelationMetadata & { target: string },
  ): Promise<any>;
  findById(target: string, id: any, query?: QueryParams): Promise<any>;
  all(target: string): Promise<any>;

  add(target: string, data): Promise<any>;
  addMany(target: string, data): Promise<any>;

  update(target: string, query: QueryParams, data: any): Promise<any>;
  updateMany(target: string, query, update): Promise<any>;
  deleteOne(target: string, query: QueryParams): Promise<any>;

  count(target: string, query?: QueryParams): Promise<any>;

  aggregate(target: string, query: any): Promise<any>;
}

export class MetaModel {
  public relations?: Record<string, RelationMetadata>;

  @Exclude()
  public _pk?: string;

  loadRelation(target: string): RelationMetadata | null {
    return this.relations?.[target] || null;
  }

  getPk(): string {
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
