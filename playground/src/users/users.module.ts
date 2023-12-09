import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { MetaModule } from 'meta-nest';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { DatabaseService } from '../services/db.service';

@Module({
  imports: [MetaModule, forwardRef(() => AuthModule)],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
