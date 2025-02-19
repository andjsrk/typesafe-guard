import { validate, type IntermediateValidator } from './validator.js'

/**
 * Asserts the value passes given validator.
 */
// NOTE: consider support `assertIs(iv)` variant or not
export const assertIs: <T extends Req, Req>(x: NoInfer<Req>, iv: IntermediateValidator<T, any, Req>) => asserts x is T & Req = (x, iv) => {
	const res = validate(x, iv)
	if (!res.ok) throw res.reason
}
