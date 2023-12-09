import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../services/db.service';

@Injectable()
export class ProjectsService {
  constructor(@Inject('DatabaseService') private db: DatabaseService) {}
}
