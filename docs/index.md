---
layout: page
theme: jekyll-theme-minimal
title: NestJS Crud
tagline: Easy CRUD with meta-nest
description: Easy CRUD with meta-nest
---

#### DB & Search engine agnostic API CRUD generator for NestJS

<img src="./img/logo.png" alt="Meta Nest logo" style="margin: 0 auto;" width="150px" height="150px"/>

## Features :

- Generate CRUD REST API with decorators and no BS
- Validation based on schema decorators
- Database agnostic
- Search agnostic

## Futures compatibles plugins :

- [ ] MongoDB Database Service
- [ ] Meilisearch Search Service
- [ ] Mailer Notification Service
- [ ] Slack Notification Service
- [ ] Console helper

## Quick start

#### Configure your app

```typescript

// app.module.ts
import { Module } from '@nestjs/common';
import { DatabaseService } from './services/db.service';
import { SearchService } from './services/search.service';
import { UsersModule } from './users/users.module';
import { MetaModule } from 'meta-nest';

@Module({
  imports: [
    UsersModule, // ie we will use UsersModule
    MetaModule.forRoot({ // Configure the module with your custom DatabaseService & SearchService
      DatabaseService,
      SearchService
    }),
  ],
  providers: [ DatabaseService, SearchService ], // Import your custom DatabaseService & SearchService
})
export class AppModule {}

```

#### Configure your module

```typescript
// users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MetaModule } from 'meta-nest';
import { UsersController } from './users.controller';

@Module({
  imports: [MetaModule)], // Register simply the MetaModule in your feature module
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

```

#### Configure your controller

```typescript
// users/users.controller.ts
import { Controller } from '@nestjs/common';

import { User } from './user.schema';
import { ApiGroup } from '../core/decorators/api-group.decorator';
import { MetaController } from '../core/decorators/meta.decorator';

// Use ApiGroup instead of ApiTags for swagger api tagging
@ApiGroup('Users')
@Controller()
// MetaController enable you to setup easily your generic CRUD api
@MetaController({
  key: 'users',
  schema: User,
  routes: ['GET', 'POST', 'PATCH', 'DESTROY', 'ACTIONS'],
})
export class UsersController {
  constructor() {}
  // ...
}

```

#### Inject your Database & Search services

```typescript
// users/users.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../services/db.service';
import { SearchService } from '../services/search.service';

@Injectable()
export class UsersService {
  constructor(
    // Use @Inject('DatabaseService') to skip reimporting your db service in your user module
    @Inject('DatabaseService') private db: DatabaseService
    // Use @Inject('SearchService') to skip reimporting your search service in your user module
    @Inject('SearchService') private db: SearchService
  ) {}
  // ...
}

```

#### Configure your schema

```typescript
// users/users.service.ts

// You can use class-validator & class-transformer on your schema
import { Exclude, Transform } from 'class-transformer';
import { IsEmail, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { ObjectId } from 'mongodb';
import { PrimaryKey, MetaModel, } from 'meta-nest';

// You need to extends MetaModel to use your schema with meta-nest
export class User extends MetaModel {

  // PrimaryKey let you specify the pk of your schema
  // By default meta-nest will target 'id' property
  @PrimaryKey()
  @Transform((value) => value.obj._id.toString())
  _id: ObjectId;

  @Length(3, 10)
  @ApiProperty({ example: "Foo Bar", description: 'The name of the user' })
  name: string;

  @IsEmail()
  @ApiProperty({ example: "api-generator@mail.com", description: 'The email of the user' })
  email: string;

  @Exclude()
  password: string;

  @Length(3, 10)
  @ApiProperty({ example: "Xx_Foo_Bar_xX", description: 'The username of the user' })
  username: string;

  constructor(partial: Partial<User>) {
    // Don't forget super when extending class
    super();
    Object.assign(this, partial);
  }
}
```


#### Check your api

Go to /api to check your api swagger.


#### Create your custom DatabaseService

To use your custom DatabaseService with meta-nest your service need to implement DatabaseServiceInterface.
As long as your service follows the interface, you can make any DB driver works with meta-nest.

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { DatabaseServiceInterface } from 'meta-nest'

@Injectable()
export class DatabaseService implements DatabaseServiceInterface {
  // ...
}
```

#### Create your custom SearchService


To use your custom SearchService with meta-nest your service need to implement SearchServiceInterface.
As long as your service follows the interface, you can make any Search Engine works with meta-nest.

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { SearchServiceInterface } from 'meta-nest'

@Injectable()
export class SearchService implements SearchServiceInterface {
  // ...
}
```
