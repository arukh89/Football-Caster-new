// Minimal shims to satisfy generated bindings across SDK versions
declare module "spacetimedb" {
  // misc helpers used by codegen >=1.9
  export const TypeBuilder: any
  export const t: any
  export function table(...args: any[]): any
  export function schema(...args: any[]): any
  export function reducers(...args: any[]): any
  export function reducerSchema(...args: any[]): any
  export function convertToAccessorMap<T = any>(v: any): any

  export type AlgebraicTypeType = any
  export type Infer<T = any> = any
  export type RemoteModule<T = any> = any
  export type DbConnectionConfig<T = any> = any
  export type Event = any
  export type EventContextInterface<T = any> = any
  export type SubscriptionEventContextInterface<T = any> = any
  export type ReducerEventContextInterface<T = any> = any
  export type ErrorContextInterface<T = any> = any

  // builder types referenced by codegen
  export class DbConnectionBuilder<DbConnection = any, ErrorContext = any, SubscriptionEventContext = any> {
    constructor(...args: any[])
    withUri(uri: string | URL): this
    withModuleName(name: string): this
    withToken(token?: string): this
    build(): DbConnection
  }

  // Implementation classes referenced by codegen (shims only)
  export class SubscriptionBuilderImpl<T = any> {
    constructor(...args: any[])
  }
  export class DbConnectionImpl<T = any> {
    constructor(...args: any[])
    static builder?: (...args: any[]) => any
  }
}
