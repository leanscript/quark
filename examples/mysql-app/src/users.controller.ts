import { Controller } from '@nestjs/common';
import { MetaController } from '@quark/core';
import { User } from './user.model';

@Controller()
@MetaController({
  key: 'users',
  schema: User,
  routes: ['GET', 'POST', 'PATCH', 'DESTROY'],
})
export class UsersController {}
