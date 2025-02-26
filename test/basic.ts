import assert from 'node:assert'
import { IntermediateValidator, require, Result, validate, validator, validatorFor } from '../src/validator.js'
import { is } from '../src/predicate.js'
import { assertIs } from '../src/assert.js'
import { compileOnly } from './common.js'

const genYields = <Y>(gen: Generator<Y>, x: NoInfer<Y>) => {
	const r = gen.next()
	return !r.done && r.value === x
}
const genReturns = <R>(gen: Generator<any, R>, x: NoInfer<R>) => {
	const r = gen.next()
	return r.done && r.value === x
}

const myString = validator(function*(x) {
	if (typeof x != 'string') throw yield 0
	return x
})

assert(genYields(myString(123), 0))
assert(genReturns(myString('abc'), 'abc'))

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
})

const str: unknown = ''
const notStr: unknown = 0

{
	// the first way to narrow the input: `require(x, yield* someValidator(x))`
	const usingRequire = validator(function*(x) {
		require(x, yield* myString(x))
		return x satisfies string
	})
	assert(genYields(usingRequire(123), 0))
	assert(genReturns(usingRequire('abc'), 'abc'))
	
	compileOnly(() => {
		// the second way to narrow the input: `const foo = yield* someValidator(x)`
		validator(function*(x) {
			const str = yield* myString(x)
			return str satisfies string // or `return yield* myString(x)`
		})
	})
}

{
	const strRes = validate(str, myString) satisfies Result<string, number>
	assert(typeof strRes == 'object' && strRes)
	assert('ok' in strRes && typeof strRes.ok == 'boolean')
	assert(strRes.ok)
	assert('value' in strRes && strRes.value === str)
}
{
	const notStrRes = validate(notStr, myString)
	assert(typeof notStrRes == 'object' && notStrRes)
	assert('ok' in notStrRes && typeof notStrRes.ok == 'boolean')
	assert(!notStrRes.ok)
	assert('reason' in notStrRes && typeof notStrRes.reason == 'number')
}

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
