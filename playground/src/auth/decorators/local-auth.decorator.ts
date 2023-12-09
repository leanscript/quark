import { UseGuards } from '@nestjs/common';
import { LocalAuthGuard } from '../guards/local-auth.guard';

export function LocalAuth() {
  const setupGuards = UseGuards(LocalAuthGuard);

  return (target: any, key?: string, descriptor?: any) => {
    setupGuards(target, key, descriptor);
  };
}
