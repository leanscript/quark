import { Inject, RequestMethod } from '@nestjs/common';
import { ApiExtraModels, ApiTags, ApiResponse } from '@nestjs/swagger';
import { getMany, getOne, addOne, updateOne, destroy } from './handlers/';
import {
  ensureMetaOpenApiSchema,
  getManyResponseSchema,
  getOneResponseSchema,
  mutationResponseSchema,
} from './openapi';

import {
  INTERCEPTORS_METADATA,
  METHOD_METADATA,
  GUARDS_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';

import { MetaInterceptor } from '../interceptors/meta.interceptor';
import { MetaService } from '../meta.service';

type RouteConfig = {
  decorators?: any[];
  guards?: any[];
};

type RouteMap = Record<string, RouteConfig>;

type GeneratedRoute = {
  method: RequestMethod;
  path: string;
  action: (...args: any[]) => any;
  name: string;
  args?: string;
  body?: boolean;
  guards: any[];
  decorators: any[];
};

function normalizeRoutes(routes: string[] | RouteMap = {}): RouteMap {
  if (!Array.isArray(routes)) return routes;

  return routes.reduce((acc, route) => {
    acc[route.toLowerCase()] = {};
    return acc;
  }, {} as RouteMap);
}

export function MetaController(options?: any): ClassDecorator {
  if (!options?.key || !options?.schema) {
    throw new Error('MetaController requires `key` and `schema` options.');
  }

  ensureMetaOpenApiSchema(options.schema);

  const injector = Inject(MetaService);

  const customRoutes: GeneratedRoute[] = [];

  const parsedGuards = options.guards || [];
  const parsedRoutes = normalizeRoutes(options.routes);

  if (parsedRoutes['get']) {
    const decorators = parsedRoutes['get'].decorators || [];
    customRoutes.push({
      method: RequestMethod.GET,
      path: `/meta/${options.key}`,
      action: getMany,
      name: `getMany_${options.key}`,
      guards: parsedRoutes['get'].guards || [],
      decorators: [
        ...decorators,
        ApiResponse({
          status: 200,
          schema: getManyResponseSchema(options.schema),
          description: 'Get many resource',
        }),
      ],
    });
    customRoutes.push({
      method: RequestMethod.GET,
      path: `/meta/${options.key}/:id`,
      action: getOne,
      name: `getOne_${options.key}`,
      args: 'id',
      guards: parsedRoutes['get'].guards || [],
      decorators: [
        ...decorators,
        ApiResponse({
          status: 200,
          schema: getOneResponseSchema(options.schema),
          description: 'Get one resource',
        }),
        ApiResponse({ status: 404, description: 'Resource not found' }),
      ],
    });
  }

  if (parsedRoutes['post']) {
    const decorators = parsedRoutes['post'].decorators || [];
    customRoutes.push({
      method: RequestMethod.POST,
      path: `/meta/${options.key}`,
      action: addOne,
      name: `addOne_${options.key}`,
      body: true,
      guards: parsedRoutes['post'].guards || [],
      decorators: [
        ...decorators,
        ApiResponse({
          status: 201,
          schema: mutationResponseSchema(options.schema, 'created'),
          description: 'Create one resource',
        }),
      ],
    });
  }

  if (parsedRoutes['patch']) {
    const decorators = parsedRoutes['patch'].decorators || [];
    customRoutes.push({
      method: RequestMethod.PATCH,
      path: `/meta/${options.key}/:id`,
      action: updateOne,
      name: `updateOne_${options.key}`,
      args: 'id',
      body: true,
      guards: parsedRoutes['patch'].guards || [],
      decorators: [
        ...decorators,
        ApiResponse({
          status: 200,
          schema: mutationResponseSchema(options.schema, 'updated'),
          description: 'Update one resource',
        }),
        ApiResponse({ status: 404, description: 'Resource not found' }),
      ],
    });
  }

  if (parsedRoutes['destroy']) {
    const decorators = parsedRoutes['destroy'].decorators || [];
    customRoutes.push({
      method: RequestMethod.DELETE,
      path: `/meta/${options.key}/:id`,
      action: destroy,
      name: `destroy_${options.key}`,
      args: 'id',
      guards: parsedRoutes['destroy'].guards || [],
      decorators: [
        ...decorators,
        ApiResponse({
          status: 204,
          description: 'Resource is deleted with success',
        }),
        ApiResponse({ status: 404, description: 'Resource not found' }),
      ],
    });
  }

  return (target): void => {
    injector(target.prototype, 'meta');
    target.prototype.target = options.key;
    target.prototype.schema = options.schema;

    customRoutes.forEach((route) => {
      target.prototype[route.name] = function () {
        return route.action(
          this,
          options.filters,
          options.scope,
          options.key,
          options.schema,
        );
      };

      Reflect.defineMetadata(
        PATH_METADATA,
        route.path,
        target.prototype[route.name],
      );
      Reflect.defineMetadata(
        METHOD_METADATA,
        route.method,
        target.prototype[route.name],
      );
      Reflect.defineMetadata(
        INTERCEPTORS_METADATA,
        [MetaInterceptor],
        target.prototype[route.name],
      );
      Reflect.defineMetadata(
        GUARDS_METADATA,
        [...route.guards, ...parsedGuards],
        target.prototype[route.name],
      );
      Reflect.decorate(
        [
          ...route.decorators,
          ApiExtraModels(options.schema),
          ApiTags(`Meta : ${options.key}`),
        ],
        target.prototype[route.name],
      );
      appendSwaggerParameters(target.prototype[route.name], route, options);
    });
  };
}

function appendSwaggerParameters(method, route: GeneratedRoute, options: any) {
  const existingParameters = Reflect.getMetadata(
    'swagger/apiParameters',
    method,
  );
  const parameters = [];

  if (
    route.args &&
    !hasSwaggerParameter(existingParameters, 'path', route.args)
  ) {
    parameters.push({
      in: 'path',
      name: route.args,
      required: true,
      type: 'string',
      description: 'The resource id',
    });
  }

  if (route.body && !hasSwaggerParameter(existingParameters, 'body', 'body')) {
    parameters.push({
      in: 'body',
      name: 'body',
      required: true,
      type: options.schema,
    });
  }

  if (parameters.length === 0) return;

  Reflect.defineMetadata(
    'swagger/apiParameters',
    [...(existingParameters || []), ...parameters],
    method,
  );
}

function hasSwaggerParameter(
  parameters,
  location: string,
  name: string,
): boolean {
  return (parameters || []).some(
    (parameter) => parameter.in === location && parameter.name === name,
  );
}
