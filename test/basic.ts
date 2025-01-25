import { isString, predicateFor, Validator, validatorFor } from '../src/index.js'

validatorFor<string>()((x, ok, fail) => {
	if (typeof x !== 'string') return fail('not a string')
	return ok(x)
})
{
	// you have to specify either generic argument or type annotation explicitly
	// since TS does not infer `E` from `fail(...)`
	
	const v = validatorFor<string>()((x, ok, fail) => {
		if (typeof x !== 'string') {
			return fail(
				// @ts-expect-error
				0
			)
		}
		return ok(x)
	})
	// @ts-expect-error
	v satisfies
		Validator<string, number>
}
{
	const vAnnotation: Validator<unknown, boolean> = validatorFor()((x, ok, fail) => {
		fail(true)
		fail(
			// @ts-expect-error
			0
		)
		return ok(x)
	})
	
	const vGenericArg = validatorFor()<boolean>((x, ok, fail) => {
		fail(true)
		fail(
			// @ts-expect-error
			0
		)
		return ok(x)
	})
}

// with requirement
validatorFor<'a'>()((x: string, ok, fail) => {
	if (x !== 'a') return fail('not \'a\'')
	
	return ok(x)
})



predicateFor<string>()((x, ok) => {
	// without any helper in the package
	if (typeof x !== 'string') return
	return ok(x)
})

predicateFor<string>()((x, ok) => {
	// with helper
	if (!isString(x)) return
	return ok(x)
})

predicateFor<string>()((x, ok) =>
	// @ts-expect-error
	ok(x)
)

// with requirement
predicateFor<'a'>()((x: string, ok) => {
	if (x !== 'a') return
	return ok(x)
})
