import { type AnyIntermediateValidator, type IntermediateValidator, validator, validatorFor, validate, type ValidationTargetOf, type ValidationErrorOf, type RequirementOf, wrapError, type ErrorWithCause, mapError } from './validator.js'
import { is } from './predicate.js'
import { noInferReturn } from './util.js'

/**
 * Indicates types that are valid as a property key at runtime.
 * Note that `number` is not a valid property key at runtime since
 * JS coerces any values other than symbols to string.
 */
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
 * Prevents eager evaluation of generic parameters.
 */
const lazyGenericIv = <Iv extends AnyIntermediateValidator>(iv: Iv) =>
	iv as IntermediateValidator<ValidationTargetOf<Iv>, ValidationErrorOf<Iv>, RequirementOf<Iv>>

/**
 * Validates the value does not pass the given validator.
 * 
 * WARNING: The validator narrows the value using generic parameter {@linkcode R}
 * due to we cannot reduce type of the value automatically, because there is no [negated types](https://github.com/microsoft/TypeScript/issues/4196) yet.
 * Not to be confused like "{@linkcode R} is what we validates to".
 * 
 * @template R WARNING: This is the result of the validation, not what the validation excludes.
 * 
 * @example
 * ```ts
 * // someBasicPrimitive: string | number | boolean
 * if (is(someBasicPrimitive, not<string | number>()(boolean))) {
 *   // someBasicPrimitive: string | number
 * }
 * ```
 */
export const not = <R>() =>
	<T extends Req, Req>(iv: IntermediateValidator<T, any, Req>) =>
		validator(function*(x: Req) {
			if (is(x, iv)) throw yield 'The value passed the given validator, although it should not, since the validator is negated.'
			
			return x as R & Req
		})

/**
 * Validates the value is the same as given value.
 * 
 * @example
 * ```ts
 * // someValue: unknown
 * if (is(someValue, equal(1))) {
 *   // someValue: 1
 * }
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
 * // someValue: unknown
 * if (is(someValue, instanceOf(MyClass))) {
 *   // someValue: MyClass
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
 *   const withSomeProp = yield* props({ someProp: string })(obj)
 *   return withSomeProp
 * })
 * // instead of above, we can write
 * const objWithSomeProp = pipe(object, props({ someProp: string }))
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
 * 
 * @example
 * ```ts
 * const stringOrNumber = or(string, number)
 * // someValue: unknown
 * if (is(someValue, stringOrNumber)) {
 *   // someValue: string | number
 * }
 */
export const or = <Ivs extends Array<AnyIntermediateValidator>>(...ivs: Ivs) =>
	validator<
		OrResult<Ivs[number]> & MergeRequirements<Ivs[number]>,
		ErrorWithCause<string, Array<ValidationErrorOf<Ivs[number]>>>,
		MergeRequirements<Ivs[number]>
	>(function*(x) {
		const errs = []
		for (const iv of ivs) {
			const res = validate(x, iv)
			if (res.ok) return x as any
			else errs.push(res.reason)
		}
		throw yield ['The value did not pass any of the given validators.', errs]
	})

type AndIv<IvU extends AnyIntermediateValidator> =
	[MergeRequirements<IvU>] extends [infer Req]
		? IntermediateValidator<
			[IvU] extends [never]
				? Req
				: (UnionToIntersection<ExtractTIntoTuple<IvU>> & [Req])[0],
			ValidationErrorOf<IvU>,
			Req
		>
		: never
/**
 * Validates the value passes all of the given validators.
 * Note that the validator requires an intersection of the requirement of each validators.
 * 
 * @example
 * ```ts
 * const Person = and(
 *   props({ name: string }),
 *   props({ phoneNumber: string }, { partial: true }),
 * )
 * // someValue: unknown
 * if (is(someValue, Person)) {
 *   // someValue: { name: string; phoneNumber?: string }
 * }
 * ```
 */
export const and = <Ivs extends Array<AnyIntermediateValidator>>(...ivs: Ivs) =>
	validator(function*(x) {
		for (const iv of ivs) {
			yield* wrapError(
				iv,
				'The value did not pass all of the given validators.',
			)(x)
		}
		
		return x
	}) as AndIv<Ivs[number]>

/**
 * Validates the value is one of the given values.
 * 
 * @example
 * ```ts
 * const Difficulty = oneOf('easy', 'normal', 'hard')
 * // someValue: unknown
 * if (is(someValue, Difficulty)) {
 *   // someValue: 'easy' | 'normal' | 'hard'
 * }
 */
export const oneOf = <const Vs extends Array<unknown>>(...values: Vs) =>
	looseOneOf(...values)
/**
 * {@linkcode oneOf} without const modifier on the generic.
 * This validator is useful when you want to compare the value with values that a generator yields.
 */
export const looseOneOf = <Vs extends Array<unknown>>(...values: Vs) =>
	mapError(
		or(...values.map(x => equal<Vs[number]>(x))),
		_ => 'The value is none of the given values.',
	)

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
export const any = validatorFor<unknown>()(anyUnsafe)

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
export { null_ as null }
/**
 * Validates the value is `undefined`.
 */
export const undefined_ = validatorFor<undefined>()(function*(x) {
	if (x !== undefined) throw yield 'The value is not undefined.'
	
	return x
})
export { undefined_ as undefined }
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
export { function_ as function }
/**
 * Validates the value is an object.
 */
export const object = validatorFor<object>()(function*(x) {
	// NOTE: functions are objects as well
	if (typeof x == 'object' && x !== null || typeof x == 'function') return x
	
	throw yield 'The value is not an object.'
})

/**
 * Validates the value passes the given validator or is `null`.
 * 
 * @example
 * ```ts
 * const stringOrNull = nullable(string)
 * // someValue: unknown
 * if (is(someValue, stringOrNull)) {
 *  // someValue: string | null
 * }
 */
export const nullable = <T extends Req, E, Req>(iv: IntermediateValidator<T, E, Req>) =>
	or(null_, iv)

/**
 * Validates the value is either `null` or `undefined`.
 */
export const nullish = or(null_, undefined_)

/**
 * Validates the value passes the given validator or is either `null` or `undefined`.
 */
export const nullishable = <T extends Req, E, Req>(iv: IntermediateValidator<T, E, Req>) =>
	or(nullish, iv)

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
 * 
 * Note that `{}` means 'any non-nullish types', not something like 'an object with no properties'.
 * 
 * @example
 * ```ts
 * // someValue: string | null
 * if (is(someValue, notNullish)) {
 *   // someValue: string
 * }
 * ```
 */
export const notNullish = not<{}>()(nullish)

/**
 * Validates the value is a {@linkcode PropertyKey}.
 */
export const propertyKey = validatorFor<PropertyKey>()(or(string, number, symbol))
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
export const strictKeyOf = <T>(obj: object & T, { own = true }: KeyOfOptions = {}) =>
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
export const keyOf = <T>(obj: object & T, opts: KeyOfOptions = {}) =>
	pipe(key, strictKeyOf(obj, opts))
/**
 * Validates the value is one of the value of own properties of the given object.
 * Note that the validator is named as `propValueOf` instead of `valueOf`, to avoid confusion with {@linkcode Object.prototype.valueOf}.
 */
export const propValueOf = <T>(obj: object & T) =>
	// NOTE: there is no `own` option since we guess there would be no demand for it
	validatorFor<T[keyof T]>()(
		wrapError(
			or(...Reflect.ownKeys(obj).map(key => equal(obj[key as never]))),
			'The value is none of the value of own properties of the given object.',
		)
	)

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
type PropsReturn<Defs extends Record<RealPropertyKey, AnyIntermediateValidator>, P extends boolean> =
	ReduceProps<
		{ [K in keyof Defs]: Extract<ValidationTargetOf<Defs[K]>, RequirementOf<Defs[K]>> } extends infer Ts
			? P extends true
				? Partial<Ts>
				: Ts
			: never
	>
export interface PropOptions<P extends boolean = false> extends KeyOfOptions {
	/**
	 * Whether the key is not required.
	 * 
	 * @default false
	 */
	partial?: P
}
type PropIv =
	<
		K extends RealPropertyKey,
		VIv extends AnyUnknownRequirementIntermediateValidator,
		P extends boolean = false
	>(
		key: K,
		valueIv: VIv,
		opts?: PropOptions<P>,
	) => AnyIntermediateValidator
/**
 * Validates the object has specific property that passes the given validator.
 * 
 * @example
 * ```ts
 * // someValue: object
 * if (is(someValue, strictProp('name', string))) {
 *   // someValue: { name: string }
 * }
 * ```
 */
export const strictProp = (
	(
		key,
		valueIv,
		{
			partial = false as never,
			...opts
		} = {},
	) =>
		validator(function*(obj: object) {
			const o = obj as Record<any, any>
			const res = validate(key, strictKeyOf(o, opts))
			if (!res.ok) {
				if (partial) return noInferReturn(obj satisfies object)
				else throw yield res.reason
			}
			
			const k = res.value
			const v = o[k]
			
			yield* wrapError(
				lazyGenericIv(valueIv),
				`The value of property '${k.toString()}' did not pass the given validator.`,
			)(v as any)
			
			return obj as object & PropsReturn<Record<typeof key, typeof valueIv>, typeof partial>
		})
) satisfies PropIv

/**
 * {@linkcode strictProp} that accepts any value.
 * Note that the validator fails on primitive values.
 * 
 * @see {@linkcode PropOptions}
 */
export const prop = (
	(key, valueIv, opts = {}) =>
	pipe(object, strictProp(key, valueIv, opts))
) satisfies PropIv

/**
 * {@linkcode strictProp} that accepts any value.
 * Note that the validator coerces the value to an object instead of failing, on primitive values.
 * 
 * @see {@linkcode PropOptions}
 */
export const looseProp = (
	(key, valueIv, opts = {}) =>
		validator(function*(x: unknown) {
			yield* strictProp(key, valueIv, opts)(Object(x))
			return x as PropsReturn<Record<typeof key, typeof valueIv>, NonNullable<typeof opts.partial>>
		})
) satisfies PropIv

type ExtractEachValidationTarget<Src extends Record<any, AnyIntermediateValidator> | ReadonlyArray<AnyIntermediateValidator>> =
	{ [K in keyof Src]: Src[K] extends AnyIntermediateValidator ? ValidationTargetOf<Src[K]> : Src[K] }
export interface PropsOptions<P extends boolean = false> extends PropOptions<P> {
	/**
	 * Whether the validator should ignore properties that is not specified on the definition.
	 * 
	 * @default true
	 */
	allowExtra?: boolean
}
type PropsIv =
	<
		Defs extends Record<RealPropertyKey, AnyIntermediateValidator>,
		P extends boolean = false
	>(
		defs: Defs,
		opts?: PropsOptions<P>,
	) => AnyIntermediateValidator
/**
 * Validates the object has specific properties and each property value passes the given validator.
 * 
 * @example
 * ```ts
 * const Person = strictProps({
 *   name: string,
 *   age: number,
 * })
 * // someValue: object
 * if (is(someValue, Person)) {
 *   // someValue: { name: string; age: number }
 * }
 * ```
 */
export const strictProps = (
	(
		defs,
		{
			allowExtra = true,
			...opts
		} = {},
	) =>
		validator(function*(obj: object) { // NOTE: the validator requires `object` because `in` operator throws on non-object values
			const defKeys = Reflect.ownKeys(defs)
			for (const key of defKeys) {
				type StrictPropIvReturn = IntermediateValidator<any, ValidationErrorOf<typeof defs[keyof typeof defs]>, object>
				
				yield* (strictProp(key, defs[key], opts) as StrictPropIvReturn)(obj)
			}
			
			const ownKeys = Reflect.ownKeys(obj)
			if (!allowExtra) {
				const defKeysSet = new Set(defKeys)
				const extraKeys = ownKeys.filter(k => !defKeysSet.has(k))
				// NOTE: we cannot assume there is an extra property by number of keys, since there is `partial` option
				if (extraKeys.length > 0) {
					const EXTRA_ELLIPSIS_COUNT = 5
					
					const extraKeysDetails = [
						// NOTE: symbols may be included, so manually stringify the keys
						...extraKeys.slice(0, EXTRA_ELLIPSIS_COUNT).map(k => k.toString()),
						...extraKeys.length > EXTRA_ELLIPSIS_COUNT
							? [`... ${extraKeys.length - EXTRA_ELLIPSIS_COUNT} more items`]
							: [],
					].join(', ')
					
					throw yield `The object have extra properties: ${extraKeysDetails}`
				}
			}
			
			return obj as object & PropsReturn<typeof defs, NonNullable<typeof opts.partial>>
		})
	) satisfies PropsIv

/**
 * {@linkcode strictProps} that accepts any value.
 * Note that the validator fails on primitive values.
 * 
 * @see {@linkcode PropsOptions}
 */
export const props = (
	(defs, opts = {}) =>
		pipe(object, strictProps(defs, opts))
) satisfies PropsIv

/**
 * {@linkcode strictProps} that accepts any value.
 * Note that the validator coerces the value to an object instead of failing, on primitive values.
 * 
 * @see {@linkcode PropsOptions}
 */
export const looseProps = (
	(defs, opts = {}) =>
		validator(function*(x: unknown) {
			yield* strictProps(defs, opts)(Object(x))
			return x as PropsReturn<typeof defs, NonNullable<typeof opts.partial>>
		})
) satisfies PropsIv

/**
 * Validates the object is a dictionary with key {@linkcode KT} and value {@linkcode VT}.
 * 
 * @example
 * ```ts
 * const Theme = props({ ... })
 * const Themes = strictDict(string, Theme)
 * // someValue: object
 * if (is(someValue, Themes)) {
 *   // someValue: Record<string, ...>
 * }
 * ```
 */
export const strictDict = <KT extends KReq, KE, KReq extends RealPropertyKey, VT extends VReq, VE, VReq>(
	keyIv: IntermediateValidator<KT, KE, KReq>,
	valueIv: IntermediateValidator<VT, VE, VReq>,
) =>
	validator(function*(x: object) {
		for (const key of Reflect.ownKeys(x)) {
			const k = yield* keyIv(key as any)
			const value = x[k satisfies KT as never]
			yield* wrapError(
				valueIv,
				`The value of property '${k.toString()}' did not pass the given validator.`,
			)(value)
		}
		return x as object & Record<KT, VT>
	})
/**
 * {@linkcode strictDict} that accepts any value.
 */
export const dict = <KT extends KReq, KE, KReq extends RealPropertyKey, VT, VE>(
	kIv: IntermediateValidator<KT, KE, KReq>,
	vIv: IntermediateValidator<VT, VE, unknown>,
) =>
	pipe(object, strictDict(kIv, vIv))
// NOTE: there is no `looseDict` since we guess there would be no demand for it

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
export const array = validatorFor<Array<unknown>>()(arrayUnsafe)
/**
 * Validates the value is an array of specific type.
 * 
 * @example
 * ```ts
 * const Options = props({
 *   name: string,
 *   aliases: arrayOf(string),
 * })
 * // someValue: unknown
 * if (is(someValue, Options)) {
 *   // someValue: { name: string; aliases: Array<string> }
 * }
 */
export const arrayOf = <T, E>(iv: IntermediateValidator<T, E>) =>
	validatorFor<Array<T>>()(function*(x) {
		const arr = yield* array(x)
		
		let idx = 0
		for (const elem of arr) {
			yield* wrapError(
				iv,
				`There is an element that did not pass the given validator at index ${idx}.`,
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
export const tuple = <Ivs extends Array<AnyUnknownRequirementIntermediateValidator>>(...ivs: TupleOnly<Ivs>) =>
	validator(function*(x) {
		const arr = yield* array(x)
		if (arr.length !== ivs.length) throw yield `The array has unexpected length. Expected: ${ivs.length} Actual: ${arr.length}`
		
		let idx = 0
		for (const elem of arr) {
			yield* wrapError(
				ivs[idx] as IntermediateValidator<any, ValidationErrorOf<Ivs[number]>>,
				`There is an element that did not pass the given validator at index ${idx}.`,
			)(elem)
			idx += 1
		}
		
		return arr satisfies Array<unknown> as ExtractEachValidationTarget<Ivs>
	})
