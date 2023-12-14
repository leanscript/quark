import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

async function addOne(metaCtx, filters = {}, scope: {}) {
  const payload = metaCtx.meta.getBody();

  const obj = new metaCtx.schema({ ...payload });

  const errors = await validate(obj);

  if (errors.length > 0) {
    const res = errors.map((error) => ({
      property: error.property,
      errors: error.constraints,
    }));
    throw new BadRequestException(res);
  } else {
    const scopedPayload = { ...payload, ...scope };
    const res = await metaCtx.meta.addOne(
      metaCtx.target,
      scopedPayload,
      metaCtx.schema,
    );
    return { message: 'created', data: plainToClass(metaCtx.schema, res) };
  }

  return { message: 'success' };
}

export default addOne;
