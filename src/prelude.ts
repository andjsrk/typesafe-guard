import type { Asserter } from './predicate.js'
import { asserter, isKeyOf, isNull, isUndefined, not, or } from './helper.js'

/**
 * @returns Whether the value is either `null` or `undefined`.
 */
export const isNullish = or(isNull, isUndefined)
/**
 * @returns Whether the value is neither `null` nor `undefined`.
 * 
 * Note that the function is just a type-casted `not(isNullish)`.
 * In the example below, `not(isNullish)` will not work because
 * `Exclude<unknown, YourType>` will always result `unknown` (except when `YourType` is `unknown`):
 * @code
 * ```ts
 * function foo<T>(x: T) {
 *   if (not(isNullish)(x)) requiresNonNullishValue(x) // error
 * }
 * ```
 */
export const isNotNullish = not(isNullish) as (x: unknown) => x is {}

/**
 * @returns The object's own enumerable property keys (including symbols).
 */
export function* keys<T extends object>(obj: T) {
	const assertKey: Asserter<keyof T> = asserter(isKeyOf(obj))
	for (const key of Reflect.ownKeys(obj)) {
		assertKey(key)
		if (!Object.prototype.propertyIsEnumerable.call(obj, key)) continue
		yield key satisfies keyof T
	}
}
/**
 * @returns The object's own enumerable string property keys.
 */
export function* stringKeys<T extends object>(obj: T) {
	const assertKey: Asserter<keyof T> = asserter(isKeyOf(obj))
	for (const key of Object.keys(obj)) {
		assertKey(key)
		yield key satisfies string & keyof T
	}
}

type Entries<T extends object, Req = unknown> =
	keyof T extends infer K extends keyof T
		? K extends Req & K // distribute the union
			? [K, T[K]]
			: never
		: never
/**
 * @returns An array of key/values of the enumerable properties of the object (including symbol keys).
 */
export function* entries<T extends object>(obj: T) {
	for (const key of keys(obj)) {
		yield [key, obj[key]] satisfies [keyof T, T[keyof T]] as Entries<T>
	}
}
/**
 * @returns An array of key/values of the enumerable string key properties of the object.
 */
export function* stringKeyEntries<T extends object>(obj: T) {
	for (const key of stringKeys(obj)) {
		yield [key, obj[key]] satisfies [string & keyof T, T[string & keyof T]] as Entries<T, string>
	}
}
