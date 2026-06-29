import { Module } from '@nestjs/common';
import { MetaModule } from '@quark/core';
import { DatabaseService } from './database';
import { SearchService } from './search.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    MetaModule.forRoot({
      DatabaseService,
      SearchService,
    }),
  ],
  controllers: [UsersController],
})
export class AppModule {}
