import { validate, type IntermediateValidator } from './validator.js'

/**
 * @returns A predicate function that returns whether the value passes the given validator.
 */
export function is<T extends Req, Req>(iv: IntermediateValidator<T, any, Req>): (x: Req) => x is T & Req
/**
 * @returns Whether the value passes the given validator.
 */
export function is<T extends Req, Req>(x: NoInfer<Req>, iv: IntermediateValidator<T, any, Req>): x is T & Req
export function is<T extends Req, Req>(
	...[xOrIv, iv]:
		| [x: NoInfer<Req>, iv: IntermediateValidator<T, any, Req>]
		| [iv: IntermediateValidator<T, any, Req>, _?: never]
) {
	if (!iv) return (x: Req) => is(x, xOrIv)
	
	return validate(xOrIv, iv).ok
}
