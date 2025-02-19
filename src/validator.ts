/**
 * Indicates a validator.
 * 
 * @template T The type that the function checks.
 * @template E A type that indicates a validation error.
 * @template Req A requirement for the argument of the function.
 */
export type IntermediateValidator<T extends Req, E, Req = unknown> =
	(x: Req) => Generator<E, T, unknown>
export type AnyIntermediateValidator = IntermediateValidator<any, any, any>
export type Validator<T, E, Req = unknown> = (x: Req) => Result<T, E>

/**
 * A helper type for deriving types from {@linkcode IntermediateValidator}s.
 */
export type ValidationTargetOf<Iv extends AnyIntermediateValidator> =
	Iv extends IntermediateValidator<infer T, any, any>
		? T
		: never
export type RequirementOf<Iv extends AnyIntermediateValidator> =
	Iv extends IntermediateValidator<any, any, infer Req>
		? Req
		: never

export type Result<T, E = string> = Result.Ok<T> | Result.Fail<E>
export namespace Result {
	interface ResultBase<Ok extends boolean> {
		ok: Ok
	}
	/**
	 * An object that indicates a success.
	 * Contains a value of narrowed type.
	 */
	export interface Ok<T> extends ResultBase<true> {
		value: T
	}
	/**
	 * An object that indicates a failure.
	 * Contains a reason why the validation failed.
	 */
	export interface Fail<E> extends ResultBase<false> {
		reason: E
	}
	
	export const ok = <T>(value: T): Ok<T> => ({ ok: true, value })
	export const fail = <E>(reason: E): Fail<E> => ({ ok: false, reason })
}

/**
 * Requires a value to be the given type.
 * 
 * NOTE: The body is empty because "yielded something" means
 * "the generator from the validator will never resume" and we can now assume it is safe to assert.
 */
export const require: <T>(x: unknown, ivReturn: T) => asserts x is T = () => {}

/**
 * A helper function for building a validator.
 */
export const validator = <T extends Req, E, Req>(gf: IntermediateValidator<T, E, Req>): IntermediateValidator<T & Req, E, Req> => gf
/**
 * A helper function for building a validator, with an ability to specify target type.
 */
export const validatorFor = <T>() =>
	<E = string, Req = unknown>(gf: IntermediateValidator<T & Req, E, Req>): IntermediateValidator<T & Req, E, Req> =>
		validator<T & Req, E, Req>(gf)

/**
 * Creates a {@linkcode Validator}.
 */
export function validate<T extends Req, E, Req>(iv: IntermediateValidator<T, E, Req>): Validator<T, E, Req>
/**
 * Validates a value.
 * 
 * @returns A {@linkcode Result.Ok} if the validation succeeded, a {@linkcode Result.Fail} otherwise.
 */
export function validate<T extends Req, E, Req>(x: NoInfer<Req>, iv: IntermediateValidator<T, E, Req>): Result<T, E>
export function validate(xOrIv: any, iv?: AnyIntermediateValidator) {
	if (!iv) return (x: unknown) => validate(x, xOrIv)
	
	const res = iv(xOrIv).next()
	
	return res.done ? Result.ok(res.value) : Result.fail(res.value)
}
