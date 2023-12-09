import { Controller, Post, Body, Get, Param, HttpCode, UseInterceptors, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UsersService } from './users.service';
import { User } from './user.schema';
//import { ApiGroup } from '../core/decorators/api-group.decorator';
import { randomUUID } from 'crypto';
import { MetaController } from 'meta-nest';

//@ApiGroup('Users')
@Controller()
@MetaController({
  key: 'users',
  schema: User,
  routes: ['GET', 'POST'],
  filters: ['username'],
})
export class UsersController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('/users/register')
  async registerUser(@Body() data) {
    const { username, email, password } = data;
    const hashedPassword = await this.authService.hashPassword(password);
    try {
      const token = randomUUID();
      await this.usersService.createUser(
        username,
        email,
        hashedPassword,
        token,
      );

      return { username, email };
    } catch (e) {
      return e;
    }
  }

}
