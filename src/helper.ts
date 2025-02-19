import { type AnyIntermediateValidator, type IntermediateValidator, validator, validatorFor, validate, type ValidationTargetOf, type RequirementOf } from './validator.js'
import { is } from './predicate.js'

type Expand<O> = O extends O ? O : never

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

type OrResult<Ivs extends AnyIntermediateValidator> =
	[Ivs] extends [never]
		? unknown
		: ValidationTargetOf<Ivs>
/**
 * Validates the value passes any of the given validators.
 * 
 * @param ivs Note that the validators must accept `unknown`
 * because there is no safe and convenient way to require multiple non-`unknown` types at the same time.
 */
export const or = <Ivs extends Array<AnyUnknownRequirementIntermediateValidator>>(...ivs: Ivs) =>
	validator(function*(x) {
		for (const iv of ivs) {
			if (is(x, iv)) return x as OrResult<Ivs[number]>
		}
		throw yield 'The value did not passed any of the given validators.'
	})

type ExtractStrictBase<ValidatorU extends AnyIntermediateValidator> =
	UnionToIntersection<RequirementOf<ValidatorU>>
/**
 * Unlike {@linkcode or}, the validator that returned by this function accepts
 * an intersection of the requirement of the validators.
 * 
 * {@linkcode or}
 */
export const orStrict = <Ivs extends Array<AnyIntermediateValidator>>(...ivs: Ivs) =>
	or(...ivs) as IntermediateValidator<OrResult<Ivs[number]> & ExtractStrictBase<Ivs[number]>, string, ExtractStrictBase<Ivs[number]>>

type And<IvU extends AnyIntermediateValidator, Strict extends boolean = false> =
	[(Strict extends true ? ExtractStrictBase<IvU> : unknown)] extends [infer Req]
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
 * 
 * @param ivs Note that the validators must accept `unknown`
 * because there is no safe and convenient way to require multiple non-`unknown` types at the same time.
 */
export const and = <Ivs extends Array<AnyUnknownRequirementIntermediateValidator>>(...ivs: Ivs) =>
	validator(function*(x) {
		for (const iv of ivs) yield* iv(x)
		return x as ValidationTargetOf<And<Ivs[number]>>
	})
/**
 * Unlike {@linkcode and}, the validator that returned by this function accepts
 * an intersection of the requirement of the validators.
 * 
 * {@linkcode and}
 */
export const andStrict = <Ivs extends Array<AnyIntermediateValidator>>(...ivs: Ivs) =>
	and(...ivs) as And<Ivs[number], true>

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
	if (typeof x != 'object') throw yield 'The value is not an object.'
	
	return yield* not<{}>()(null_)(x)
})

type ExtractEachValidationTarget<Src extends Record<any, AnyIntermediateValidator> | ReadonlyArray<AnyIntermediateValidator>> =
	{ [K in keyof Src]: Src[K] extends AnyIntermediateValidator ? ValidationTargetOf<Src[K]> : Src[K] }
type PropsResolved<P extends Record<PropertyKey, AnyIntermediateValidator>> =
	Expand<ExtractEachValidationTarget<P>>
/**
 * Validates the value is an object with specific properties.
 */
export const objectWithProps: {
	<
		Props extends Record<PropertyKey, AnyIntermediateValidator>,
		OptProps extends Record<PropertyKey, AnyIntermediateValidator>,
	>(props: Props, optionalProps: OptProps):
		IntermediateValidator<object & PropsResolved<Props> & Partial<PropsResolved<OptProps>>, string>
	<
		Props extends Record<PropertyKey, AnyIntermediateValidator>,
	>(props: Props):
		IntermediateValidator<object & PropsResolved<Props>, string>
} = (
	props: Record<PropertyKey, AnyIntermediateValidator>,
	optionalProps: Record<PropertyKey, AnyIntermediateValidator> = {}, // TODO: better design for optional properties
) =>
	validatorFor<object>()(function*(x) {
		const obj = yield* object(x)
		const keyOfObj = keyOf(obj)
		
		for (const key in props) {
			const objKey = yield* keyOfObj(key)
			yield* props[objKey](obj[objKey])
		}
		for (const key in optionalProps) {
			if (is(key, keyOfObj)) yield* props[key](obj[key])
		}
		
		return obj
	})

/**
 * Validates the value is a {@linkcode PropertyKey}.
 */
export const propertyKey: IntermediateValidator<PropertyKey, string> = or(string, number, symbol)
/**
 * Validates the value is a key (either a string or a symbol).
 */
export const key: IntermediateValidator<PropertyKey, string> = or(string, symbol)
/**
 * Validates the value is an own key of the given object.
 */
export const keyOf = <T extends object>(obj: T) =>
	validatorFor<keyof T>()(function*(x) {
		const k = yield* key(x)
		if (!Object.prototype.hasOwnProperty.call(obj, k)) throw yield 'The key is not in the given object.'
		return k as keyof T
	})

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
			const res = validate(elem, iv)
			if (!res.ok) throw yield [`There is an element that did not pass the given validator at index ${idx}.`, res.reason]
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
