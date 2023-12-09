import { Exclude, Transform, Type } from 'class-transformer';
import { Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';
import { User } from '../users/user.schema';
import {
  ManyToMany,
  PrimaryKey,
  MetaModel,
} from 'meta-nest';

export class Project extends MetaModel {

  @PrimaryKey()
  @Transform((value) => value.obj._id.toString())
  @ApiProperty()
  _id: ObjectId;

  @Length(2, 50)
  @ApiProperty()
  name: string;

  @ManyToMany('users_projects', 'project_id', 'user_id')
  @Type(() => User)
  users: User

  constructor(partial: Partial<Project>) {
    super();
    Object.assign(this, partial);
  }
}
