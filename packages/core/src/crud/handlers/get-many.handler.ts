import { plainToClass } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

async function getMany(metaCtx, filters = [], scope = {}, target, schema) {
  const { page, sort } = metaCtx.meta.getQueryParams();

  const parsedFilters = {};
  const parsedSort = {};

  const relationship = metaCtx.meta.getQueryParam('with');

  filters.forEach((filter) => {
    const match = metaCtx.meta.getQueryParam(`filter[${filter}]`);
    if (match) parsedFilters[filter] = match;
  });

  if (sort) {
    const sorts = sort.split(',');
    sorts.forEach((key) => {
      Array.from(key)[0] === '-'
        ? (parsedSort[key.substr(1)] = -1)
        : (parsedSort[key] = 1);
    });
  }

  const obj = new schema();

  if (!relationship) {
    const data = await metaCtx.meta.getMany(
      target,
      page,
      { ...parsedFilters, ...scope },
      parsedSort,
    );
    const total = await metaCtx.meta.countRows(target, {
      ...parsedFilters,
      ...scope,
    });

    const parsedData = plainToClass(schema, JSON.parse(JSON.stringify(data)));

    return {
      meta: {
        current_page: parseInt(page || 1),
        last_page: Math.floor(total / 14) + 1,
        total,
        current: parsedData.length,
        perPage: 14,
        from: (parseInt(page || 1) - 1) * 14 + 1,
        to: (parseInt(page || 1) - 1) * 14 + parsedData.length,
      },
      data: parsedData,
    };
  } else {
    const options = obj.loadRelation(relationship);
    if (!options) throw new BadRequestException("Relationship doesn't exist");

    const data = await metaCtx.meta.getManyWithRel(
      target,
      page,
      { ...parsedFilters, ...scope },
      parsedSort,
      { target: relationship, ...options },
    );
    const total = await metaCtx.meta.countRows(target, {
      ...parsedFilters,
      ...scope,
    });
    const parsedData = plainToClass(schema, JSON.parse(JSON.stringify(data)));
    return {
      meta: {
        current_page: parseInt(page || 1),
        last_page: Math.floor(total / 14) + 1,
        total,
        current: parsedData.length,
        perPage: 14,
        from: (parseInt(page || 1) - 1) * 14 + 1,
        to: (parseInt(page || 1) - 1) * 14 + parsedData.length,
      },
      data: parsedData,
    };
  }
}

export default getMany;
