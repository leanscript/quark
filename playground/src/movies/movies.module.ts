import { Module, forwardRef } from '@nestjs/common';
import { MoviesService } from './movies.service';
import { MetaModule } from 'meta-nest';
import { MoviesController } from './movies.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MetaModule, forwardRef(() => AuthModule)],
  controllers: [MoviesController],
})
export class MoviesModule {}
