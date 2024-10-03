import { and, andStrict, asserter, isAny, isArray, isArrayOf, isArrayUnsafe, isBigInt, isBoolean, isEqual, isInstanceOf, isKey, isKeyOf, isNull, isNumber, isObject, isObjectWithProps, isString, isSymbol, isTuple, isUndefined, looserCondition, not, or, orStrict } from '../src/helper.js'
import type { Asserter } from '../src/predicate.js'

asserter(isString) satisfies (x: unknown) => asserts x is string

declare const x: unknown

// simple helpers
if (isString(x)) x satisfies string
if (isNumber(x)) x satisfies number
if (isBoolean(x)) x satisfies boolean
if (isBigInt(x)) x satisfies bigint
if (isNull(x)) x satisfies null
if (isUndefined(x)) x satisfies undefined
if (isSymbol(x)) x satisfies symbol
if (isObject(x)) x satisfies object
if (isObjectWithProps({ foo: isAny })(x)) {
	x satisfies object
	x satisfies { foo: unknown }
}
if (isKey(x)) x satisfies PropertyKey
{
	const obj = { foo: 0, [Symbol()]: 0 }
	if (isKeyOf(obj)(x)) {
		x satisfies keyof typeof obj
		// @ts-expect-error
		x satisfies never
	}
}
if (isArray(x)) {
	x satisfies Array<unknown>
	// @ts-expect-error
	x satisfies Array<string/* any more specific type than `unknown` */>
}
if (isArrayUnsafe(x)) {
	x satisfies Array<unknown>
	x satisfies Array<0> & Array<1> // logically impossible type but not direct use of `never`
	
	// @ts-expect-error
	0 as any satisfies never // FYI, `any` is not assignable to direct `never` but indirect one is
}
if (isArrayOf(isString)(x)) x satisfies Array<string>
if (isTuple()(x)) x satisfies []
if (isTuple(isString)(x)) x satisfies [string]
if (isTuple(isString, isNumber)(x)) x satisfies [string, number]

// complex helpers
{
	const x = 0 as string | number
	if (not(isString)(x)) {
		x satisfies number
		// @ts-expect-error
		x satisfies string
	}
}
{
	const strict = <T extends object>(obj: T) =>
		<K extends PropertyKey>(key: K): key is K & keyof T =>
			key in obj
	const obj = { a: 0 }
	looserCondition(isKey)(strict(obj)) satisfies (x: unknown) => x is keyof typeof obj
}
if (isEqual(0)(x)) x satisfies 0
if (isEqual([0])(x)) x satisfies readonly [0]
{
	class A { foo: unknown }
	if (isInstanceOf(A)(x)) x satisfies A
}
{
	const pickyIsKeyOf =
		<T extends object>(obj: T) =>
			(key: PropertyKey): key is keyof T =>
				key in obj
	const obj = { foo: 0 }
	const key = 'foo' as PropertyKey

	// or

	// @ts-expect-error
	or(pickyIsKeyOf(obj)) // `or` only accepts predicates that aceepts `unknown`
	if (or(isKey, isBoolean)(x)) {
		x satisfies PropertyKey | boolean
		// @ts-expect-error
		x satisfies PropertyKey
		// @ts-expect-error
		x satisfies boolean
	}
	// @ts-expect-error
	orStrict(pickyIsKeyOf(obj))(x) // `orStrict` preserves requirements
	if (orStrict(pickyIsKeyOf(obj), isNumber/* compatible type */)(key)) {
		key satisfies keyof typeof obj | number
		// @ts-expect-error
		key satisfies keyof typeof obj
		// @ts-expect-error
		key satisfies number
	}
	if (orStrict(pickyIsKeyOf(obj), isBoolean/* incompatible type */)(key)) {
		key satisfies keyof typeof obj
		// @ts-expect-error
		key satisfies boolean
	}

	// and

	// @ts-expect-error
	and(pickyIsKeyOf(obj)) // `and` only accepts predicates that accepts `unknown`
	if (and(isKey, isString)(x)) x satisfies string
	if (and(isString, isNumber)(x)) x satisfies never
	// @ts-expect-error
	andStrict(pickyIsKeyOf(obj))(x) // `andStrict` preserves requirements
	if (andStrict(pickyIsKeyOf(obj), isString)(key)) {
		key satisfies keyof typeof obj & string
		// @ts-expect-error
		key satisfies never
	}
	if (andStrict(pickyIsKeyOf(obj), isBoolean)(key)) key satisfies never
}

// we created a function, to prevent scope pollution by an assertion
() => {
	const assertString: Asserter<string> = asserter(isString)
	assertString(x)
	x satisfies string
}
