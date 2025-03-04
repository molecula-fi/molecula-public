/* eslint-disable @typescript-eslint/no-explicit-any */
import type { WaitWithPromise } from './types';

export class Async {
    public static async timeout(ms: number): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => resolve(), ms);
        });
    }

    public static waitWithPromise<T>(): WaitWithPromise<T> {
        const obj: Partial<WaitWithPromise<T>> = {};
        obj.isPending = true;
        obj.value = new Promise<T>((resolve, reject) => {
            obj.resolve = resolve;
            obj.reject = reject;
        });
        obj.value.finally(() => {
            obj.isPending = false;
        });
        return obj as WaitWithPromise<T>;
    }

    /** Converts callback style function into Promise */
    public static makeAsync<T = any>(original: any): (...args: any) => Promise<T> {
        return (...args: any) => {
            return new Promise((resolve, reject) => {
                original(...args, (err: Error, value: any) => {
                    return err ? reject(err) : resolve(value);
                });
            });
        };
    }

    /** Same as makeAsync, but callback args reversed: (value, err) */
    public static makeAsyncRev<T = any>(original: any): (...args: any) => Promise<T> {
        return (...args: any) => {
            return new Promise((resolve, reject) => {
                original(...args, (value: any, err: Error) => {
                    return err ? reject(err) : resolve(value);
                });
            });
        };
    }
}
