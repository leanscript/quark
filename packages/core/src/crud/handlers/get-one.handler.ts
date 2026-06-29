import { plainToInstance } from 'class-transformer';
import { BadRequestException, NotFoundException } from '@nestjs/common';

async function getOne(metaCtx, _filters = {}, scope = {}, target, schema) {
  const { id } = metaCtx.meta.getRouteParams();
  const relationship = metaCtx.meta.getQueryParam('with');
  const obj = new schema();
  const pk = obj.getPk();
  const scopedQuery = { ...scope, [pk]: id };

  if (!relationship) {
    const data = await metaCtx.meta.getOne(target, scopedQuery);
    if (!data) throw new NotFoundException();
    return { data: plainToInstance(schema, JSON.parse(JSON.stringify(data))) };
  }

  const options = obj.loadRelation(relationship);
  if (!options) throw new BadRequestException("Relationship doesn't exist");

  const data = await metaCtx.meta.getOneWithRel(target, scopedQuery, {
    target: relationship,
    ...options,
  });
  if (!data) throw new NotFoundException();

  const output = plainToInstance(schema, JSON.parse(JSON.stringify(data)));
  return { data: output };
}

export default getOne;
