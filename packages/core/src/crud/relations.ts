import { BadRequestException } from '@nestjs/common';
import { MetaModel, RelationLoad } from '../interfaces';

export function parseRelationLoads(
  model: MetaModel,
  relationParam: any,
  getSelectParam: (relation: string) => any,
): RelationLoad[] {
  return parseList(relationParam).map((name) => {
    const metadata = model.loadRelation(name);

    if (!metadata) {
      throw new BadRequestException(`Relationship "${name}" doesn't exist`);
    }

    const target = metadata.target || name;
    const select = parseRelationSelect(
      [name, metadata.as, metadata.property, target],
      getSelectParam,
    );

    return {
      ...metadata,
      target,
      select: select || metadata.select,
    };
  });
}

function parseRelationSelect(
  names: Array<string | undefined>,
  getSelectParam: (relation: string) => any,
): string[] | undefined {
  for (const name of Array.from(new Set(names.filter(Boolean)))) {
    const select = parseList(getSelectParam(name));

    if (select.length > 0) {
      return select;
    }
  }

  return undefined;
}

function parseList(value: any): string[] {
  if (!value) return [];

  const values = Array.isArray(value) ? value : [value];

  return Array.from(
    new Set(
      values
        .flatMap((entry) => String(entry).split(','))
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}
