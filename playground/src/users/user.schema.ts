import { Exclude, Transform, Type } from 'class-transformer';
import { IsEmail, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';
import {
  BelongsTo,
  HasMany,
  ManyToMany,
  PrimaryKey,
  MetaModel,
} from 'meta-nest';

import { Movie } from '../movies/movie.schema';
import { Project } from '../projects/project.schema';

export class User extends MetaModel {

  @PrimaryKey()
  @Transform((value) => value.obj._id.toString())
  _id: ObjectId;

  @Length(3, 10)
  @ApiProperty({ example: "Foo Bar", description: 'The name of the user' })
  name: string;

  @IsEmail()
  @ApiProperty({ example: "api-generator@mail.com", description: 'The email of the user' })
  email: string;

  @Exclude()
  password: string;

  @HasMany('movies', 'user_id')
  @Type(() => Movie)
  movies;

  @Length(3, 10)
  @ApiProperty({ example: "Xx_Foo_Bar_xX", description: 'The username of the user' })
  username: string;

  @Exclude()
  token: string;

  @ManyToMany('users_projects', 'user_id', 'project_id')
  @Type(() => Project)
  projects: Project

  @ApiProperty({ example: false, description: 'Is the user active or not' })
  isActive: boolean;

  constructor(partial: Partial<User>) {
    super();
    Object.assign(this, partial);
  }

  // public isSaving() {}
  // public isSaved() {}
  // public isUpdating() {}
  // public isUpdated() {}
  // public isDeleted() {}
  // public isDeleting() {}
}
