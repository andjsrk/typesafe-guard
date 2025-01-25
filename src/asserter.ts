import type { Predicate } from './predicate.js'
import type { Validator } from './validator.js'

/**
 * Indicates an assertion function.
 * 
 * @template T The type that the function narrows into.
 * @template Req The requirement for the argument of the function.
 */
export type Asserter<T extends Req, Req = unknown> =
	(x: Req) => asserts x is T

/**
 * Creates an asserter from a predicate function.
 * 
 * @param errorProvider A function that returns an error. If it is not specified, the default error will be thrown.
 * @returns A function that asserts the value is {@link T}.
 */
export const asserterFromPredicate = <T extends Req, Req>(predicate: Predicate<T, Req>, errorProvider: (() => Error) | null = null): Asserter<T, Req> =>
	(x: Req): asserts x is T => {
		if (!predicate(x)) throw errorProvider?.() ?? new TypeError('Type does not match.')
	}
/**
 * Creates an asserter from a validator.
 * Error messages will be inherited from the validator.
 * 
 * @returns A function that asserts the value is {@link T}.
 */
export const asserterFromValidator = <T extends Req, Req>(validator: Validator<T, unknown, Req>): Asserter<T, Req> =>
	(x: Req): asserts x is T => {
		const res = validator(x)
		if (!res.ok) throw res.reason
	}

/**
 * @see {@link asserterFromValidator}
 */
export const asserter = asserterFromValidator
