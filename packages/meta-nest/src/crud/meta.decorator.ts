import { Injectable, Scope,  CanActivate, Inject, Req, BadRequestException, ExecutionContext, NotFoundException, RequestMethod,  Param } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ApiTags, ApiResponse, ApiParam, ApiHeader, ApiQuery, ApiOperation } from '@nestjs/swagger';
import { getMany, getOne, addOne, updateOne, destroy } from './handlers/'

import {
  INTERCEPTORS_METADATA,
  METHOD_METADATA,
  CONTROLLER_WATERMARK,
  GUARDS_METADATA,
  SCOPE_OPTIONS_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';

import { MetaInterceptor } from '../interceptors/meta.interceptor'
import { MetaService }  from '../meta.service'
import { validate } from 'class-validator';

export function MetaController<T>(options?: any): ClassDecorator {

    const injector = Inject(MetaService);

    let customRoutes = [];

    let parsedGuards = options.guards || []

    let parsedRoutes = {};

    if(Array.isArray(options.routes)) {
      options.routes.map(route => {
        parsedRoutes[route.toLowerCase()] = {}
      })
    } else {
      parsedRoutes = options.routes
    }

    if(parsedRoutes['get']){
      const decorators = parsedRoutes['get'].decorators || [];
      customRoutes.push({
        method: RequestMethod.GET,
        path: `/meta/${options.key}`,
        action: getMany,
        name: `getMany_${options.key}`,
        guards: parsedRoutes['get'].guards || [],
        decorators: [
          ...decorators,
          ApiResponse({ status: 200, type: options.schema, description: 'Get many resource' })
        ]
      })
      customRoutes.push({
        method: RequestMethod.GET,
        path: `/meta/${options.key}/:id`,
        action: getOne,
        name: `getOne_${options.key}`,
        args: 'id',
        guards: parsedRoutes['get'].guards || [],
        decorators: [
          ...decorators,
          ApiResponse({ status: 200, type: options.schema, description: 'Get one resource' }),
          ApiResponse({ status: 404, description: 'Resource not found' }),
        ]
      })
    }

    if(parsedRoutes['post']){
      const decorators = parsedRoutes['post'].decorators || [];
      customRoutes.push({
        method: RequestMethod.POST ,
        path: `/meta/${options.key}`,
        action: addOne,
        name: `addOne_${options.key}`,
        guards: parsedRoutes['post'].guards || [],
        decorators: [
          ...decorators,
          ApiResponse({ status: 200, type: options.schema, description: 'Create one resource' }),
          ApiResponse({ status: 404, description: 'Resource not found' }),
        ]
      })
    }

    if(parsedRoutes['patch']){
      const decorators = parsedRoutes['patch'].decorators || [];
      customRoutes.push({
        method: RequestMethod.PATCH,
        path: `/meta/${options.key}/:id`,
        action: updateOne,
        name: `updateOne_${options.key}`,
        args: 'id',
        guards: parsedRoutes['patch'].guards || [],
        decorators: [
          ...decorators,
          ApiResponse({ status: 200, type: options.schema, description: 'Update one resource' }),
          ApiResponse({ status: 404, description: 'Resource not found' }),
        ]
      })
    }

    if(parsedRoutes['destroy']){
      const decorators = parsedRoutes['post'].decorators || [];
      customRoutes.push({
        method: RequestMethod.DELETE,
        path: `/meta/${options.key}/:id`,
        action: destroy,
        name: `destroy_${options.key}`,
        args: 'id',
        guards: parsedRoutes['destroy'].guards || [],
        decorators: [
          ...decorators,
          ApiResponse({ status: 204, description: 'Resource is deleted with success' }),
          ApiResponse({ status: 404, description: 'Resource not found' }),
        ]
      })
    }

    return (target): void => {

      injector(target.prototype, 'meta');
      target.prototype.target = options.key
      target.prototype.schema = options.schema

      customRoutes.forEach(route => {
        target.prototype[route.name] = function (req) { return route.action(
          this,
          options.filters,
          options.scope,
          options.key,
          options.schema,
        ) }

        Reflect.defineMetadata(PATH_METADATA, route.path, target.prototype[route.name]);
        Reflect.defineMetadata(METHOD_METADATA, route.method, target.prototype[route.name]);
        Reflect.defineMetadata(INTERCEPTORS_METADATA, [MetaInterceptor], target.prototype[route.name])
        Reflect.defineMetadata(GUARDS_METADATA, [...route.guards, ...parsedGuards], target.prototype[route.name])
        Reflect.decorate([...route.decorators, ApiTags(`Meta : ${options.key}`)], target.prototype[route.name])
        if(route.args) {
          // Woraround since ApiParams is not working
          Reflect.defineMetadata('swagger/apiParameters', [{name: route.args, type: 'string', description: 'The resource id'}], target.prototype[route.name])
        }
      })
    };
}
