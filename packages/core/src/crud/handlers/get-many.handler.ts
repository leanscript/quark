import { plainToInstance } from 'class-transformer';
import { parseRelationLoads } from '../relations';

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
    const data = await metaCtx.meta.getManyWithRel(
      target,
      currentPage,
      { ...parsedFilters, ...scope },
      parsedSort,
      relationLoads,
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
