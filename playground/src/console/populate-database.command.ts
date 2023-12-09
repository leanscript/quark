import { Command, CommandRunner } from 'nest-commander';
import { DatabaseService } from '../services/db.service';
import { SearchService } from '../services/search.service';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import { title } from 'qterm';
import { faker } from '@faker-js/faker';
import { ObjectId } from 'mongodb';

@Command({
  name: 'db:seed',
  description: 'Populate database with dev data.',
})
export class PopulateDatabaseCommand extends CommandRunner {
  constructor(
    private db: DatabaseService,
    private searchService: SearchService,
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super();
  }

  async run() {
    title('Populate database', 'gradient-vice');

     await this.db.purgeDatabase();

    //await this.searchService.purgeIndex('users');

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

    const films = new Array(140).fill("").map(el => ({
      name: faker.music.genre(),
      year: faker.music.songName(),
      category_id: new ObjectId('6574a89cb32e770007ffe1b7'),
      user_id: new ObjectId('65747ddc80f206ed007dc3f3'),
    }))

    await this.db.addMany('movies', films);


    return;
  }
}
