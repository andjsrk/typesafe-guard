import { strictKeyOf } from './helper.js'
import { assertIs } from './assert.js'

/**
 * @returns A generator that yields the object's own enumerable property keys (including symbols).
 */
export function* objectKeys<T extends object>(obj: T) {
	for (const key of Reflect.ownKeys(obj)) {
		assertIs(key, strictKeyOf(obj))
		if (!Object.prototype.propertyIsEnumerable.call(obj, key)) continue
		yield key
	}
}
/**
 * @returns A generator that yields the object's own enumerable string property keys.
 */
export function* objectStringKeys<T extends object>(obj: T) {
	for (const key of Object.keys(obj)) {
		assertIs(key, strictKeyOf(obj))
		yield key
	}
}

type Entries<T extends object, Req = unknown> =
	keyof T extends infer K extends keyof T
		? K extends Req & K // distribute the union
			? [K, T[K]]
			: never
		: never
/**
 * @returns A generator that yields the object's enumerable properties (including symbol keys) with format `[key, value]`.
 */
export function* objectEntries<T extends object>(obj: T) {
	for (const key of objectKeys(obj)) {
		yield [key, obj[key]] satisfies [keyof T, T[keyof T]] as Entries<T>
	}
}
/**
 * @returns A generator that yields the object's enumerable string key properties with format `[key, value]`.
 */
export function* objectStringKeyEntries<T extends object>(obj: T) {
	for (const key of objectStringKeys(obj)) {
		yield [key, obj[key]] satisfies [string & keyof T, T[string & keyof T]] as Entries<T, string>
	}
}
