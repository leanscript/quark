import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, NotFoundException } from '@nestjs/common';

async function updateOne(metaCtx, filters = [], scope = {}) {
  const { id } = metaCtx.meta.getRouteParams();
  const payload = metaCtx.meta.getBody();

  const target = new metaCtx.schema();
  const pk = target.getPk();
  const pkQuery = {};
  pkQuery[pk] = id;

  const data = await metaCtx.meta.getOne(metaCtx.target, {
    ...pkQuery,
    ...scope,
  });
  if (!data) throw new NotFoundException();

  const obj = new metaCtx.schema({ ...payload });

  const errors = await validate(obj);

  if (errors.length > 0) {
    const res = errors.map((error) => ({
      property: error.property,
      errors: error.constraints,
    }));
    throw new BadRequestException(res);
  } else {
    const res = await metaCtx.meta.updateOne(
      metaCtx.target,
      { ...pkQuery },
      payload,
      metaCtx.schema,
    );
    return { message: 'updated', data: plainToClass(metaCtx.schema, res) };
  }

  return { message: 'updateOne' };
}

export default updateOne;
