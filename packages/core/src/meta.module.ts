import { Module, DynamicModule, Global, Type } from '@nestjs/common';
import { DatabaseServiceInterface, SearchServiceInterface } from './interfaces';
import { MetaService } from './meta.service';

type MetaModuleOptions = {
  DatabaseService: Type<DatabaseServiceInterface>;
  SearchService: Type<SearchServiceInterface>;
};

@Global()
@Module({})
export class MetaModule {
  static forRoot(options: MetaModuleOptions): DynamicModule {
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
