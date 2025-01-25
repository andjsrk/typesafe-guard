import type { Predicate } from './predicate.js'
import { type Asserter, asserterFromPredicate } from './asserter.js'
import { isKeyOf, isNull, isUndefined, not, or } from './helper.js'

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
export const isNotNullish = not(isNullish) as Predicate<{}>

/**
 * @returns A generator that yields the object's own enumerable property keys (including symbols).
 */
export function* objectKeys<T extends object>(obj: T) {
	const assertKey: Asserter<keyof T> = asserterFromPredicate(isKeyOf(obj))
	for (const key of Reflect.ownKeys(obj)) {
		assertKey(key)
		if (!Object.prototype.propertyIsEnumerable.call(obj, key)) continue
		yield key satisfies keyof T
	}
}
/**
 * @returns A generator that yields the object's own enumerable string property keys.
 */
export function* objectStringKeys<T extends object>(obj: T) {
	const assertKey: Asserter<keyof T> = asserterFromPredicate(isKeyOf(obj))
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
