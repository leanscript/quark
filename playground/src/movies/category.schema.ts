import { Exclude, Transform, Type } from 'class-transformer';
import { Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';
import { User } from '../users/user.schema';
import {
  BelongsTo,
  SearchSync,
  HasMany,
  ManyToMany,
  PrimaryKey,
  MetaModel,
} from 'meta-nest';

@SearchSync()
export class Category extends MetaModel {

  @PrimaryKey()
  @Transform((value) => value.obj._id.toString())
  @ApiProperty()
  _id: ObjectId;

  constructor(partial: Partial<Category>) {
    super();
    Object.assign(this, partial);
  }
}
