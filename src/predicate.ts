import { AnyIntermediateValidator, validate, type IntermediateValidator } from './validator.js'

/**
 * @returns A predicate function that returns whether the value passes the given validator.
 */
export function is<T extends Req, Req>(iv: IntermediateValidator<T, any, Req>): (x: Req) => x is T & Req
/**
 * @returns Whether the value passes the given validator.
 */
export function is<T extends Req, Req>(x: NoInfer<Req>, iv: IntermediateValidator<T, any, Req>): x is T & Req
export function is(xOrIv: any, iv?: AnyIntermediateValidator) {
	if (!iv) return (x: unknown) => is(xOrIv)(x)
	
	return validate(xOrIv, iv).ok
}
