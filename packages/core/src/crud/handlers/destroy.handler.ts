import { NotFoundException } from '@nestjs/common';

async function destroy(
  metaCtx,
  _filters = [],
  scope = {},
  target = metaCtx.target,
  schema = metaCtx.schema,
) {
  const { id } = metaCtx.meta.getRouteParams();

  const obj = new schema();

  const pk = obj.getPk();
  const pkQuery = {};
  pkQuery[pk] = id;
  const scopedQuery = { ...scope, ...pkQuery };

  const data = await metaCtx.meta.getOne(target, scopedQuery);
  if (!data) throw new NotFoundException();

  await metaCtx.meta.deleteOne(target, scopedQuery);

  return { message: 'Resource deleted' };
}

export default destroy;
