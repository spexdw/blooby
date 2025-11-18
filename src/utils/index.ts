// Blooby Utilities

// Library Imports
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// LOGGER UTILITIES
// ============================================================================

export type LogLevel = 'info' | 'warn' | 'error' | 'success' | 'debug';

/**
 * Prints colored console output
 * @param str - Message to print
 * @param type - Log level
 */
export function printInfo(str: string, type: LogLevel = 'info') {
    const colorCodes: { [key: string]: string } = {
        info: '\x1b[36m',    // Cyan
        warn: '\x1b[33m',    // Yellow
        error: '\x1b[31m',   // Red
        success: '\x1b[32m', // Green
        debug: '\x1b[35m'    // Magenta
    };
    const resetCode = '\x1b[0m';

    const timestamp = new Date().toISOString();
    console.log(`${colorCodes[type]}[Blooby ${timestamp}] ${str}${resetCode}`);
}

/**
 * Logger with different levels
 */
export const logger = {
    info: (msg: string) => printInfo(msg, 'info'),
    warn: (msg: string) => printInfo(msg, 'warn'),
    error: (msg: string) => printInfo(msg, 'error'),
    success: (msg: string) => printInfo(msg, 'success'),
    debug: (msg: string) => printInfo(msg, 'debug')
};

// ============================================================================
// PATH UTILITIES
// ============================================================================

/**
 * Initializes storage path, creates directory if not exists
 * @param pathName - Path to initialize
 */
export function initalizePath(pathName: string) {
    if (!fs.existsSync(pathName)) {
        fs.mkdirSync(path.resolve(pathName), { recursive: true });
        printInfo(`Storage path initialized at: ${pathName}`, 'success');
    }
}

/**
 * Resolves database file path
 * @param storagePath - Storage directory
 * @param fileName - Database filename (without extension)
 * @returns Full path to .bob file
 */
export function resolveDatabasePath(storagePath: string, fileName: string): string {
    return path.resolve(storagePath, `${fileName}.bob`);
}

/**
 * Checks if a file exists
 * @param filePath - File path to check
 */
export function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
}

/**
 * Gets file size in bytes
 * @param filePath - File path
 */
export function getFileSize(filePath: string): number {
    if (!fs.existsSync(filePath)) return 0;
    return fs.statSync(filePath).size;
}

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generates a unique ID using crypto random bytes
 * @param length - Length of the ID (default: 16)
 * @returns Unique hex string
 */
export function generateId(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generates a UUID v4
 * @returns UUID string
 */
export function generateUUID(): string {
    return crypto.randomUUID();
}

/**
 * Generates a short ID (nanoid-like)
 * @param length - Length of the ID (default: 21)
 * @returns Short alphanumeric ID
 */
export function generateShortId(length: number = 21): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        id += alphabet[bytes[i] % alphabet.length];
    }
    return id;
}

/**
 * Generates a timestamp-based ID
 * @returns Sortable timestamp ID
 */
export function generateTimestampId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(6).toString('hex');
    return `${timestamp}-${random}`;
}

// ============================================================================
// TYPE CHECKING UTILITIES
// ============================================================================

/**
 * Checks if value is an object
 */
export function isObject(value: any): value is object {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Checks if value is an array
 */
export function isArray(value: any): value is any[] {
    return Array.isArray(value);
}

/**
 * Checks if value is a string
 */
export function isString(value: any): value is string {
    return typeof value === 'string';
}

/**
 * Checks if value is a number
 */
export function isNumber(value: any): value is number {
    return typeof value === 'number' && !isNaN(value);
}

/**
 * Checks if value is a boolean
 */
export function isBoolean(value: any): value is boolean {
    return typeof value === 'boolean';
}

/**
 * Checks if value is a function
 */
export function isFunction(value: any): value is Function {
    return typeof value === 'function';
}

/**
 * Checks if value is a Date
 */
export function isDate(value: any): value is Date {
    return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Checks if value is null or undefined
 */
export function isNullOrUndefined(value: any): value is null | undefined {
    return value === null || value === undefined;
}

/**
 * Checks if value is empty (null, undefined, empty string, empty array, empty object)
 */
export function isEmpty(value: any): boolean {
    if (isNullOrUndefined(value)) return true;
    if (isString(value)) return value.trim().length === 0;
    if (isArray(value)) return value.length === 0;
    if (isObject(value)) return Object.keys(value).length === 0;
    return false;
}

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

/**
 * Deep clones an object
 * @param obj - Object to clone
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
    if (obj instanceof Object) {
        const clonedObj = {} as T;
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
    return obj;
}

/**
 * Deep merges two objects
 * @param target - Target object
 * @param source - Source object
 */
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
    const result = deepClone(target);

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            const sourceValue = source[key];
            const targetValue = result[key];

            if (isObject(sourceValue) && isObject(targetValue)) {
                result[key] = deepMerge(targetValue, sourceValue as any);
            } else {
                result[key] = deepClone(sourceValue) as any;
            }
        }
    }

    return result;
}

/**
 * Picks specified keys from an object
 * @param obj - Source object
 * @param keys - Keys to pick
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    for (const key of keys) {
        if (key in obj) {
            result[key] = obj[key];
        }
    }
    return result;
}

/**
 * Omits specified keys from an object
 * @param obj - Source object
 * @param keys - Keys to omit
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
}

/**
 * Gets a nested value from an object using dot notation
 * @param obj - Source object
 * @param path - Dot-separated path (e.g., "user.address.city")
 * @param defaultValue - Default value if path not found
 */
export function getNestedValue(obj: any, path: string, defaultValue?: any): any {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result === null || result === undefined) {
            return defaultValue;
        }
        result = result[key];
    }

    return result !== undefined ? result : defaultValue;
}

/**
 * Sets a nested value in an object using dot notation
 * @param obj - Target object
 * @param path - Dot-separated path
 * @param value - Value to set
 */
export function setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
        if (!(key in current) || !isObject(current[key])) {
            current[key] = {};
        }
        current = current[key];
    }

    current[lastKey] = value;
}

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Returns unique values from an array
 * @param arr - Source array
 */
export function unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

/**
 * Chunks an array into smaller arrays
 * @param arr - Source array
 * @param size - Chunk size
 */
export function chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

/**
 * Flattens a nested array
 * @param arr - Nested array
 * @param depth - Depth to flatten (default: Infinity)
 */
export function flatten<T>(arr: any[], depth: number = Infinity): T[] {
    if (depth === 0) return arr;
    return arr.reduce((acc, val) => {
        return Array.isArray(val)
            ? acc.concat(flatten(val, depth - 1))
            : acc.concat(val);
    }, []);
}

/**
 * Groups array items by a key
 * @param arr - Source array
 * @param key - Key to group by (or function)
 */
export function groupBy<T>(arr: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> {
    return arr.reduce((groups, item) => {
        const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
        if (!groups[groupKey]) {
            groups[groupKey] = [];
        }
        groups[groupKey].push(item);
        return groups;
    }, {} as Record<string, T[]>);
}

/**
 * Sorts an array by multiple criteria
 * @param arr - Source array
 * @param criteria - Sort criteria
 */
export function sortBy<T>(arr: T[], criteria: Array<{ key: keyof T; order: 'asc' | 'desc' }>): T[] {
    return [...arr].sort((a, b) => {
        for (const { key, order } of criteria) {
            const aVal = a[key];
            const bVal = b[key];

            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * Converts a string to slug (URL-friendly)
 * @param str - Input string
 */
export function slugify(str: string): string {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Capitalizes first letter of a string
 * @param str - Input string
 */
export function capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Capitalizes first letter of each word
 * @param str - Input string
 */
export function capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Truncates a string to a specified length
 * @param str - Input string
 * @param length - Max length
 * @param suffix - Suffix to add (default: '...')
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.slice(0, length - suffix.length) + suffix;
}

/**
 * Converts a string to camelCase
 * @param str - Input string
 */
export function camelCase(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/^[A-Z]/, chr => chr.toLowerCase());
}

/**
 * Converts a string to snake_case
 * @param str - Input string
 */
export function snakeCase(str: string): string {
    return str
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '');
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Formats a date to ISO string
 * @param date - Date to format
 */
export function formatDate(date: Date): string {
    return date.toISOString();
}

/**
 * Parses a date from string
 * @param dateStr - Date string
 */
export function parseDate(dateStr: string): Date {
    return new Date(dateStr);
}

/**
 * Gets timestamp in milliseconds
 */
export function timestamp(): number {
    return Date.now();
}

/**
 * Formats a date to human-readable string
 * @param date - Date to format
 */
export function formatDateHuman(date: Date): string {
    return date.toLocaleString();
}

/**
 * Checks if a date is valid
 * @param date - Date to check
 */
export function isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validates email format
 * @param email - Email to validate
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates URL format
 * @param url - URL to validate
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validates if a value is within a range
 * @param value - Value to check
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Debounces a function
 * @param func - Function to debounce
 * @param wait - Wait time in ms
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function (this: any, ...args: Parameters<T>) {
        const context = this;

        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

/**
 * Throttles a function
 * @param func - Function to throttle
 * @param limit - Time limit in ms
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;

    return function (this: any, ...args: Parameters<T>) {
        const context = this;

        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Memoizes a function (caches results)
 * @param func - Function to memoize
 */
export function memoize<T extends (...args: any[]) => any>(func: T): T {
    const cache = new Map<string, any>();

    return function (this: any, ...args: Parameters<T>): ReturnType<T> {
        const key = JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = func.apply(this, args);
        cache.set(key, result);
        return result;
    } as T;
}

/**
 * Measures execution time of a function
 * @param func - Function to measure
 * @param label - Label for logging
 */
export async function measureTime<T>(
    func: () => T | Promise<T>,
    label?: string
): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await func();
    const duration = performance.now() - start;

    if (label) {
        logger.debug(`${label} took ${duration.toFixed(2)}ms`);
    }

    return { result, duration };
}

// ============================================================================
// SERIALIZATION UTILITIES
// ============================================================================

/**
 * Safely stringifies JSON (handles circular references)
 * @param obj - Object to stringify
 * @param space - Indentation spaces
 */
export function safeStringify(obj: any, space?: number): string {
    const seen = new WeakSet();

    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    }, space);
}

/**
 * Safely parses JSON
 * @param str - JSON string
 * @param defaultValue - Default value if parsing fails
 */
export function safeParse<T = any>(str: string, defaultValue?: T): T | undefined {
    try {
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Creates a standardized error
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional details
 */
export function createError(code: string, message: string, details?: any): Error {
    const error = new Error(message) as any;
    error.code = code;
    error.details = details;
    return error;
}

/**
 * Wraps async function with try-catch
 * @param func - Async function
 */
export async function tryCatch<T>(
    func: () => Promise<T>
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
    try {
        const data = await func();
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error as Error };
    }
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Formats bytes to human-readable size
 * @param bytes - Bytes to format
 * @param decimals - Decimal places
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Formats number with thousand separators
 * @param num - Number to format
 */
export function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formats duration in milliseconds to human-readable string
 * @param ms - Duration in milliseconds
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
    return `${(ms / 3600000).toFixed(2)}h`;
}

// ============================================================================
// COMPARISON UTILITIES
// ============================================================================

/**
 * Deep equals comparison
 * @param a - First value
 * @param b - Second value
 */
export function deepEquals(a: any, b: any): boolean {
    if (a === b) return true;

    if (a == null || b == null) return false;

    if (typeof a !== typeof b) return false;

    if (typeof a === 'object') {
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!deepEquals(a[i], b[i])) return false;
            }
            return true;
        }

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);

        if (keysA.length !== keysB.length) return false;

        for (const key of keysA) {
            if (!keysB.includes(key)) return false;
            if (!deepEquals(a[key], b[key])) return false;
        }

        return true;
    }

    return false;
}

// ============================================================================
// RETRY UTILITIES
// ============================================================================

/**
 * Retries a function with exponential backoff
 * @param func - Function to retry
 * @param maxRetries - Maximum retry attempts
 * @param delay - Initial delay in ms
 */
export async function retry<T>(
    func: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await func();
        } catch (error) {
            lastError = error as Error;
            if (i < maxRetries - 1) {
                await sleep(delay * Math.pow(2, i));
            }
        }
    }

    throw lastError!;
}

/**
 * Sleep/delay function
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
