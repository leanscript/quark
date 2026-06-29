import { ApiTags } from '@nestjs/swagger';

const excludedMethods = [
  'constructor',
  'addOne_',
  'target',
  'getMany_',
  'getOne_',
  'destroy_',
  'runActions_',
  'updateOne_',
];

export function ApiGroup(groupName) {
  return (target: any) => {
    const methods = Object.getOwnPropertyNames(target.prototype);
    methods.forEach((method) => {
      if (!excludedMethods.some((excluded) => method.startsWith(excluded))) {
        Reflect.decorate([ApiTags(groupName)], target.prototype[method]);
      }
    });
  };
}
