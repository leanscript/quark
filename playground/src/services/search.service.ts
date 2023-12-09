import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';
import { SearchServiceInterface } from 'meta-nest'

@Injectable()
export class SearchService implements SearchServiceInterface {
  private endpoint = null;
  private client = null;

  constructor(private configService: ConfigService) {
    this.endpoint = this.configService.get<string>('MEILISEARCH_ENDPOINT');
    const key = this.configService.get<string>('MEILISEARCH_KEY');

    this.client = new MeiliSearch({
      host: this.endpoint,
      apiKey: key,
    });
  }

  async indexData(target, data, SerializerCallback = null): Promise<void> {
    let output = data;

    if (SerializerCallback) {
      if (Array.isArray(output)) {
        output = data.map((el) => ({ ...SerializerCallback(el), _id: el.id }));
      } else {
        output = SerializerCallback(data);
      }
    }

    const index = this.client.index(target);
    const res = await index.addDocuments(output);
  }

  async purgeIndex(target) {
    const index = this.client.index(target);
    await index.deleteAllDocuments();
  }
}
