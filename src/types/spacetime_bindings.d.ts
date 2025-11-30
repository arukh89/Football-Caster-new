declare module '@/spacetime_module_bindings' {
  export const reducers: any;
  export const tables: any;
  export class DbConnection {
    static builder(): DbConnectionBuilder;
    reducers: any;
  }
  export class DbConnectionBuilder {
    withUri(uri: string): DbConnectionBuilder;
    withDatabase(name: string): DbConnectionBuilder;
    connect(): Promise<DbConnection>;
  }
}
