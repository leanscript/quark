import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, NotFoundException } from '@nestjs/common';

async function destroy(metaCtx, filters = [], scope = {}) {
  const { id } = metaCtx.meta.getRouteParams();
  const payload = metaCtx.meta.getBody();

  const obj = new metaCtx.schema();

  const pk = obj.getPk();
  const pkQuery = {};
  pkQuery[pk] = id;

  const data = await metaCtx.meta.getOne(metaCtx.target, {
    ...pkQuery,
    ...scope,
  });
  if (!data) throw new NotFoundException();

  await metaCtx.meta.deleteOne(metaCtx.target, { ...pkQuery }, metaCtx.schema);

  return { message: 'Resource deleted' };
}

export default destroy;
