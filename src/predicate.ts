/**
 * Indicates a predicate function.
 * 
 * @template T The type that the function narrows into.
 * @template Req The requirement for the argument of the function.
 */
export type Predicate<T extends Req, Req = unknown> =
	(x: Req) => x is T
/**
 * Indicates an assertion function.
 * 
 * @template T The type that the function narrows into.
 * @template Req The requirement for the argument of the function.
 */
export type Asserter<T extends Req, Req = unknown> =
	(x: Req) => asserts x is T

type PredicateFn<T, Req = unknown> = (x: Req, ok: (properlyTyped: T) => Ok) => Ok | undefined

const ok = Symbol('ok')
type Ok = typeof ok

export const predicateFor = <T>() =>
	<Req = unknown>(f: PredicateFn<T, Req>) =>
		(x: Req): x is Req & T => {
			const res = f(x, _ => ok)
			if (res !== ok && res !== undefined) {
				throw new TypeError('The predicate function returned a value other than ok, undefined.')
			}
			return res === ok
		}
