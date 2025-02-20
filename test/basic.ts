import assert from 'node:assert'
import { IntermediateValidator, require, Result, validate, validator, validatorFor } from '../src/validator.js'
import { is } from '../src/predicate.js'
import { assertIs } from '../src/assert.js'
import { compileOnly } from './common.js'

const myString = validator(function*(x) {
	if (typeof x != 'string') throw yield 0
	return x
})

compileOnly(() => {
	// without requirement
	validator(function*(x) {
		if (0) throw yield 'error' as const
		return 'ok' as const
	}) satisfies IntermediateValidator<'ok', 'error', unknown>
	
	// with requirement
	validator(function*(x: string) {
		if (0) throw yield 'error' as const
		return 'ok' as const
	}) satisfies IntermediateValidator<'ok', 'error', string>
	
	validatorFor<'ok'>()(function*(x: string) {
		if (0) throw yield 'error' as const
		return 'ok'
	}) satisfies IntermediateValidator<'ok', 'error', string>
	
	// the first way to narrow the input: `require(x, yield* someValidator(x))`
	validator(function*(x) {
		require(x, yield* myString(x))
		return x satisfies string
	})
	
	// the second way to narrow the input: `const foo = yield* someValidator(x)`
	validator(function*(x) {
		const str = yield* myString(x)
		return str satisfies string // or `return yield* myString(x)`
	})
})

const str: unknown = ''
const notStr: unknown = 0

const strRes = validate(str, myString) satisfies Result<string, number>
assert(strRes.ok)
const notStrRes = validate(notStr, myString)
assert(!notStrRes.ok)

// we created a function, to prevent scope pollution by an assertion
assert.doesNotThrow(() => {
	assertIs(str, myString)
	str satisfies string
})
assert.throws(() => {
	assertIs(notStr, myString)
})

// NOTE: prevent the function returning values other than boolean, by `=== someBool`
assert(is(str, myString) === true)
assert(is(notStr, myString) === false)
if (is(str, myString)) str satisfies string
