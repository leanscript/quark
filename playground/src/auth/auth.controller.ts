import { Controller, Get, Request, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags } from '@nestjs/swagger';
import { LocalAuth } from './decorators/local-auth.decorator';
import { JwtAuth } from './decorators/jwt-auth.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @LocalAuth()
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @JwtAuth()
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}
