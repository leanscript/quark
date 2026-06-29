import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import {
  HasMany,
  ManyToMany,
  MetaModel,
  OneToOne,
  PrimaryKey,
} from '@quark/core';

export class Profile {
  id?: number;
  user_id?: number;
  bio?: string;
}

export class Post {
  id?: number;
  user_id?: number;
  title?: string;
}

export class Role {
  id?: number;
  name?: string;
}

export class User extends MetaModel {
  @PrimaryKey()
  @IsOptional()
  id?: number;

  @IsString()
  @Length(2, 80)
  name: string;

  @IsEmail()
  email: string;

  @OneToOne('profiles', 'user_id', { select: ['id', 'bio'] })
  profile?: Profile;

  @HasMany('posts', 'user_id', { select: ['id', 'title'] })
  posts?: Post[];

  @ManyToMany('user_roles', 'user_id', 'role_id', {
    target: 'roles',
    select: ['id', 'name'],
  })
  roles?: Role[];
}
