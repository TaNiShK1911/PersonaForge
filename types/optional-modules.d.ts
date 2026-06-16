// ============================================================
// PersonaForge — Ambient Type Declarations
// ============================================================
// Declares types for optional dependencies that may not be
// installed (Sentry, Playwright, bun:test, ioredis, nodemailer)
// so `tsc --noEmit` passes without them. At runtime, these
// modules are either lazy-loaded or provided by the test runner.
// ============================================================

declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect<T>(value: T): {
    toBe(expected: T): void;
    toEqual(expected: T): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toBeNaN(): void;
    toBeGreaterThan(n: number): void;
    toBeGreaterThanOrEqual(n: number): void;
    toBeLessThan(n: number): void;
    toBeLessThanOrEqual(n: number): void;
    toBeCloseTo(n: number, digits?: number): void;
    toBeInstanceOf(cls: unknown): void;
    toContain(item: unknown): void;
    toHaveProperty(prop: string, value?: unknown): void;
    toHaveLength(n: number): void;
    toMatch(pattern: RegExp | string): void;
    toThrow(error?: unknown): void;
    toThrowError(error?: unknown): void;
    not: any;
  };
  export const beforeAll: (fn: () => void | Promise<void>) => void;
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;
  export const afterAll: (fn: () => void | Promise<void>) => void;
}

declare module "@sentry/node" {
  export function init(options: {
    dsn: string;
    environment?: string;
    tracesSampleRate?: number;
    release?: string;
  }): void;
  export function captureException(err: unknown): void;
  export function captureMessage(msg: string): void;
  const _default: {
    init: typeof init;
    captureException: typeof captureException;
    captureMessage: typeof captureMessage;
  };
  export default _default;
}

declare module "@playwright/test" {
  export type Page = any;
  export type Locator = any;
  export interface TestFn {
    (name: string, fn: (args: { page: Page }) => void | Promise<void>): void;
    describe: (name: string, fn: () => void) => void;
    beforeAll: (fn: (args: any) => void | Promise<void>) => void;
    beforeEach: (fn: (args: any) => void | Promise<void>) => void;
    afterAll: (fn: (args: any) => void | Promise<void>) => void;
    skip: any;
    only: any;
  }
  export const test: TestFn;
  export const expect: (locator: any) => {
    toBeVisible(opts?: any): Promise<void>;
    toBe(opts?: any): Promise<void>;
    toHaveText(text: string): Promise<void>;
    toContainText(text: string): Promise<void>;
    toHaveCount(n: number): Promise<void>;
    toBeGreaterThan(n: number): Promise<void>;
    toBeTruthy(): Promise<void>;
    toBeDefined(): Promise<void>;
    not: any;
  };
  export function defineConfig(config: any): any;
  export const devices: Record<string, any>;
}

declare module "ioredis" {
  export default class Redis {
    constructor(url?: string, opts?: any);
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: any[]): Promise<string>;
    del(...keys: string[]): Promise<number>;
    keys(pattern: string): Promise<string[]>;
    ping(): Promise<string>;
    flushdb(): Promise<string>;
    on(event: string, listener: (err: Error) => void): this;
    disconnect(): void;
  }
}

declare module "nodemailer" {
  export interface Transporter {
    sendMail(opts: any): Promise<any>;
  }
  export function createTransport(opts: any): Transporter;
}
