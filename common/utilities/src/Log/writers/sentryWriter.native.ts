/* eslint-disable class-methods-use-this */
/* eslint-disable max-classes-per-file */
import type { LogWriter } from '../types';

/**
 * Log writer to sentry
 * TODO: setup for React Native
 */
export class SentryWriter implements LogWriter {
    public debug() {}

    public info() {}

    public warning() {}

    public error() {}
}
