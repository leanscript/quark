import { Controller, Post, Body, Get, Inject, Param, HttpCode, UseInterceptors, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { Movie } from './movie.schema';
import { Category } from './category.schema';
import { ApiGroup, MetaController } from 'meta-nest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { DatabaseService } from '../services/db.service';

const routesArr = ['GET', 'POST', 'PATCH', 'DESTROY'];

@ApiGroup('Movies')
@Controller()
@MetaController({
  key: 'movies',
  schema: Movie,
  routes: routesArr,
  filters: ['name'],
})
@MetaController({
  key: 'categories',
  schema: Category,
  routes: routesArr,
  filters: ['name'],
})
export class MoviesController {
  constructor(@Inject('DatabaseService') private db: DatabaseService) {}

  @Get('/movies/test')
  async testDev() {
    const res = await this.db.aggregate('movies', [{
      $lookup: {from:'users',localField:'user_id',foreignField:'_id',as: 'user'}
    }])
    return res;
  }
}
