import type { Predicate } from './predicate.js'
import { keys } from './prelude.js'

type Expand<O> =
	O extends O
		? O
		: never

type UnionToIntersection<U> =
	(U extends U ? (_: U) => void : never) extends ((_: infer I) => void)
		? I
		: never

type TupleOnly<Arr extends Array<any>> =
	ReadonlyArray<any> extends Arr
		? never
		: Arr

type ExtractTIntoTuple<PredicateU extends Predicate<any, any>> =
	PredicateU extends Predicate<infer T, any>
		? [T]
		: never
type ExtractReqIntoTuple<PredicateU extends Predicate<any, any>> =
	PredicateU extends Predicate<any, infer Req>
		? [Req]
		: never

/**
 * Creates an asserter from a predicate function.
 * 
 * @param predicate A predicate to convert from.
 * @param errorProvider A function that returns an error. If not specified, default error will be thrown.
 * @returns A function that asserts the value is {@link T}.
 */
export const asserter = <T extends Req, Req>(predicate: Predicate<T, Req>, errorProvider: (() => Error) | null = null) =>
	(x: Req): asserts x is T => {
		if (!predicate(x)) throw errorProvider?.() ?? new TypeError('Type does not match.')
	}
/**
 * @returns A predicate function that returns the opposite of the original.
 * 
 * Note that the function narrows the value using `Exclude<T, U>`,
 * which is not effective for some cases like `isNullish`,
 * because there is no [negated types](https://github.com/microsoft/TypeScript/issues/4196) yet.
 */
export const not = <T extends Base, Base>(predicate: Predicate<T, Base>) =>
	<B extends Base>(x: B): x is Exclude<B, T> =>
		!predicate(x)

/**
 * @returns A predicate function that accepts looser input than original strict one.
 */
export const looserCondition = <T extends Base, Base>(loose: Predicate<T, Base>) =>
	<U extends T>(strict: Predicate<U, T>) =>
		(x: Base): x is U =>
			loose(x) && strict(x)

/**
 * @returns A predicate function that returns whether the value is equal to the given value.
 */
export const isEqual = <const T>(value: T) =>
	(x: unknown): x is T =>
		x === value

/**
 * @returns A predicate function that returns whether the value is an instance of the given class.
 * 
 * @example
 * ```ts
 * class MyClass {}
 * const instance: unknown = new MyClass()
 * if (isInstanceOf(MyClass)(instance)) {
 *   // instance: MyClass
 * }
 * ```
 */
export const isInstanceOf = <T>(Class: abstract new (...args: any) => T) =>
	(x: unknown): x is T =>
		x instanceof Class

type OrResult<Preds extends Array<Predicate<any, any>>> =
	[] extends Preds
		? unknown
		: ExtractTIntoTuple<Preds[number]>[0]
/**
 * @param preds Note that the predicate functions must accept `unknown`
 * because there is no safe and convenient way to require multiple non-`unknown` types at the same time.
 * @returns A predicate function that returns whether the value satisfies any of specified types.
 */
export const or = <Predicates extends Array<Predicate<any>>>(...preds: Predicates) =>
	(x: unknown): x is OrResult<Predicates> =>
		preds.some(pred => pred(x))

type ExtractStrictBase<PredicateU extends Predicate<any, any>> =
	UnionToIntersection<ExtractReqIntoTuple<PredicateU>> extends [infer I]
		? I
		: never
/**
 * Unlike {@link or}, the predicate function that returned by this function accepts
 * an intersection of requirement of the predicate functions.
 * @returns A predicate function that returns whether the value satisfies any of specified types.
 */
export const orStrict = <Predicates extends Array<Predicate<any, any>>>(...preds: Predicates) =>
	(x: ExtractStrictBase<Predicates[number]>): x is typeof x & OrResult<Predicates> =>
		preds.some(pred => pred(x))

type AndResult<Preds extends Array<Predicate<any, any>>> =
	[] extends Preds
		? unknown
		: (UnionToIntersection<ExtractTIntoTuple<Preds[number]>> & [unknown])[0]
/**
 * @param preds Note that the predicate functions must accept `unknown`
 * because there is no safe and convenient way to require multiple non-`unknown` types at the same time.
 * @returns A predicate function that returns whether the value satisfies all specified types.
 */
export const and = <Predicates extends Array<Predicate<any>>>(...preds: Predicates) =>
	(x: unknown): x is AndResult<Predicates> =>
		preds.every(pred => pred(x))
/**
 * Unlike {@link and}, the predicate function that returned by this function accepts
 * an intersection of requirement of the predicate functions.
 * @returns A predicate function that returns whether the value satisfies all specified types.
 */
export const andStrict = <Predicates extends Array<Predicate<any, any>>>(...preds: Predicates) =>
	(x: ExtractStrictBase<Predicates[number]>): x is typeof x & AndResult<Predicates> =>
		preds.every(pred => pred(x))

/**
 * @returns Whether the value is a `string`.
 */
export const isString = (x: unknown): x is string =>
	typeof x === 'string'
/**
 * @returns Whether the value is a `number`.
 */
export const isNumber = (x: unknown): x is number =>
	typeof x === 'number'
/**
 * @returns Whether the value is a `boolean`.
 */
export const isBoolean = (x: unknown): x is boolean =>
	typeof x === 'boolean'
/**
 * @returns Whether the value is a `BigInt`.
 */
export const isBigInt = (x: unknown): x is bigint =>
	typeof x === 'bigint'
/**
 * @returns Whether the value is `null`.
 */
export const isNull = (x: unknown): x is null =>
	x === null
/**
 * @returns Whether the value is `undefined`.
 */
export const isUndefined = (x: unknown): x is undefined =>
	x === undefined
/**
 * @returns Whether the value is a `Symbol`.
 */
export const isSymbol = (x: unknown): x is symbol =>
	typeof x === 'symbol'

/**
 * @returns Whether the value is an object.
 */
export const isObject = (x: unknown): x is object =>
	typeof x === 'object' && !isNull(x)

type PropsResolved<P extends Record<PropertyKey, Predicate<any, any>>> =
	Expand<{
		[K in keyof P]: ExtractTIntoTuple<P[K]>[0]
	}>
/**
 * @returns Whether the value is an object with specific properties.
 */
export const isObjectWithProps = <P extends Record<PropertyKey, Predicate<any>>>(props: P) =>
	(x: unknown): x is object & PropsResolved<P> => {
		if (!isObject(x)) return false
		const isKeyOfX = isKeyOf(x)
		for (const key of keys(props)) {
			if (!isKeyOfX(key) || !props[key](x[key])) return false
		}
		return true
	}

/**
 * @returns Whether the value is a {@link PropertyKey}.
 */
export const isKey = or(isString, isNumber, isSymbol)
/**
 * @returns A predicate function that returns whether the value is an own key of the object `obj`.
 */
export const isKeyOf = <T extends object>(obj: T) =>
	(key: unknown): key is keyof T =>
		isKey(key) && key in obj

/**
 * @returns Whether the value is an array, regardless of its contents.
 */
export const isArray: (x: unknown) => x is Array<unknown> = Array.isArray
/**
 * @returns Whether the value is an array, regardless of its contents.
 * Note that the return type is `Array<any>`, which is unsafe but convenient.
 */
export const isArrayUnsafe: (x: unknown) => x is Array<any> = isArray
/**
 * @returns Whether the value is an array of specific type.
 */
export const isArrayOf = <T>(predicate: (x: unknown) => x is T) =>
	(x: unknown): x is Array<T> =>
		isArray(x) && x.every(predicate)

type TFromPredTuple<Preds extends Array<Predicate<any, any>>> =
	Preds extends [Predicate<infer T, any>, ...infer Rest extends Array<Predicate<any, any>>]
		? [T, ...TFromPredTuple<Rest>]
		: []
/**
 * @returns Whether the value is an array,
 * with specific length (the number of predicates given),
 * with specific types at specific positions.
 * 
 * @example
 * ```ts
 * const arr = ['some string'] // arr: Array<string>
 * if (isTuple(isString)(arr)) {
 *   // arr: [string]
 * }
 * ```
 * @example
 * ```ts
 * const arr = ['some string', 123] // arr: Array<string | number>
 * if (isTuple(isString, isNumber)(arr)) {
 *   // arr: [string, number]
 * }
 * ```
 */
export const isTuple = <Predicates extends Array<Predicate<any, any>>>(...predicates: TupleOnly<[...Predicates]>) =>
	(x: unknown): x is TFromPredTuple<Predicates> =>
		isArray(x)
			&& x.length === predicates.length
			&& x.every((item, i) => predicates[i](item))
