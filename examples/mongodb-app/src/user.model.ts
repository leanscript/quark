import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { ObjectId } from 'mongodb';
import {
  HasMany,
  ManyToMany,
  MetaModel,
  OneToOne,
  PrimaryKey,
} from '@quark/core';

export class Profile {
  _id?: ObjectId;
  user_id?: ObjectId;
  bio?: string;
}

export class Post {
  _id?: ObjectId;
  user_id?: ObjectId;
  title?: string;
}

export class Role {
  _id?: ObjectId;
  name?: string;
}

export class User extends MetaModel {
  @PrimaryKey()
  @IsOptional()
  _id?: ObjectId;

  @IsString()
  @Length(2, 80)
  name: string;

  @IsEmail()
  email: string;

  @OneToOne('profiles', 'user_id', { select: ['bio'] })
  profile?: Profile;

  @HasMany('posts', 'user_id', { select: ['title'] })
  posts?: Post[];

  @ManyToMany('user_roles', 'user_id', 'role_id', {
    target: 'roles',
    select: ['name'],
  })
  roles?: Role[];
}
