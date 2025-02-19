import * as h from '../src/helper.js'
import { IntermediateValidator, Result, validate, validator } from '../src/validator.js'
import { assertIs } from '../src/assert.js'
import { is } from '../src/predicate.js'

declare const x: unknown

validate(x, h.number) satisfies Result<number, string>

// we created a function, to prevent scope pollution by an assertion
;() => {
	assertIs(x, h.string)
	x satisfies string
}

if (is(x, h.string)) x satisfies string

if (is(x, h.objectWithProps({ foo: h.any }))) {
	x satisfies object
	x satisfies { foo: unknown }
}
if (is(x, h.objectWithProps({ foo: h.any }, { bar: h.any }))) {
	// additional checks
	
	// @ts-expect-error
	x satisfies { bar: unknown }
	x satisfies { bar?: unknown }
	// @ts-expect-error
	x satisfies { bar?: never }
}
{
	const obj = { foo: 0, [Symbol()]: 0 }
	if (is(x, h.keyOf(obj))) {
		x satisfies keyof typeof obj
		// @ts-expect-error
		x satisfies never
	}
}
if (is(x, h.array)) {
	x satisfies Array<unknown>
	// @ts-expect-error
	x satisfies Array<string/* any more specific type than `unknown` */>
}
if (is(x, h.arrayUnsafe)) {
	x satisfies Array<unknown>
	x satisfies Array<0> & Array<1> // logically impossible type but not direct use of `never`
	
	// @ts-expect-error
	0 as any satisfies never // FYI, `any` is not assignable to direct `never` but indirect one is
}
if (is(x, h.arrayOf(h.string))) x satisfies Array<string>
if (is(x, h.tuple())) x satisfies []
if (is(x, h.tuple(h.string))) x satisfies [string]
if (is(x, h.tuple(h.string, h.number))) x satisfies [string, number]

// complex helpers
{
	const x = 0 as string | number
	if (is(x, h.not<number>()(h.string))) {
		x satisfies number
		// @ts-expect-error
		x satisfies string
	}
}
if (is(x, h.equal(0))) x satisfies 0
if (is(x, h.equal([0]))) x satisfies readonly [0]
{
	class A { foo: unknown }
	if (is(x, h.instanceOf(A))) x satisfies A
}
{
	const pickyIsKeyOf =
		<T extends object>(obj: T) =>
			validator(function*(key: PropertyKey) {
				return yield* h.keyOf(obj)(key)
			})
	const obj = { foo: 0 }
	const key = 'foo' as PropertyKey
	
	// or
	
	// `or` only accepts validators that requires `unknown`
	h.or(
		// @ts-expect-error
		pickyIsKeyOf(
			obj
		)
	)
	if (is(x, h.or(h.key, h.boolean))) {
		x satisfies PropertyKey | boolean
		// @ts-expect-error
		x satisfies PropertyKey
		// @ts-expect-error
		x satisfies boolean
	}
	
	// `orStrict` preserves requirements
	is(
		// @ts-expect-error
		x,
		h.orStrict(pickyIsKeyOf(obj))
	)
	h.orStrict(pickyIsKeyOf(obj), h.number) satisfies IntermediateValidator<number | keyof typeof obj, string, PropertyKey>
	if (is(key, h.orStrict(pickyIsKeyOf(obj), h.number/* compatible type */))) {
		key satisfies number | keyof typeof obj
		// @ts-expect-error
		key satisfies keyof typeof obj
		// @ts-expect-error
		key satisfies number
	}
	// NOTE: the requirement of the validator is `PropertyKey` and validation target must be a subtype of the requirement,
	// so the target of the validator is `PropertyKey & (boolean | keyof typeof obj)`, not `boolean | keyof typeof obj`
	const orStrictBetweenIncompatibleTypes = h.orStrict(pickyIsKeyOf(obj), h.boolean/* incompatible type */)
	if (is(key, orStrictBetweenIncompatibleTypes)) {
		key satisfies keyof typeof obj
		// @ts-expect-error
		key satisfies boolean
	}
	
	// and
	
	// `and` only accepts validators that requires `unknown`
	h.and(
		// @ts-expect-error
		pickyIsKeyOf(
			obj
		)
	)
	const _=  h.and(h.key, h.string)
	if (is(x, h.and(h.key, h.string))) x satisfies string
	if (is(x, h.and(h.string, h.number))) x satisfies never
	
	// `andStrict` preserves requirements
	is(
		// @ts-expect-error
		x,
		h.andStrict(pickyIsKeyOf(obj)),
	)
	if (is(key, h.andStrict(pickyIsKeyOf(obj), h.string))) {
		key satisfies keyof typeof obj & string
		// @ts-expect-error
		key satisfies never
	}
	if (is(key, h.andStrict(pickyIsKeyOf(obj), h.boolean))) key satisfies never
}
