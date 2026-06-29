import { Exclude } from 'class-transformer';

export type QueryParams = Record<string, any>;
export type SortParams = Record<string, 1 | -1>;

export type RelationType = 'belongsTo' | 'hasMany' | 'oneToOne' | 'manyToMany';

export interface RelationOptions {
  target?: string;
  as?: string;
  select?: string[];
}

export interface RelationMetadata {
  id: string;
  property: string;
  type: RelationType;
  target?: string;
  collection?: string;
  fk?: string;
  ownKey?: string;
  as?: string;
  select?: string[];
}

export type RelationLoad = RelationMetadata & { target: string };
export type RelationLoadInput = RelationLoad | RelationLoad[];

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
    relation: RelationLoadInput,
  ): Promise<any>;
  findOne(target: string, query: QueryParams): Promise<any>;
  findOneWithRel(
    target: string,
    query: QueryParams,
    relation: RelationLoadInput,
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

export function BelongsTo(
  key: string,
  options: RelationOptions | string[] = {},
) {
  return function (target: any, propertyKey): void {
    const normalizedOptions = normalizeRelationOptions(options);
    const relation: RelationMetadata = {
      id: `${propertyKey}:${key}:belongsTo`,
      property: propertyKey,
      target: normalizedOptions.target || key,
      type: 'belongsTo',
      as: normalizedOptions.as || (normalizedOptions.target ? key : undefined),
      select: normalizedOptions.select,
    };

    registerRelation(target, [key, relation.target, relation.as], relation);
  };
}

export function HasMany(
  key: string,
  fk: string,
  options: RelationOptions | string[] = {},
) {
  return function (target: any, propertyKey): void {
    const normalizedOptions = normalizeRelationOptions(options);
    const relation: RelationMetadata = {
      id: `${propertyKey}:${key}:hasMany`,
      property: propertyKey,
      target: normalizedOptions.target || key,
      fk,
      type: 'hasMany',
      as: normalizedOptions.as,
      select: normalizedOptions.select,
    };

    registerRelation(
      target,
      [propertyKey, key, relation.target, relation.as],
      relation,
    );
  };
}

export function OneToOne(
  key: string,
  fk: string,
  options: RelationOptions | string[] = {},
) {
  return function (target: any, propertyKey): void {
    const normalizedOptions = normalizeRelationOptions(options);
    const relation: RelationMetadata = {
      id: `${propertyKey}:${key}:oneToOne`,
      property: propertyKey,
      target: normalizedOptions.target || key,
      fk,
      type: 'oneToOne',
      as: normalizedOptions.as,
      select: normalizedOptions.select,
    };

    registerRelation(
      target,
      [propertyKey, key, relation.target, relation.as],
      relation,
    );
  };
}

export function ManyToMany(
  key: string,
  ownKey: string,
  fk: string,
  options: RelationOptions | string[] = {},
) {
  return function (target: any, propertyKey): void {
    const normalizedOptions = normalizeRelationOptions(options);
    const relation: RelationMetadata = {
      id: `${propertyKey}:${key}:manyToMany`,
      property: propertyKey,
      target: normalizedOptions.target || propertyKey,
      collection: key,
      ownKey,
      fk,
      type: 'manyToMany',
      as: normalizedOptions.as,
      select: normalizedOptions.select,
    };

    registerRelation(
      target,
      [propertyKey, relation.target, relation.as],
      relation,
    );
  };
}

export function PrimaryKey() {
  return function (target: any, propertyKey): void {
    target['_pk'] = propertyKey;
  };
}

function normalizeRelationOptions(
  options: RelationOptions | string[] = {},
): RelationOptions {
  if (Array.isArray(options)) {
    return { select: uniqueColumns(options) };
  }

  return {
    ...options,
    select: uniqueColumns(options.select),
  };
}

function registerRelation(
  target: any,
  keys: Array<string | undefined>,
  relation: RelationMetadata,
): void {
  target['relations'] = target['relations'] || {};

  Array.from(new Set(keys.filter(Boolean))).forEach((key) => {
    target['relations'][key] = relation;
  });
}

function uniqueColumns(columns?: string[]): string[] | undefined {
  if (!columns) return undefined;

  const normalized = Array.from(
    new Set(columns.map((column) => String(column).trim()).filter(Boolean)),
  );

  return normalized.length > 0 ? normalized : undefined;
}
