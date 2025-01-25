/**
 * Indicates a validator.
 * 
 * @template T The type that the function checks.
 * @template E A type that indicates a validation error.
 * @template Req A requirement for the argument of the function.
 */
export type Validator<T extends Req, E, Req = unknown> =
	(x: Req) => ValidationResult<T, E>

interface Result<Ok extends boolean> {
	ok: Ok
}
/**
 * An object that indicates success.
 * Contains a value with narrowed type.
 */
export interface Ok<T> extends Result<true> {
	value: T
}
/**
 * An object that indicates failure.
 * Contains the reason why the validation failed.
 */
export interface Fail<E> extends Result<false> {
	reason: E
}
export type ValidationResult<T, E = string> = Ok<T> | Fail<E>

export type InstantiatedOkFn<T> = typeof ok<T>
export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })

export type InstantiatedFailFn<E> = typeof fail<E>
const fail = <E>(reason: E): Fail<E> => ({ ok: false, reason })

/**
 * A helper function for building a validator.
 */
export const validatorFor = <T>() =>
	<E = string, Req = unknown>(f: (x: Req, ok: InstantiatedOkFn<T>, fail: InstantiatedFailFn<E>) => ValidationResult<T & Req, E>): Validator<T & Req, E, Req> =>
		(x: Req): ValidationResult<T & Req, E> => f(x, ok<T>, fail<E>)
