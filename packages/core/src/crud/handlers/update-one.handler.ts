import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, NotFoundException } from '@nestjs/common';

async function updateOne(
  metaCtx,
  _filters = [],
  scope = {},
  target = metaCtx.target,
  schema = metaCtx.schema,
) {
  const { id } = metaCtx.meta.getRouteParams();
  const payload = metaCtx.meta.getBody();

  const model = new schema();
  const pk = model.getPk();
  const pkQuery = {};
  pkQuery[pk] = id;
  const scopedQuery = { ...scope, ...pkQuery };

  const data = await metaCtx.meta.getOne(target, scopedQuery);
  if (!data) throw new NotFoundException();

  const obj = plainToInstance(schema, payload);

  const errors = await validate(obj);

  if (errors.length > 0) {
    const res = errors.map((error) => ({
      property: error.property,
      errors: error.constraints,
    }));
    throw new BadRequestException(res);
  }

  const res = await metaCtx.meta.updateOne(
    target,
    scopedQuery,
    payload,
    schema,
  );
  return { message: 'updated', data: plainToInstance(schema, res) };
}

export default updateOne;
