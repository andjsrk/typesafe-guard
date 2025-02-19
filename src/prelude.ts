import { assertIs } from './assert.js'
import { keyOf, null_, undefined_, not, or } from './helper.js'

/**
 * Validates the value is either `null` or `undefined`.
 */
export const nullish = or(null_, undefined_)
/**
 * Validates the value is neither `null` nor `undefined`.
 * 
 * Note that in the code below `not<Exclude<T, null | undefined>>()(nullish)` does not work properly because
 * `Exclude<unknown, YourType>` is always `unknown` (except when `YourType` is `unknown`):
 * @code
 * ```ts
 * function foo<T>(x: T) {
 *   if (is(x, not<Exclude<T, null | undefined>>()(nullish))) requiresNonNullishValue(x) // error
 * }
 * ```
 */
// NOTE: `{}` means 'any non-nullish types', not something like 'an object with no properties'
export const notNullish = not<{}>()(nullish)

/**
 * @returns A generator that yields the object's own enumerable property keys (including symbols).
 */
export function* objectKeys<T extends object>(obj: T) {
	for (const key of Reflect.ownKeys(obj)) {
		assertIs(key, keyOf(obj))
		if (!Object.prototype.propertyIsEnumerable.call(obj, key)) continue
		yield key
	}
}
/**
 * @returns A generator that yields the object's own enumerable string property keys.
 */
export function* objectStringKeys<T extends object>(obj: T) {
	for (const key of Object.keys(obj)) {
		assertIs(key, keyOf(obj))
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
