import { Controller, Injectable, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { IsString } from 'class-validator';
import request from 'supertest';
import {
  DatabaseServiceInterface,
  MetaController,
  MetaModel,
  MetaModule,
  QueryParams,
  SearchServiceInterface,
} from '../src';

class UserModel extends MetaModel {
  id: string;

  @IsString()
  name: string;
}

@Controller()
@MetaController({
  key: 'users',
  schema: UserModel,
  routes: ['GET', 'POST'],
})
class UsersController {}

@Injectable()
class MemoryDatabaseService implements DatabaseServiceInterface {
  private rows = [{ id: '1', name: 'Ada' }];

  async find(target: string, query: QueryParams = {}) {
    return this.rows.filter((row) => this.matches(row, query));
  }

  async findWithRel() {
    return [];
  }

  async findOne(target: string, query: QueryParams) {
    return this.rows.find((row) => this.matches(row, query)) || null;
  }

  async findOneWithRel(target: string, query: QueryParams) {
    return this.findOne(target, query);
  }

  async findById(target: string, id: string) {
    return this.findOne(target, { id });
  }

  async all() {
    return this.rows;
  }

  async add(target: string, data) {
    const id = String(this.rows.length + 1);
    this.rows.push({ id, ...data });
    return { insertedId: id };
  }

  async addMany(target: string, data) {
    return Promise.all(data.map((entry) => this.add(target, entry)));
  }

  async update(target: string, query: QueryParams, data) {
    this.rows = this.rows.map((row) =>
      this.matches(row, query) ? { ...row, ...data } : row,
    );
  }

  async updateMany(target: string, query: QueryParams, update) {
    return this.update(target, query, update);
  }

  async deleteOne(target: string, query: QueryParams) {
    this.rows = this.rows.filter((row) => !this.matches(row, query));
  }

  async count(target: string, query: QueryParams = {}) {
    return this.rows.filter((row) => this.matches(row, query)).length;
  }

  async aggregate() {
    return [];
  }

  private matches(row: QueryParams, query: QueryParams) {
    return Object.entries(query).every(([key, value]) => row[key] === value);
  }
}

@Injectable()
class NoopSearchService implements SearchServiceInterface {
  async indexData() {}

  async purgeIndex() {}
}

@Module({
  imports: [
    MetaModule.forRoot({
      DatabaseService: MemoryDatabaseService,
      SearchService: NoopSearchService,
    }),
  ],
  controllers: [UsersController],
})
class AppModule {}

describe('MetaController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('generates working CRUD routes from controller metadata', async () => {
    await request(app.getHttpServer())
      .get('/meta/users')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(1);
        expect(body.data[0]).toMatchObject({ id: '1', name: 'Ada' });
      });

    await request(app.getHttpServer())
      .post('/meta/users')
      .send({ name: 'Grace' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.data).toMatchObject({ id: '2', name: 'Grace' });
      });

    await request(app.getHttpServer())
      .get('/meta/users/2')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toMatchObject({ id: '2', name: 'Grace' });
      });
  });
});
