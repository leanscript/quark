import {
  BelongsTo,
  HasMany,
  ManyToMany,
  MetaModel,
  OneToOne,
} from './interfaces';

class UserModel extends MetaModel {
  @BelongsTo('organizations', { as: 'organization', select: ['id', 'name'] })
  organizationId: string;

  @HasMany('posts', 'userId', ['id', 'title'])
  posts: any[];

  @OneToOne('profiles', 'userId', { as: 'profile', select: ['bio'] })
  profile: any;

  @ManyToMany('user_roles', 'userId', 'roleId', {
    target: 'roles',
    select: ['name'],
  })
  roles: any[];
}

describe('relation decorators', () => {
  it('registers relation metadata with aliases and selected columns', () => {
    const model = new UserModel();

    expect(model.loadRelation('organization')).toEqual(
      expect.objectContaining({
        property: 'organizationId',
        target: 'organizations',
        type: 'belongsTo',
        as: 'organization',
        select: ['id', 'name'],
      }),
    );
    expect(model.loadRelation('posts')).toEqual(
      expect.objectContaining({
        property: 'posts',
        target: 'posts',
        type: 'hasMany',
        fk: 'userId',
        select: ['id', 'title'],
      }),
    );
    expect(model.loadRelation('profile')).toEqual(
      expect.objectContaining({
        property: 'profile',
        target: 'profiles',
        type: 'oneToOne',
        fk: 'userId',
        select: ['bio'],
      }),
    );
    expect(model.loadRelation('roles')).toEqual(
      expect.objectContaining({
        property: 'roles',
        target: 'roles',
        collection: 'user_roles',
        ownKey: 'userId',
        fk: 'roleId',
        type: 'manyToMany',
        select: ['name'],
      }),
    );
  });
});
