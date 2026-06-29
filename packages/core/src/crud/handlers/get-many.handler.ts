import { plainToInstance } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

async function getMany(metaCtx, filters = [], scope = {}, target, schema) {
  const { page, sort } = metaCtx.meta.getQueryParams();
  const perPage = 14;
  const currentPage = Number.parseInt(page || '1', 10) || 1;

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
      if (Array.from(key)[0] === '-') {
        parsedSort[key.substr(1)] = -1;
      } else {
        parsedSort[key] = 1;
      }
    });
  }

  const obj = new schema();

  if (!relationship) {
    const data = await metaCtx.meta.getMany(
      target,
      currentPage,
      { ...parsedFilters, ...scope },
      parsedSort,
    );
    const total = await metaCtx.meta.countRows(target, {
      ...parsedFilters,
      ...scope,
    });

    const parsedData = plainToInstance(
      schema,
      JSON.parse(JSON.stringify(data)),
    );
    const totalCount = Number(total) || 0;

    return {
      meta: {
        current_page: currentPage,
        last_page: Math.max(1, Math.ceil(totalCount / perPage)),
        total: totalCount,
        current: parsedData.length,
        perPage,
        from: (currentPage - 1) * perPage + 1,
        to: (currentPage - 1) * perPage + parsedData.length,
      },
      data: parsedData,
    };
  } else {
    const options = obj.loadRelation(relationship);
    if (!options) throw new BadRequestException("Relationship doesn't exist");

    const data = await metaCtx.meta.getManyWithRel(
      target,
      currentPage,
      { ...parsedFilters, ...scope },
      parsedSort,
      { target: relationship, ...options },
    );
    const total = await metaCtx.meta.countRows(target, {
      ...parsedFilters,
      ...scope,
    });
    const parsedData = plainToInstance(
      schema,
      JSON.parse(JSON.stringify(data)),
    );
    const totalCount = Number(total) || 0;

    return {
      meta: {
        current_page: currentPage,
        last_page: Math.max(1, Math.ceil(totalCount / perPage)),
        total: totalCount,
        current: parsedData.length,
        perPage,
        from: (currentPage - 1) * perPage + 1,
        to: (currentPage - 1) * perPage + parsedData.length,
      },
      data: parsedData,
    };
  }
}

export default getMany;
