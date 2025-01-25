import { type Asserter, asserterFromPredicate } from '../src/asserter.js'
import * as h from '../src/helper.js'

asserterFromPredicate(h.isString) satisfies (x: unknown) => asserts x is string

declare const x: unknown

// simple helpers
if (h.isString(x)) x satisfies string
if (h.isNumber(x)) x satisfies number
if (h.isBoolean(x)) x satisfies boolean
if (h.isBigInt(x)) x satisfies bigint
if (h.isNull(x)) x satisfies null
if (h.isUndefined(x)) x satisfies undefined
if (h.isSymbol(x)) x satisfies symbol
if (h.isObject(x)) x satisfies object
if (h.isObjectWithProps({ foo: h.isAny })(x)) {
	x satisfies object
	x satisfies { foo: unknown }
}
if (h.isObjectWithProps({ foo: h.isAny }, { bar: h.isAny })(x)) {
	// additional checks

	x satisfies { bar?: unknown }
	// @ts-expect-error
	x satisfies { bar?: never }
}
if (h.isKey(x)) x satisfies PropertyKey
{
	const obj = { foo: 0, [Symbol()]: 0 }
	if (h.isKeyOf(obj)(x)) {
		x satisfies keyof typeof obj
		// @ts-expect-error
		x satisfies never
	}
}
if (h.isArray(x)) {
	x satisfies Array<unknown>
	// @ts-expect-error
	x satisfies Array<string/* any more specific type than `unknown` */>
}
if (h.isArrayUnsafe(x)) {
	x satisfies Array<unknown>
	x satisfies Array<0> & Array<1> // logically impossible type but not direct use of `never`
	
	// @ts-expect-error
	0 as any satisfies never // FYI, `any` is not assignable to direct `never` but indirect one is
}
if (h.isArrayOf(h.isString)(x)) x satisfies Array<string>
if (h.isTuple()(x)) x satisfies []
if (h.isTuple(h.isString)(x)) x satisfies [string]
if (h.isTuple(h.isString, h.isNumber)(x)) x satisfies [string, number]

// complex helpers
{
	const x = 0 as string | number
	if (h.not(h.isString)(x)) {
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
	h.withLooserRequirement(h.isKey)(strict(obj)) satisfies (x: unknown) => x is keyof typeof obj
}
if (h.isEqual(0)(x)) x satisfies 0
if (h.isEqual([0])(x)) x satisfies readonly [0]
{
	class A { foo: unknown }
	if (h.isInstanceOf(A)(x)) x satisfies A
}
{
	const pickyIsKeyOf =
		<T extends object>(obj: T) =>
			(key: PropertyKey): key is keyof T =>
				key in obj
	const obj = { foo: 0 }
	const key = 'foo' as PropertyKey

	// or

	// `or` only accepts predicates that accepts `unknown`
	h.or(
		// @ts-expect-error
		pickyIsKeyOf(
			obj
		)
	)
	if (h.or(h.isKey, h.isBoolean)(x)) {
		x satisfies PropertyKey | boolean
		// @ts-expect-error
		x satisfies PropertyKey
		// @ts-expect-error
		x satisfies boolean
	}
	
	// `orStrict` preserves requirements
	h.orStrict(pickyIsKeyOf(obj))(
		// @ts-expect-error
		x
	)
	if (h.orStrict(pickyIsKeyOf(obj), h.isNumber/* compatible type */)(key)) {
		key satisfies keyof typeof obj | number
		// @ts-expect-error
		key satisfies keyof typeof obj
		// @ts-expect-error
		key satisfies number
	}
	if (h.orStrict(pickyIsKeyOf(obj), h.isBoolean/* incompatible type */)(key)) {
		key satisfies keyof typeof obj
		// @ts-expect-error
		key satisfies boolean
	}

	// and
	
	// `and` only accepts predicates that accepts `unknown`
	h.and(
		// @ts-expect-error
		pickyIsKeyOf(
			obj
		)
	)
	if (h.and(h.isKey, h.isString)(x)) x satisfies string
	if (h.and(h.isString, h.isNumber)(x)) x satisfies never
	
	// `andStrict` preserves requirements
	h.andStrict(pickyIsKeyOf(obj))(
		// @ts-expect-error
		x
	)
	if (h.andStrict(pickyIsKeyOf(obj), h.isString)(key)) {
		key satisfies keyof typeof obj & string
		// @ts-expect-error
		key satisfies never
	}
	if (h.andStrict(pickyIsKeyOf(obj), h.isBoolean)(key)) key satisfies never
}

// we created a function, to prevent scope pollution by an assertion
() => {
	const assertString: Asserter<string> = asserterFromPredicate(h.isString)
	assertString(x)
	x satisfies string
}
