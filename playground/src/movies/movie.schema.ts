import { Exclude, Transform, Type } from 'class-transformer';
import { Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';
import { User } from '../users/user.schema';
import { Category } from './category.schema';
import {
  BelongsTo,
  SearchSync,
  HasMany,
  ManyToMany,
  PrimaryKey,
  MetaModel,
} from 'meta-nest';

export class Movie extends MetaModel {

  @PrimaryKey()
  @Transform((value) => value.obj._id.toString())
  @ApiProperty()
  _id: ObjectId;

  @Length(2, 50)
  @ApiProperty()
  name: string;

  @Length(2, 50)
  @ApiProperty()
  year: string;

  @BelongsTo('users')
  user_id: ObjectId;

  @Type(() => User)
  user: User

  @BelongsTo('categories')
  category_id: ObjectId;

  @Type(() => Category)
  category: Category

  constructor(partial: Partial<Movie>) {
    super();
    Object.assign(this, partial);
  }
}
