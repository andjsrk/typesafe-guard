# typesafe-guard
> :information_source: The package is ESM-only.

A utility for creating type-safe user-defined type guard for TypeScript.

# Motivation
Writing predicate functions is not type-safe because
TS trusts the implementation completely even it is invalid:
```ts
const isObject = (x: unknown): x is object => true // always true!
const strOrObj: string | object = 'some string'
if (isObject(strOrObj)) {
	// now TS treats `strOrObj` as an object, even actually it is not
}
```
So I made a more safe way to writing predicate functions
&mdash;not only for predicate functions, actually&mdash;
by requiring narrowing the value to the goal type!

# Usage
First, write a validator:
```ts
interface User {
	name: string
	age: number
}
const User = validatorFor<User>()(function*(x) {
	const user = yield* objectWithProps({
		name: string,
		age: number,
	})(x)
	
	// you can make the validation fail, by `throw yield ...`
	if (user.age <= 0) throw yield 'The user\'s age is not positive.'
	
	return user
})

// examples of INVALID usage
const User = validatorFor<User>()(function*(x) {
	const user = yield* object(x)
	
	return user // error, because the value is not narrowed enough
})
const User = validatorFor<User>()(function*(x) {
	const user = yield* object(x)
	
	// error, because the function does not return anything
})
```
Then, use the validator wherever you want:
```ts
// for validation
const res = validate(someValue, User) // Result<User, string>
if (res.ok) {
	// validation succeeded
	const user = res.value // user: User
} else {
	// validation failed
	const reason = res.reason // reason: string
}

// for predicate function
if (is(someValue, User)) {
	// someValue: User
}

// for assertion
assertIs(someValue, User)
// someValue: User
```

:information_source: An alternative way to `const foo = yield* someValidator(x)`,
you can use the assertion function `require()`:
```ts
validatorFor<User>()(function*(x) {
	require(x, yield* objectWithProps({
		name: string,
		age: number,
	})(x))
	// now x is narrowed
	
	return x
})
```

:information_source: You can write a validator first, then derive a type from the validator:
```ts
const User = validator(function*(x) {
	const user = yield* objectWithProps({
		name: string,
		age: number,
	})
	
	return user
})
type User = ValidationTargetOf<typeof User>
// type User = {
//   name: string
//   age: number
// }
```

:information_source: If your validator is just a combination of other validators,
you can just eject the contents of the validator:
```ts
const User = objectWithProps({
	name: string,
	age: number,
})
// or if you want to check its type
const User = validatorFor<User>()(objectWithProps({
	name: string,
	age: number,
}))

is(someValue, User) // ok
```

:information_source: All validators are just a validator, whether yours or built-ins:
```ts
is(someValue, string) // ok

validator(function*(x) {
	const user = yield* User(x) // ok
	
	return user
})
