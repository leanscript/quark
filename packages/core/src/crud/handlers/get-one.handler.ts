import { plainToInstance } from 'class-transformer';
import { NotFoundException } from '@nestjs/common';
import { parseRelationLoads } from '../relations';

async function getOne(metaCtx, _filters = {}, scope = {}, target, schema) {
  const { id } = metaCtx.meta.getRouteParams();
  const relationship = metaCtx.meta.getQueryParam('with');
  const obj = new schema();
  const pk = obj.getPk();
  const scopedQuery = { ...scope, [pk]: id };
  const relationLoads = relationship
    ? parseRelationLoads(
        obj,
        relationship,
        (relation) =>
          metaCtx.meta.getQueryParam(`select[${relation}]`) ||
          metaCtx.meta.getQueryParam(`fields[${relation}]`),
      )
    : [];

  if (relationLoads.length === 0) {
    const data = await metaCtx.meta.getOne(target, scopedQuery);
    if (!data) throw new NotFoundException();
    return { data: plainToInstance(schema, JSON.parse(JSON.stringify(data))) };
  }

  const data = await metaCtx.meta.getOneWithRel(
    target,
    scopedQuery,
    relationLoads,
  );
  if (!data) throw new NotFoundException();

  const output = plainToInstance(schema, JSON.parse(JSON.stringify(data)));
  return { data: output };
}

export default getOne;
