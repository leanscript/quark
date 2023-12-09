import { Command, CommandRunner } from 'nest-commander';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../services/db.service';
import { AuthService } from '../auth/auth.service';

@Command({
  name: 'dev:user',
  description: 'Create dev user.'
})
export class DevUserCommand extends CommandRunner {
  constructor(
    private db: DatabaseService,
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super();
  }

  async run(): Promise<void> {
    await this.db.purgeDatabase();

    const username = this.configService.get<string>('DEV_USER_NAME');
    const email = this.configService.get<string>('DEV_USER_EMAIL');
    const password = this.configService.get<string>('DEV_USER_PASSWORD');

    const hashedPassword = this.authService.hashPassword(password);

    await this.db.add('users', {
      username,
      email,
      password: hashedPassword,
      token: null,
      isActive: true,
    });

    return;
  }
}
