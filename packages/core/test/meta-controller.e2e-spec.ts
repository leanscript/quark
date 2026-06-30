import { Controller, Injectable, Module } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import request from 'supertest';
import {
  DatabaseServiceInterface,
  HasMany,
  MetaController,
  MetaModel,
  MetaModule,
  PrimaryKey,
  QueryParams,
  SearchServiceInterface,
} from '../src';

class UserModel extends MetaModel {
  @PrimaryKey()
  @IsOptional()
  id: string;

  @IsString()
  @Length(2, 80)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @HasMany('posts', 'userId', { select: ['id', 'title'] })
  posts?: any[];
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

  it('documents generated routes with inferred entity schemas', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Quark test').build(),
      { autoTagControllers: false },
    ) as any;
    const userSchema = document.components?.schemas?.UserModel;
    const getManySchema =
      document.paths['/meta/users'].get.responses['200'].content[
        'application/json'
      ].schema;
    const postOperation = document.paths['/meta/users'].post;

    expect(userSchema).toMatchObject({
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string', minLength: 2, maxLength: 80 },
        email: { type: 'string', format: 'email' },
        posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
            },
          },
        },
      },
      required: ['name'],
    });
    expect(getManySchema).toMatchObject({
      type: 'object',
      properties: {
        meta: { type: 'object' },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserModel' },
        },
      },
    });
    expect(
      postOperation.requestBody.content['application/json'].schema,
    ).toEqual({
      $ref: '#/components/schemas/UserModel',
    });
    expect(
      postOperation.responses['201'].content['application/json'].schema,
    ).toMatchObject({
      type: 'object',
      properties: {
        message: { type: 'string', example: 'created' },
        data: { $ref: '#/components/schemas/UserModel' },
      },
    });
  });
});
