import { IsString } from 'class-validator';
import addOne from './add-one.handler';
import getOne from './get-one.handler';
import { HasMany, MetaModel, OneToOne } from '../../interfaces';

class UserModel extends MetaModel {
  id: string;

  @IsString()
  name: string;

  type: string;
}

class UserWithRelationsModel extends UserModel {
  @HasMany('posts', 'userId')
  posts: any[];

  @OneToOne('profiles', 'userId', { as: 'profile' })
  profile: any;
}

describe('CRUD handlers', () => {
  it('creates records with the generated route target and schema', async () => {
    const metaCtx = {
      target: 'wrong-target',
      schema: undefined,
      meta: {
        getBody: jest.fn().mockReturnValue({ name: 'Ada' }),
        addOne: jest.fn().mockResolvedValue({
          id: '1',
          name: 'Ada',
          type: 'admin',
        }),
      },
    };

    const result = await addOne(
      metaCtx,
      {},
      { type: 'admin' },
      'users',
      UserModel,
    );

    expect(metaCtx.meta.addOne).toHaveBeenCalledWith(
      'users',
      { name: 'Ada', type: 'admin' },
      UserModel,
    );
    expect(result.data).toBeInstanceOf(UserModel);
  });

  it('reads one record without mutating the shared scope', async () => {
    const scope = { type: 'admin' };
    const metaCtx = {
      meta: {
        getRouteParams: jest.fn().mockReturnValue({ id: '1' }),
        getQueryParam: jest.fn().mockReturnValue(null),
        getOne: jest.fn().mockResolvedValue({
          id: '1',
          name: 'Ada',
          type: 'admin',
        }),
      },
    };

    const result = await getOne(metaCtx, {}, scope, 'users', UserModel);

    expect(scope).toEqual({ type: 'admin' });
    expect(metaCtx.meta.getOne).toHaveBeenCalledWith('users', {
      type: 'admin',
      id: '1',
    });
    expect(result.data).toBeInstanceOf(UserModel);
  });

  it('reads one record with multiple selected relations', async () => {
    const query = {
      with: 'posts,profile',
      'select[posts]': 'id,title',
      'select[profile]': 'bio',
    };
    const metaCtx = {
      meta: {
        getRouteParams: jest.fn().mockReturnValue({ id: '1' }),
        getQueryParam: jest.fn((key) => query[key] || null),
        getOneWithRel: jest.fn().mockResolvedValue({
          id: '1',
          name: 'Ada',
          posts: [{ id: '10', title: 'First' }],
          profile: { bio: 'Compiler friend' },
        }),
      },
    };

    const result = await getOne(
      metaCtx,
      {},
      {},
      'users',
      UserWithRelationsModel,
    );

    expect(metaCtx.meta.getOneWithRel).toHaveBeenCalledWith(
      'users',
      { id: '1' },
      [
        expect.objectContaining({
          property: 'posts',
          target: 'posts',
          type: 'hasMany',
          select: ['id', 'title'],
        }),
        expect.objectContaining({
          property: 'profile',
          target: 'profiles',
          type: 'oneToOne',
          select: ['bio'],
        }),
      ],
    );
    expect(result.data).toBeInstanceOf(UserWithRelationsModel);
  });
});
