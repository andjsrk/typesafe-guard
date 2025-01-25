# typesafe-guard
> :information_source: The package is ESM-only.

An utility for creating type-safe user-defined type guard for TypeScript.

# Motivation
Writing predicate functions is not type-safe because TS trusts the implementation completely even it is invalid:
```ts
const isObject = (x: unknown): x is object => true // always true!
const a: string | object = 'some string'
if (isObject(a)) {
	// now TS treats `a` as an object, even actually it is not
}
```
So I made a more safe way to writing predicate functions,
by requiring narrowing the value to the goal type!

# Usage
:white_check_mark: Compiles successfully
```ts
interface A {
	a: string
	b: number
}
const isA = predicateFor<A>()((x, ok) => {
	if (!isObjectWithProps({
		a: isString,
		b: isNumber,
	})(x)) return

	return ok(x)
})
```
\
:x: Error (which is intended)
```ts
interface A {
	a: string
	b: number
}
const isA = predicateFor<A>()((x, ok) => {
	if (!isObject(x)) return

	return ok(x) // error, because x is not narrowed enough
})
```
```ts
interface A {
	a: string
	b: number
}
const isA = predicateFor<A>()((x, ok) => {
	if (!isObject(x)) return

	// error, because the function does not return `ok(...)`
})
```
\
:information_source: You can derive an assertion function from a predicate function:
```ts
const assertString: Asserter<string> = asserterFromPredicate(isString)
//                  ^^^^^^^^^^^^^^^^
//                  you need to specify the type yet because
//                  TS requires an explicit type annotation
//                  on assertion functions
```

:information_source: You can write a validator, which is a predicate with fail reason:
```ts
const validateString = validatorFor<string>()((x, ok, fail) => {
	if (!isString(x)) return fail('Not a string.')
	
	return ok(x)
})

// you can derive a predicate function from a validator
const myIsString = predicateFromValidator(validateString)

// you can derive an asserter from a validator
const assertString: Asserter<string> = asserterFromValidator(validateString)
```
