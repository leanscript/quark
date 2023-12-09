import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('APP_KEY'),
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUserJwt(payload.email);

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      email: payload.email,
      sub: user._id.toString(),
      username: payload.username,
    };
  }
}
