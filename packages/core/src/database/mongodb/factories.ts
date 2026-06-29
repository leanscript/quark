import { Injectable } from '@nestjs/common';
import { MongoDatabaseService } from './mongo-database.service';
import { MongoDatabaseServiceOptions, MongoDatabaseServiceType } from './types';

export function createMongoDatabaseService(
  options: MongoDatabaseServiceOptions,
): MongoDatabaseServiceType {
  @Injectable()
  class ConfiguredMongoDatabaseService extends MongoDatabaseService {
    constructor() {
      super(options);
    }
  }

  return ConfiguredMongoDatabaseService;
}
