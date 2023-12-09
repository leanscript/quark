import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Base')
@Controller()
export class AppController {
  @Get()
  getRootResponse() {
    return {
      message: 'Api Generator',
    };
  }
}
