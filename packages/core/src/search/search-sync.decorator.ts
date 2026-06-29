export function SearchSync(): ClassDecorator {
  return (target): void => {
    target.prototype.syncing = true;
  };
}
