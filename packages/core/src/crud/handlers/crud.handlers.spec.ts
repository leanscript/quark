import { IsString } from 'class-validator';
import addOne from './add-one.handler';
import getOne from './get-one.handler';
import { MetaModel } from '../../interfaces';

class UserModel extends MetaModel {
  id: string;

  @IsString()
  name: string;

  type: string;
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
});
