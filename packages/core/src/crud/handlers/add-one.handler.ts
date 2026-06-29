import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

async function addOne(
  metaCtx,
  _filters = {},
  scope = {},
  target = metaCtx.target,
  schema = metaCtx.schema,
) {
  const payload = metaCtx.meta.getBody();

  const obj = plainToInstance(schema, payload);

  const errors = await validate(obj);

  if (errors.length > 0) {
    const res = errors.map((error) => ({
      property: error.property,
      errors: error.constraints,
    }));
    throw new BadRequestException(res);
  }

  const scopedPayload = { ...payload, ...scope };
  const res = await metaCtx.meta.addOne(target, scopedPayload, schema);
  return { message: 'created', data: plainToInstance(schema, res) };
}

export default addOne;
