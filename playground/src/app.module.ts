import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { PopulateDatabaseCommand } from './console/populate-database.command';
import { DevUserCommand } from './console/dev-user.command';

import { DatabaseService } from './services/db.service';
import { SearchService } from './services/search.service';

import 'dotenv';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MoviesModule } from './movies/movies.module';
import { ProjectsModule } from './projects/projects.module';
import { MetaModule } from 'meta-nest';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UsersModule,
    MoviesModule,
    ProjectsModule,
    MetaModule.forRoot({
      DatabaseService,
      SearchService
    }),
  ],
  controllers: [AppController],
  providers: [
    DatabaseService,
    SearchService,
    process.env.NODE_ENV === "dev" && PopulateDatabaseCommand,
    process.env.NODE_ENV === "dev" && DevUserCommand,
  ],
})
export class AppModule {}
