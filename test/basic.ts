import { IntermediateValidator, require, Result, validate, validator, validatorFor } from '../src/validator'
import { is } from '../src/predicate'
import { assertIs } from '../src/assert'

const myString = validator(function*(x) {
	if (typeof x != 'string') throw yield 0
	return x
})

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
	return x
}) satisfies IntermediateValidator<string, number, unknown>

// the second way to narrow the input: `const foo = yield* someValidator(x)`
validator(function*(x) {
	const str = yield* myString(x)
	return str // or `return yield* myString(x)`
}) satisfies IntermediateValidator<string, number, unknown>



declare const x: unknown

validate(x, myString) satisfies Result<string, number>

if (is(x, myString)) x satisfies string

// we created a function, to prevent scope pollution by an assertion
;() => {
	assertIs(x, myString)
	x satisfies string
}
