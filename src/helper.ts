import { type AnyIntermediateValidator, type IntermediateValidator, validator, validatorFor, validate, type ValidationTargetOf, type ValidationErrorOf, type RequirementOf, wrapError, type ErrorWithCause } from './validator.js'
import { is } from './predicate.js'

type RealPropertyKey = string | symbol

type UnionToIntersection<U> =
	(U extends U ? (_: U) => void : never) extends ((_: infer I) => void)
		? I
		: never

type TupleOnly<Arr extends ReadonlyArray<any>> =
	Array<any> extends Arr
		? never
		: Arr

type ExtractTIntoTuple<IvU extends AnyIntermediateValidator> =
	IvU extends IntermediateValidator<infer T, any, any>
		? [T]
		: never
type ExtractReqIntoTuple<IvU extends AnyIntermediateValidator> =
	IvU extends IntermediateValidator<any, any, infer Req>
		? [Req]
		: never
/**
 * Validates the value does not pass the given validator.
 * 
 * WARNING: The validator narrows the value using generic parameter {@linkcode R}
 * due to we cannot reduce type of the value automatically, because there is no [negated types](https://github.com/microsoft/TypeScript/issues/4196) yet.
 * Not to be confused like "{@linkcode R} is what we validates to".
 * 
 * @template R WARNING: This is the result of the validation, not what the validation excludes.
 */
export const not = <R>() =>
	<U extends Req, Req>(iv: IntermediateValidator<U, any, Req>) =>
		validator(function*(x: Req) {
			if (is(x, iv)) throw yield 'The value passed the given validator, although it should not, since the validator is negated.'
			
			return x as R & Req
		})

/**
 * Validates the value is the same as given value.
 */
export const equal = <const T>(value: T) =>
	validatorFor<T>()(function*(x) {
		if (x !== value) throw yield 'The values are not equal.'
		
		return x as T
	})

/**
 * Validates the value is an instance of the given class.
 * 
 * @example
 * ```ts
 * class MyClass {}
 * const instance: unknown = new MyClass()
 * if (is(instance, instanceOf(MyClass))) {
 *   // instance: MyClass
 * }
 * ```
 */
export const instanceOf = <T>(Class: abstract new (...args: any) => T) =>
	validatorFor<T>()(function*(x) {
		if (!(x instanceof Class)) throw yield `The value is not an instance of \`${Class.name || Class}\`.`
		
		return x
	})

// to not to be confused with `AnyIntermediateValidator`, a type alias with clear intention is defined
type AnyUnknownRequirementIntermediateValidator = IntermediateValidator<any, any>

/**
 * Validates {@linkcode a} then {@linkcode b}, on the value.
 * 
 * @example
 * ```ts
 * const objWithSomeProp = validator(function*(x) {
 *   const obj = yield* object(x)
 *   const withSomeProp = yield* keys({ someProp: string })(obj)
 *   return withSomeProp
 * })
 * // instead of above, we can write
 * const objWithSomeProp = pipe(object, keys({ someProp: string }))
 * ```
 */
export const pipe = <T2 extends Req2, E1, E2, Req1, Req2 extends Req1>(
	a: IntermediateValidator<Req2, E1, Req1>,
	b: IntermediateValidator<T2, E2, Req2>,
) =>
	validator<T2, E1 | E2, Req1>(function*(x) {
		return yield* b(yield* a(x))
	})

type MergeRequirements<IvU extends AnyIntermediateValidator> =
	(UnionToIntersection<ExtractReqIntoTuple<IvU>> & [unknown])[0]

type OrResult<Ivs extends AnyIntermediateValidator> =
	[Ivs] extends [never]
		? unknown
		: ValidationTargetOf<Ivs>
/**
 * Validates the value passes any of the given validators.
 * Note that the validator requires an intersection of the requirement of the given validators.
 */
export const or = <Ivs extends Array<AnyIntermediateValidator>>(...ivs: Ivs) =>
	validator<OrResult<Ivs[number]> & MergeRequirements<Ivs[number]>, string, MergeRequirements<Ivs[number]>>(function*(x) {
		for (const iv of ivs) {
			if (is(x, iv)) return x as any
		}
		throw yield 'The value did not passed any of the given validators.'
	})

type And<IvU extends AnyIntermediateValidator> =
	[MergeRequirements<IvU>] extends [infer Req]
		? IntermediateValidator<
			[IvU] extends [never]
				? Req
				: (UnionToIntersection<ExtractTIntoTuple<IvU>> & [Req])[0],
			IvU extends IntermediateValidator<any, infer E, any>
				? E
				: never,
			Req
		>
		: never
/**
 * Validates the value passes all given validators.
 * Note that the validator requires an intersection of the requirement of the given validators.
 */
export const and = <Ivs extends Array<AnyIntermediateValidator>>(...ivs: Ivs) =>
	validator(function*(x) {
		for (const iv of ivs) yield* iv(x)
		return x
	}) as And<Ivs[number]>

/**
 * Note that the validator narrows the value to `any`, which is unsafe but convenient.
 * 
 * @see {@linkcode any}
 */
export const anyUnsafe = validatorFor<any>()(function*(x) {
	return x
})
/**
 * Validates nothing.
 * This validator is useful on collections like tuples.
 * If you want to require an element to exist but no other requirements, you can use this validator.
 * Note that the validator narrows the value to `unknown`, not `any`.
 * 
 * @example
 * ```ts
 * const arr = [1, 2, 3]
 * if (is(arr, tuple(any, number, number))) {
 *   // arr: [unknown, number, number]
 * }
 * ```
 * @see {@linkcode anyUnsafe}
 */
export const any: IntermediateValidator<unknown, never> = anyUnsafe

/**
 * Validates the value is a string.
 */
export const string = validatorFor<string>()(function*(x) {
	if (typeof x != 'string') throw yield 'The value is not a string.'
	
	return x
})
/**
 * Validates the value is a number.
 */
export const number = validatorFor<number>()(function*(x) {
	if (typeof x != 'number') throw yield 'The value is not a number.'
	
	return x
})
/**
 * Validates the value is a boolean.
 */
export const boolean = validatorFor<boolean>()(function*(x) {
	if (typeof x != 'boolean') throw yield 'The value is not a boolean.'
	
	return x
})
/**
 * Validates the value is a `BigInt`.
 */
export const bigInt = validatorFor<bigint>()(function*(x) {
	if (typeof x != 'bigint') throw yield 'The value is not a BigInt.'
	
	return x
})
/**
 * Validates the value is `null`.
 */
export const null_ = validatorFor<null>()(function*(x) {
	if (x !== null) throw yield 'The value is not null.'
	
	return x
})
/**
 * Validates the value is `undefined`.
 */
export const undefined_ = validatorFor<undefined>()(function*(x) {
	if (x !== undefined) throw yield 'The value is not undefined.'
	
	return x
})
/**
 * Validates the value is a symbol.
 */
export const symbol = validatorFor<symbol>()(function*(x) {
	if (typeof x != 'symbol') throw yield 'The value is not a symbol.'
	
	return x
})
/**
 * Validates the value is a function.
 */
export const function_ = validatorFor<Function>()(function*(x) {
	if (typeof x != 'function') throw yield 'The value is not a function.'
	
	return x
})
/**
 * Validates the value is an object.
 */
export const object = validatorFor<object>()(function*(x) {
	// NOTE: functions are objects as well
	if (typeof x == 'object' && x !== null || typeof x == 'function') return x
	
	throw yield 'The value is not an object.'
})

/**
 * Validates the value is either `null` or `undefined`.
 */
export const nullish = or(null_, undefined_)
/**
 * Validates the value is neither `null` nor `undefined`.
 * 
 * Note that in the code below `not<Exclude<T, null | undefined>>()(nullish)` does not work properly because
 * `Exclude<unknown, YourType>` is always `unknown` (except when `YourType` is `unknown`):
 * @code
 * ```ts
 * function foo<T>(x: T) {
 *   if (is(x, not<Exclude<T, null | undefined>>()(nullish))) requiresNonNullishValue(x) // error
 * }
 * ```
 */
// NOTE: `{}` means 'any non-nullish types', not something like 'an object with no properties'
export const notNullish = not<{}>()(nullish)

/**
 * Validates the value is a {@linkcode PropertyKey}.
 */
export const propertyKey: IntermediateValidator<PropertyKey, string> = or(string, number, symbol)
/**
 * Validates the value is a key (either a string or a symbol).
 */
export const key = or(string, symbol)
export interface KeyOfOptions {
	/**
	 * Whether the key should be an own property of the object.
	 * 
	 * @default true
	 */
	own?: boolean
}
/**
 * Validates the key is in the given object.
 * 
 * @see {@linkcode KeyOfOptions}
 */
export const strictKeyOf = <T extends object>(obj: T, { own = true }: KeyOfOptions = {}) =>
	validatorFor<keyof T>()(function*(key: PropertyKey) {
		if (own) {
			if (!Object.prototype.hasOwnProperty.call(obj, key)) {
				throw yield `The given object does not contain own property '${key.toString()}'.`
			}
		} else {
			if (!(key in obj)) {
				throw yield `The given object does not contain property '${key.toString()}'.`
			}
		}
		
		return key as PropertyKey & keyof T
	})
/**
 * {@linkcode strictKeyOf} that accepts any value.
 * 
 * @see {@linkcode KeyOfOptions}
 */
export const keyOf = <T extends object>(obj: T, opts: KeyOfOptions = {}) =>
	pipe(key, strictKeyOf(obj, opts))

export interface PropOptions<P extends boolean = false> extends KeyOfOptions {
	/**
	 * Whether the key is not required.
	 * 
	 * @default false
	 */
	partial?: P
}
// reduces { key?: unknown } to {}
// reduces {} to unknown - the reduced result will be intersected with `object`, so this is ok
type ReduceProps<P> =
	P extends P
		// NOTE: `Pick` preserves whether the property is optional
		// { key?: unknown } extends { key: 0 } is false
		// { key?: unknown } extends { key: unknown } is false
		// { key?: unknown } extends { key?: unknown } is true
		? { [K in keyof P as Partial<Record<K, unknown>> extends Pick<P, K> ? never : K]: P[K] } extends infer OptionalUnknownRemoved
			? {} extends Required<OptionalUnknownRemoved>
				? unknown
				: OptionalUnknownRemoved
			: never
		: never
type PropsReq<Defs extends Record<RealPropertyKey, AnyIntermediateValidator>> =
	ReduceProps<{ [K in keyof Defs]?: RequirementOf<Defs[K]> }>
type PropsReturn<Defs extends Record<RealPropertyKey, AnyIntermediateValidator>, P extends boolean> =
	ReduceProps<
		{ [K in keyof Defs]: Extract<ValidationTargetOf<Defs[K]>, RequirementOf<Defs[K]>> } extends infer Ts
			? P extends true
				? Partial<Ts>
				: Ts
			: never
	>
type PropError<VIv extends AnyIntermediateValidator> =
	VIv extends VIv
		? string | ErrorWithCause<string, ValidationErrorOf<VIv>>
		: never
/**
 * Validates the object has specific property a value that passes the given validator.
 */
export const strictProp = <
	K extends RealPropertyKey,
	VIv extends AnyIntermediateValidator,
	P extends boolean = false,
>(
	key: K,
	valueIv: VIv,
	{
		partial = false as P,
		...opts
	}: PropOptions<P> = {},
) =>
	validator(function*(obj: Record<any, any>) {
		const res = validate(key, strictKeyOf(obj, opts))
		if (!res.ok) {
			if (partial) return obj
			else throw yield res.reason
		}
		
		const k = res.value
		const v = obj[k]
		
		yield* wrapError(
			valueIv,
			`The value of property '${k.toString()}' did not pass the given validator.`,
		)(v as any)
		
		return obj
	}) as any as (
		PropsReq<Record<K, VIv>> extends infer Req
			? IntermediateValidator<
				object & PropsReturn<Record<K, VIv>, P> & Req,
				PropError<VIv>,
				object & Req
			>
			: never
	)
/**
 * {@linkcode strictProp} that accepts any value.
 * 
 * @see {@linkcode PropOptions}
 */
export const prop = <
	K extends RealPropertyKey,
	VIv extends AnyIntermediateValidator,
	P extends boolean = false,
>(
	key: K,
	valueIv: VIv,
	opts: PropOptions<P> = {},
) =>
	pipe(object, strictProp(key, valueIv, opts))

type ExtractEachValidationTarget<Src extends Record<any, AnyIntermediateValidator> | ReadonlyArray<AnyIntermediateValidator>> =
	{ [K in keyof Src]: Src[K] extends AnyIntermediateValidator ? ValidationTargetOf<Src[K]> : Src[K] }
export interface PropsOptions<P extends boolean = false> extends PropOptions<P> {
}
/**
 * Validates the object has specific properties and each property value passes the given validator.
 */
export const strictProps = <
	Defs extends Record<RealPropertyKey, AnyIntermediateValidator>,
	P extends boolean = false
>(defs: Defs, opts: PropsOptions<P> = {}) =>
	validator(function*(obj: object) { // NOTE: the validator requires `object` because `in` operator throws on non-object values
		for (const key of Reflect.ownKeys(defs)) {
			yield* strictProp(key, defs[key], opts)(obj)
		}
		return obj
	}) as (
		PropsReq<Defs> extends infer Req
			? IntermediateValidator<
				object & PropsReturn<Defs, P> & Req,
				PropError<Defs[keyof Defs]>,
				object & Req
			>
			: never
	)
/**
 * {@linkcode strictProps} that accepts any value.
 * 
 * @see {@linkcode PropsOptions}
 */
export const props = <
	Defs extends Record<RealPropertyKey, AnyIntermediateValidator>,
	P extends boolean = false
>(defs: Defs, opts: PropsOptions<P> = {}) =>
	pipe(object, strictProps(defs, opts))

/**
 * Note that the narrowing type is `Array<any>`, which is unsafe but convenient.
 * 
 * @see {@linkcode array}
 */
export const arrayUnsafe = validatorFor<Array<any>>()(function*(x) {
	if (!Array.isArray(x)) throw yield 'The value is not an array.'
	return x
})
/**
 * Validates the value is an array, regardless of types of its elements.
 */
export const array: IntermediateValidator<Array<unknown>, string> = arrayUnsafe
/**
 * Validates the value is an array of specific type.
 */
export const arrayOf = <T, E>(iv: IntermediateValidator<T, E>) =>
	validatorFor<Array<T>>()(function*(x) {
		const arr = yield* array(x)
		
		let idx = 0
		for (const elem of arr) {
			yield* wrapError(
				iv,
				`There is an element that did not pass the given validator at index ${idx}.`
			)(elem)
			
			idx += 1
		}
		
		return arr as Array<T>
	})
/**
 * Validates the value is an array,
 * with specific length (the number of validators given),
 * with specific types at specific positions.
 * 
 * @example
 * ```ts
 * const arr = ['some string', 123] // arr: Array<string | number>
 * if (is(arr, tuple(string, number))) {
 *   // arr: [string, number]
 * }
 * ```
 */
export const tuple = <Ivs extends Array<AnyUnknownRequirementIntermediateValidator>>(...ivs: TupleOnly<[...Ivs]>) =>
	validator(function*(x) {
		const arr = yield* array(x)
		if (arr.length !== ivs.length) throw yield `The array has unexpected length. Expected: ${ivs.length} Actual: ${arr.length}`
		
		let idx = 0
		for (const elem of arr) {
			const res = validate(elem, ivs[idx])
			if (!res.ok) throw yield [`There is an element that did not pass the given validator at index ${idx}.`, res.reason]
			idx += 1
		}
		
		return arr satisfies Array<unknown> as ExtractEachValidationTarget<Ivs>
	})
