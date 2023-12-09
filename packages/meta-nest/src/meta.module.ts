import { Module, DynamicModule, Global } from '@nestjs/common';
import { MetaService } from './meta.service';

@Global()
@Module({})
export class MetaModule {
  static forRoot(options: {DatabaseService, SearchService}): DynamicModule {
    const { DatabaseService, SearchService } = options;
    return {
      global: true,
      module: MetaModule,
      providers: [
        MetaService,
        { provide: 'DatabaseService', useClass: DatabaseService },
        { provide: 'SearchService', useClass: SearchService },
      ],
      exports: [
        MetaService,
        { provide: 'DatabaseService', useClass: DatabaseService },
        { provide: 'SearchService', useClass: SearchService },
      ],
    };
  }
}
