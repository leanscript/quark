import { plainToClass } from 'class-transformer';
import { NotFoundException } from '@nestjs/common';

async function getOne(metaCtx, filters = {}, scope = {}, target, schema) {
  try {
    const { id } = metaCtx.meta.getRouteParams();
    const relationship = metaCtx.meta.getQueryParam('with');
    const obj = new schema
    let pk = obj.getPk()
    scope[pk] = id

    if(!relationship) {

      const data = await metaCtx.meta.getOne(target, { ...scope });
      if(!data) throw new NotFoundException
      return { data: plainToClass(schema, data) };
    } else {
      const options = obj.loadRelation(relationship)
      const data = await metaCtx.meta.getOneWithRel(
        target,
        { ...scope },
        { target: relationship, ...options}
      );
      const output = plainToClass(schema, data)
      return { data: output };
    }
  } catch {
    throw new NotFoundException
  }
}

export default getOne
