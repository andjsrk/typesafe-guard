import { isString, predicateFor } from '../src/index.js'

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

predicateFor<'a'>()((x: string, ok) => {
	if (x !== 'a') return
	return ok(x)
})
