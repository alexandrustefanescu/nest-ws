// Minimal stub of @mikro-orm/sqlite and @mikro-orm/core for Jest (CommonJS) unit tests.
// The actual ESM packages use import.meta and cannot run under ts-jest CJS mode.

// No-op decorator factory
const noop =
  () =>
  (..._args: unknown[]) =>
    undefined;

// Entity decorators
export const Entity = noop;
export const PrimaryKey = noop;
export const Property = noop;
export const ManyToOne = noop;
export const OneToMany = noop;
export const ManyToMany = noop;
export const OneToOne = noop;
export const Unique = noop;
export const Index = noop;
export const Enum = noop;
export const Formula = noop;
export const Embeddable = noop;
export const Embedded = noop;

// Commonly used types / helpers
export const wrap = (e: unknown) => e;
export const ref = (e: unknown) => e;

// EntityManager class — the DI token used by all services
export class EntityManager {
  getReference = jest.fn();
  create = jest.fn();
  persist = jest.fn().mockReturnThis();
  flush = jest.fn().mockResolvedValue(undefined);
  find = jest.fn();
  findOne = jest.fn();
  nativeDelete = jest.fn();
  nativeUpdate = jest.fn();
  count = jest.fn();
  createQueryBuilder = jest.fn();
}
