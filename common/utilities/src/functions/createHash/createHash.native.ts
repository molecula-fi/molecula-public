import { Md5 } from 'ts-md5';

export function createHash(data: string): string {
    return Md5.hashStr(data);
}
