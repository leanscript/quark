import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../services/db.service';

@Injectable()
export class UsersService {
  constructor(
    @Inject('DatabaseService') private db: DatabaseService
  ) {}
  async findOneActive(email: string) {
    return await this.db.findOne('users', { email, isActive: true });
  }
  async createUser(
    username: string,
    email: string,
    password: string,
    token: string,
  ) {
    return await this.db.add('users', {
      username,
      email,
      password,
      token,
      isActive: false,
    });
  }
  async validateUser(token: string) {
    const user = await this.db.findOne('users', { token });

    return await this.db.update(
      'users',
      { _id: user._id },
      { isActive: true, token: null },
    );
  }
}
