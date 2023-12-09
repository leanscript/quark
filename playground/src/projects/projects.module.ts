import { Module, forwardRef } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { MetaModule } from 'meta-nest';
import { ProjectsController } from './projects.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MetaModule, forwardRef(() => AuthModule)],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
