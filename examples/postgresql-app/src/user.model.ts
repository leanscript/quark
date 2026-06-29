import { IsEmail, IsOptional, IsString, Length } from 'class-validator';
import { MetaModel, PrimaryKey } from '@quark/core';

export class User extends MetaModel {
  @PrimaryKey()
  @IsOptional()
  id?: number;

  @IsString()
  @Length(2, 80)
  name: string;

  @IsEmail()
  email: string;
}
