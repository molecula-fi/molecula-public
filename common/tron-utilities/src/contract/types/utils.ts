export type BigIntToString<T> = T extends bigint[]
    ? string
    : T extends bigint
      ? string
      : T extends object
        ? {
              [K in keyof T]: BigIntToString<T[K]>;
          }
        : T;
