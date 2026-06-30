import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { getMetadataStorage } from 'class-validator';
import { MetaModel, RelationMetadata } from '../interfaces';

type MetaModelConstructor = new (...args: any[]) => MetaModel;
type OpenApiSchema = Record<string, any>;

const API_MODEL_PROPERTIES = 'swagger/apiModelProperties';
const optionalValidators = new Set(['isOptional']);

export function ensureMetaOpenApiSchema(schema: MetaModelConstructor): void {
  const prototype = schema.prototype;
  const fields = collectFields(schema);

  fields.forEach((field) => {
    if (Reflect.hasMetadata(API_MODEL_PROPERTIES, prototype, field.name)) {
      return;
    }

    const decorator = field.required ? ApiProperty : ApiPropertyOptional;
    decorator(field.options as any)(prototype, field.name);
  });
}

export function getManyResponseSchema(
  schema: MetaModelConstructor,
): OpenApiSchema {
  return {
    type: 'object',
    properties: {
      meta: paginationMetaSchema(),
      data: {
        type: 'array',
        items: { $ref: getSchemaPath(schema) },
      },
    },
  };
}

export function getOneResponseSchema(
  schema: MetaModelConstructor,
): OpenApiSchema {
  return {
    type: 'object',
    properties: {
      data: { $ref: getSchemaPath(schema) },
    },
  };
}

export function mutationResponseSchema(
  schema: MetaModelConstructor,
  message: string,
): OpenApiSchema {
  return {
    type: 'object',
    properties: {
      message: { type: 'string', example: message },
      data: { $ref: getSchemaPath(schema) },
    },
  };
}

function collectFields(schema: MetaModelConstructor) {
  const model = new schema();
  const validationMetadata = getMetadataStorage().getTargetValidationMetadatas(
    schema,
    '',
    false,
    false,
  );
  const validationsByProperty =
    getValidationMetadataByProperty(validationMetadata);
  const relationsByProperty = getRelationsByProperty(model.relations);
  const primaryKey = model.getPk();
  const propertyNames = unique([
    primaryKey,
    ...Object.keys(validationsByProperty),
    ...Object.keys(relationsByProperty),
  ]);

  return propertyNames.map((name) => {
    const validations = validationsByProperty[name] || [];
    const relation = relationsByProperty[name];
    const reflectedType = Reflect.getMetadata(
      'design:type',
      schema.prototype,
      name,
    );
    const required =
      name !== primaryKey &&
      !relation &&
      !validations.some((metadata) => optionalValidators.has(metadata.name));

    return {
      name,
      required,
      options: buildPropertyOptions(name, reflectedType, validations, relation),
    };
  });
}

function getValidationMetadataByProperty(validationMetadata: any[]) {
  return validationMetadata.reduce<Record<string, any[]>>((acc, metadata) => {
    acc[metadata.propertyName] = acc[metadata.propertyName] || [];
    acc[metadata.propertyName].push(metadata);
    return acc;
  }, {});
}

function getRelationsByProperty(relations?: Record<string, RelationMetadata>) {
  if (!relations) return {};

  return Object.values(relations).reduce<Record<string, RelationMetadata>>(
    (acc, relation) => {
      acc[relation.property] = relation;
      return acc;
    },
    {},
  );
}

function buildPropertyOptions(
  propertyName: string,
  reflectedType: Function | undefined,
  validations: any[],
  relation?: RelationMetadata,
) {
  if (relation) {
    return buildRelationPropertyOptions(reflectedType, relation);
  }

  const options = {
    ...typeOptionsFromValidation(validations),
    ...typeOptionsFromReflection(reflectedType),
  };

  validations.forEach((metadata) => {
    applyValidationMetadata(options, metadata);
  });

  if (propertyName === 'id' && options.type === Number) {
    return { ...options, format: 'int64' };
  }

  return options;
}

function buildRelationPropertyOptions(
  reflectedType: Function | undefined,
  relation: RelationMetadata,
) {
  const selectedSchema = selectedRelationSchema(relation);
  const isArray = relation.type === 'hasMany' || relation.type === 'manyToMany';

  if (isArray || reflectedType === Array) {
    return {
      type: 'array',
      items: selectedSchema || { type: 'object' },
    };
  }

  if (selectedSchema) return selectedSchema;
  if (reflectedType && !isBuiltInType(reflectedType))
    return { type: reflectedType };

  return { type: 'object' };
}

function selectedRelationSchema(relation: RelationMetadata) {
  if (!relation.select || relation.select.length === 0) return null;

  return {
    type: 'object',
    properties: relation.select.reduce<Record<string, OpenApiSchema>>(
      (acc, column) => {
        acc[column] = { type: inferColumnType(column) };
        return acc;
      },
      {},
    ),
  };
}

function inferColumnType(column: string): string {
  return column === 'id' || column.endsWith('_id') || column.endsWith('Id')
    ? 'number'
    : 'string';
}

function typeOptionsFromValidation(validations: any[]) {
  if (validations.some((metadata) => metadata.name === 'isInt')) {
    return { type: 'integer' };
  }
  if (validations.some((metadata) => metadata.name === 'isNumber')) {
    return { type: 'number' };
  }
  if (validations.some((metadata) => metadata.name === 'isBoolean')) {
    return { type: 'boolean' };
  }
  if (validations.some((metadata) => metadata.name === 'isDate')) {
    return { type: 'string', format: 'date-time' };
  }
  if (
    validations.some((metadata) =>
      ['isString', 'isEmail', 'isUrl', 'isUUID'].includes(metadata.name),
    )
  ) {
    return { type: String };
  }

  return {};
}

function typeOptionsFromReflection(reflectedType: Function | undefined) {
  if (!reflectedType) return { type: 'object' };

  if (reflectedType === String) return { type: String };
  if (reflectedType === Number) return { type: Number };
  if (reflectedType === Boolean) return { type: Boolean };
  if (reflectedType === Date) return { type: 'string', format: 'date-time' };
  if (reflectedType === Array)
    return { type: 'array', items: { type: 'object' } };
  if (!isBuiltInType(reflectedType)) return { type: reflectedType };

  return { type: 'object' };
}

function applyValidationMetadata(options: OpenApiSchema, metadata: any): void {
  switch (metadata.name) {
    case 'isEmail':
      options.format = 'email';
      break;
    case 'isUrl':
      options.format = 'uri';
      break;
    case 'isUUID':
      options.format = 'uuid';
      break;
    case 'isLength':
      options.minLength = metadata.constraints?.[0];
      options.maxLength = metadata.constraints?.[1];
      break;
    case 'minLength':
      options.minLength = metadata.constraints?.[0];
      break;
    case 'maxLength':
      options.maxLength = metadata.constraints?.[0];
      break;
    case 'min':
      options.minimum = metadata.constraints?.[0];
      break;
    case 'max':
      options.maximum = metadata.constraints?.[0];
      break;
  }
}

function paginationMetaSchema(): OpenApiSchema {
  return {
    type: 'object',
    properties: {
      current_page: { type: 'number' },
      last_page: { type: 'number' },
      total: { type: 'number' },
      current: { type: 'number' },
      perPage: { type: 'number' },
      from: { type: 'number' },
      to: { type: 'number' },
    },
  };
}

function isBuiltInType(type: Function): boolean {
  return [String, Number, Boolean, Date, Array, Object].includes(type as any);
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}
