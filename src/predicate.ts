import { type InstantiatedOkFn, type Ok, type Validator, validatorFor } from './validator.js'

/**
 * Indicates a predicate function.
 * 
 * @template T The type that the function narrows into.
 * @template Req The requirement for the argument of the function.
 */
export type Predicate<T extends Req, Req = unknown> =
	(x: Req) => x is T

/**
 * Creates a predicate from a validator.
 * 
 * @returns A predicate.
 */
export const predicateFromValidator = <T extends Req, Req = unknown>(validator: Validator<T, unknown, Req>): Predicate<T, Req> => {
	return (x): x is T => validator(x).ok
}

/**
 * A helper function for building a predicate function.
 */
export const predicateFor = <T>() =>
	<Req = unknown>(f: (x: Req, ok: InstantiatedOkFn<T>) => Ok<T & Req> | undefined) => {
		const validator = validatorFor<T>()((x: Req, ok, fail) =>
			f(x, ok) ?? fail('')
		)
		
		return predicateFromValidator(validator)
	}
