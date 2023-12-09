import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

export function JwtAuth() {
  const setupGuards = UseGuards(JwtAuthGuard);

  return (target: any, key?: string, descriptor?: any) => {
    setupGuards(target, key, descriptor);
  };
}
