import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { genSaltSync, hashSync, compareSync } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  hashPassword(password: string): string {
    const salt = genSaltSync(10);
    return hashSync(password, salt);
  }

  comparePassword(hash: string, password: string): boolean {
    return compareSync(password, hash);
  }

  async validateUserJwt(email) {
    const user = await this.usersService.findOneActive(email);
    return user ? user : null;
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneActive(username);
    if (user && this.comparePassword(user.password, pass)) {
      const { ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.email,
      username: user.username,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
