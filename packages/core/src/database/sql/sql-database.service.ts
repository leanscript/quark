import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  DatabaseServiceInterface,
  QueryParams,
  RelationLoad,
  RelationLoadInput,
  SortParams,
} from '../../interfaces';
import { SqlDatabaseServiceOptions, SqlDriver, SqlParameter } from './types';

type AggregateQuery =
  | string
  | { sql: string; params?: SqlParameter[] }
  | ((driver: SqlDriver, tableName: string) => Promise<any> | any);

@Injectable()
export class SqlDatabaseService
  implements DatabaseServiceInterface, OnModuleDestroy
{
  private readonly tableNameResolver;
  private readonly primaryKeyResolver;
  private readonly perPage: number;

  constructor(private readonly options: SqlDatabaseServiceOptions) {
    this.tableNameResolver = options.tableName || ((target: string) => target);
    this.primaryKeyResolver = options.primaryKey || 'id';
    this.perPage = options.perPage || 14;
  }

  async onModuleDestroy(): Promise<void> {
    await this.options.driver.close?.();
  }

  async find(
    target: string,
    query: QueryParams = {},
    page = 1,
    sort: SortParams = {},
  ): Promise<any> {
    return this.selectRows(
      target,
      query,
      sort,
      this.perPage,
      this.offset(page),
    );
  }

  async findWithRel(
    target: string,
    query: QueryParams,
    page: number,
    sort: SortParams,
    relation: RelationLoadInput,
  ): Promise<any> {
    const rows = await this.find(target, query, page, sort);
    return this.attachRelations(target, rows, relation);
  }

  async findOne(target: string, query: QueryParams): Promise<any> {
    const rows = await this.selectRows(target, query, {}, 1);
    return rows[0] || null;
  }

  async findOneWithRel(
    target: string,
    query: QueryParams,
    relation: RelationLoadInput,
  ): Promise<any> {
    const row = await this.findOne(target, query);
    if (!row) return null;

    const rows = await this.attachRelations(target, [row], relation);
    return rows[0] || null;
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
    return this.selectRows(target);
  }

  async add(target: string, data): Promise<any> {
    const columns = Object.keys(data);
    if (columns.length === 0) {
      throw new Error('Cannot insert an empty payload.');
    }

    const table = this.table(target);
    const params = columns.map((column) => data[column]) as SqlParameter[];
    const columnSql = columns.map((column) => this.column(column)).join(', ');
    const placeholderSql = columns.map(() => '?').join(', ');
    const primaryKey = this.primaryKey(target);
    const returningSql =
      this.driver.dialect === 'postgresql'
        ? ` RETURNING ${this.column(primaryKey)}`
        : '';

    const result = await this.driver.query(
      `INSERT INTO ${table} (${columnSql}) VALUES (${placeholderSql})${returningSql}`,
      params,
    );

    return {
      insertedId:
        result.rows[0]?.[primaryKey] || result.insertId || data[primaryKey],
      affectedRows: result.affectedRows,
    };
  }

  async addMany(target: string, data): Promise<any> {
    if (!Array.isArray(data) || data.length === 0) {
      return { insertedIds: [], affectedRows: 0 };
    }

    const columns = Object.keys(data[0]);
    if (columns.length === 0) {
      throw new Error('Cannot insert empty payloads.');
    }

    const table = this.table(target);
    const params = data.flatMap((row) =>
      columns.map((column) => row[column]),
    ) as SqlParameter[];
    const columnSql = columns.map((column) => this.column(column)).join(', ');
    const rowSql = `(${columns.map(() => '?').join(', ')})`;
    const valuesSql = data.map(() => rowSql).join(', ');
    const primaryKey = this.primaryKey(target);
    const returningSql =
      this.driver.dialect === 'postgresql'
        ? ` RETURNING ${this.column(primaryKey)}`
        : '';

    const result = await this.driver.query(
      `INSERT INTO ${table} (${columnSql}) VALUES ${valuesSql}${returningSql}`,
      params,
    );

    return {
      insertedId: result.insertId,
      insertedIds: result.rows.map((row) => row[primaryKey]),
      affectedRows: result.affectedRows,
    };
  }

  async update(target: string, query: QueryParams, data: any): Promise<any> {
    this.assertFilteredQuery(query, 'update');

    const columns = Object.keys(data);
    if (columns.length === 0) {
      return { affectedRows: 0 };
    }

    const table = this.table(target);
    const setParams = columns.map((column) => data[column]) as SqlParameter[];
    const setSql = columns
      .map((column) => `${this.column(column)} = ?`)
      .join(', ');
    const where = this.where(query);

    const result = await this.driver.query(
      `UPDATE ${table} SET ${setSql}${where.sql}`,
      [...setParams, ...where.params],
    );

    return { affectedRows: result.affectedRows };
  }

  async updateMany(target: string, query: QueryParams, update): Promise<any> {
    const columns = Object.keys(update);
    if (columns.length === 0) {
      return { affectedRows: 0 };
    }

    const table = this.table(target);
    const setParams = columns.map((column) => update[column]) as SqlParameter[];
    const setSql = columns
      .map((column) => `${this.column(column)} = ?`)
      .join(', ');
    const where = this.where(query);

    const result = await this.driver.query(
      `UPDATE ${table} SET ${setSql}${where.sql}`,
      [...setParams, ...where.params],
    );

    return { affectedRows: result.affectedRows };
  }

  async deleteOne(target: string, query: QueryParams): Promise<any> {
    this.assertFilteredQuery(query, 'deleteOne');

    const where = this.where(query);
    const result = await this.driver.query(
      `DELETE FROM ${this.table(target)}${where.sql}`,
      where.params,
    );

    return { affectedRows: result.affectedRows };
  }

  async count(target: string, query: QueryParams = {}): Promise<any> {
    const where = this.where(query);
    const result = await this.driver.query<{ count: string | number }>(
      `SELECT COUNT(*) AS ${this.column('count')} FROM ${this.table(target)}${where.sql}`,
      where.params,
    );

    return Number(result.rows[0]?.count || 0);
  }

  async aggregate(target: string, query: AggregateQuery): Promise<any> {
    if (typeof query === 'function') {
      return query(this.driver, this.table(target));
    }

    if (typeof query === 'string') {
      return (await this.driver.query(query)).rows;
    }

    return (await this.driver.query(query.sql, query.params || [])).rows;
  }

  protected get driver(): SqlDriver {
    return this.options.driver;
  }

  private async selectRows(
    target: string,
    query: QueryParams = {},
    sort: SortParams = {},
    limit?: number,
    offset?: number,
    columns?: string[],
  ): Promise<any[]> {
    const where = this.where(query);
    const orderBy = this.orderBy(sort);
    const paging = this.paging(limit, offset);
    const result = await this.driver.query(
      `SELECT ${this.columns(columns)} FROM ${this.table(target)}${where.sql}${orderBy.sql}${paging.sql}`,
      [...where.params, ...paging.params],
    );

    return result.rows;
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
    const relatedRows = await this.selectRows(
      relation.target,
      { [relatedPrimaryKey]: foreignKeys },
      {},
      undefined,
      undefined,
      this.requiredColumns(relation, [relatedPrimaryKey]),
    );
    const relatedById = this.indexBy(
      relatedRows,
      this.primaryKey(relation.target),
    );
    const property = this.relationProperty(relation);

    return rows.map((row) => ({
      ...row,
      [property]: this.projectRow(
        relatedById.get(String(row[relation.property])) || null,
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
    const relatedRows = await this.selectRows(
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
        grouped.get(String(row[primaryKey])) || [],
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
    const relatedRows = await this.selectRows(
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
        (grouped.get(String(row[primaryKey])) || [])[0] || null,
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
    const pivots = await this.selectRows(relation.collection, {
      [relation.ownKey]: ids,
    });
    const relatedIds = this.uniqueValues(pivots, relation.fk);
    const relatedRows = await this.selectRows(
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
      const ownerPivots = pivotsByOwner.get(String(row[primaryKey])) || [];
      const related = ownerPivots
        .map((pivot) => relatedById.get(String(pivot[relation.fk])))
        .filter(Boolean)
        .map((relatedRow) => this.projectRow(relatedRow, relation.select));

      return { ...row, [property]: related };
    });
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

  private where(query: QueryParams = {}) {
    const clauses: string[] = [];
    const params: SqlParameter[] = [];

    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined) return;

      const column = this.column(key);

      if (Array.isArray(value)) {
        if (value.length === 0) {
          clauses.push('1 = 0');
          return;
        }

        clauses.push(`${column} IN (${value.map(() => '?').join(', ')})`);
        params.push(...(value as SqlParameter[]));
        return;
      }

      if (value === null) {
        clauses.push(`${column} IS NULL`);
        return;
      }

      clauses.push(`${column} = ?`);
      params.push(value as SqlParameter);
    });

    return {
      sql: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private assertFilteredQuery(query: QueryParams, operation: string): void {
    const hasFilter = Object.values(query || {}).some(
      (value) => value !== undefined,
    );

    if (!hasFilter) {
      throw new Error(`${operation} requires at least one query filter.`);
    }
  }

  private orderBy(sort: SortParams = {}) {
    const columns = Object.entries(sort).map(([key, direction]) => {
      return `${this.column(key)} ${direction === -1 ? 'DESC' : 'ASC'}`;
    });

    return {
      sql: columns.length > 0 ? ` ORDER BY ${columns.join(', ')}` : '',
    };
  }

  private paging(limit?: number, offset?: number) {
    let sql = '';

    if (limit !== undefined) {
      sql += ` LIMIT ${this.sqlInteger(limit, 'limit')}`;
    }

    if (offset !== undefined) {
      sql += ` OFFSET ${this.sqlInteger(offset, 'offset')}`;
    }

    return { sql, params: [] as SqlParameter[] };
  }

  private offset(page: number): number {
    return (Math.max(1, Number(page) || 1) - 1) * this.perPage;
  }

  private sqlInteger(value: number, label: string): number {
    const parsed = Number(value);

    if (!Number.isSafeInteger(parsed) || parsed < 0) {
      throw new Error(`Invalid SQL ${label}: ${value}`);
    }

    return parsed;
  }

  private table(target: string): string {
    return this.driver.quoteIdentifier(this.tableNameResolver(target));
  }

  private columns(columns?: string[]): string {
    if (!columns?.length) return '*';

    const uniqueColumns = this.uniqueColumns(columns);
    if (uniqueColumns.length === 0) return '*';

    return uniqueColumns.map((column) => this.column(column)).join(', ');
  }

  private column(column: string): string {
    return this.driver.quoteIdentifier(column);
  }

  private primaryKey(target: string): string {
    if (typeof this.primaryKeyResolver === 'function') {
      return this.primaryKeyResolver(target);
    }

    return this.primaryKeyResolver;
  }

  private uniqueValues(rows: any[], key: string): SqlParameter[] {
    return Array.from(
      new Set(
        rows
          .map((row) => row[key])
          .filter((value) => value !== null && value !== undefined),
      ),
    ) as SqlParameter[];
  }

  private indexBy(rows: any[], key: string): Map<string, any> {
    return new Map(rows.map((row) => [String(row[key]), row]));
  }

  private groupBy(rows: any[], key: string): Map<string, any[]> {
    return rows.reduce((groups, row) => {
      const groupKey = String(row[key]);
      groups.set(groupKey, [...(groups.get(groupKey) || []), row]);
      return groups;
    }, new Map<string, any[]>());
  }

  private uniqueColumns(columns: string[]): string[] {
    return Array.from(
      new Set(columns.map((column) => String(column).trim()).filter(Boolean)),
    );
  }
}
