import crypto from 'node:crypto';

export function createHash(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
}
