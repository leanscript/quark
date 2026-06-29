import { Injectable } from '@nestjs/common';
import { SearchServiceInterface } from '@quark/core';

@Injectable()
export class SearchService implements SearchServiceInterface {
  async indexData(): Promise<void> {}

  async purgeIndex(): Promise<void> {}
}
