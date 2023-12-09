import { Observable } from 'rxjs';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';

export function SearchSync<T>(options?: any): ClassDecorator {
    return (target): void => {
      target.prototype.syncing = true
    };
}
