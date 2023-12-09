import { Controller, Post, Body, Get, Inject, Param, HttpCode, UseInterceptors, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { Project } from './project.schema';
import { ApiGroup, MetaController } from 'meta-nest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { DatabaseService } from '../services/db.service';

const routesArr = ['GET', 'POST', 'PATCH', 'DESTROY'];

@ApiGroup('Movies')
@Controller()
@MetaController({
  key: 'projects',
  schema: Project,
  routes: routesArr,
  filters: ['name'],
})
export class ProjectsController {
  constructor(@Inject('DatabaseService') private db: DatabaseService) {}
}
