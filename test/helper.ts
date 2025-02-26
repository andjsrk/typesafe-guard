import assert from 'node:assert'
import * as h from '../src/helper.js'
import { type IntermediateValidator, validate, ValidationTargetOf } from '../src/validator.js'
import { is } from '../src/predicate.js'
import { compileOnly } from './common.js'

const testHelper = <T extends Req, Req>(
	iv: IntermediateValidator<T, any, Req>,
	{ ok, fail }: Record<'ok' | 'fail', Array<NoInfer<Req>>>,
	assertion: (x: NoInfer<Req>) => boolean,
	_body: (x: NoInfer<Req>, pass: (x: NoInfer<Req>) => x is T) => void,
) => {
	const cases = [
		...ok.map(x => [x, true] as const),
		...fail.map(x => [x, false] as const),
	]
	for (const [x, expectedOk] of cases) {
		const res = validate(x, iv)
		
		const pass = res.ok === expectedOk
		if (!pass) {
			if (res.ok) {
				console.error('Expected', x, 'to fail, but actually succeeded.')
			} else {
				console.error('Expected', x, 'to succeed, but actually failed with', res.reason, '.')
			}
			throw new Error('Validation result is not as expected.')
		}
		assert(expectedOk === assertion(x))
	}
}

const emptyObj = {} as object

testHelper(
	h.string,
	{
		ok: ['a', ''],
		fail: [0, emptyObj, new String()],
	},
	x => typeof x == 'string',
	(x, pass) =>
		pass(x)
			? x satisfies string
			// @ts-expect-error
			: x satisfies string
)

testHelper(
	h.object,
	{
		ok: [emptyObj, [], () => {}],
		fail: [0, null, undefined],
	},
	x => typeof x == 'object' && !!x || typeof x == 'function',
	(x, pass) =>
		pass(x)
			? x satisfies object
			// @ts-expect-error
			: x satisfies object
)

testHelper(
	h.nullish,
	{
		ok: [null, undefined],
		fail: [0, '', emptyObj],
	},
	x => x === null || x === undefined,
	(x, pass) =>
		pass(x)
			? x satisfies null | undefined
			// @ts-expect-error
			: x satisfies null | undefined
)
// a test for `notNullish` is intentionally skipped - testing for `not` is sufficient

{
	const obj = {
		foo: 0,
		bar: '',
	}
	compileOnly(() => {
		// primitive values are not accepted
		h.strictKeyOf(
			// @ts-expect-error
			0
		)
		// has a requirement
		h.strictKeyOf(obj)(
			// @ts-expect-error
			true
		)
	})
	testHelper(
		h.strictKeyOf(obj),
		{
			ok: ['foo', 'bar'],
			fail: ['baz', Symbol()],
		},
		x => x === 'foo' || x === 'bar',
		(x, pass) =>
			pass(x)
				? x satisfies keyof typeof obj
				// @ts-expect-error
				: x satisfies keyof typeof obj
	)
	compileOnly(() => {
		// requires nothing
		h.keyOf(obj)(true)
	})
	
	testHelper(
		h.propValueOf(obj),
		{
			ok: [0, ''],
			fail: [undefined, 1, 'abc'],
		},
		x => x === 0 || x === '',
		(x, pass) =>
			pass(x)
				? x satisfies typeof obj[keyof typeof obj]
				// @ts-expect-error
				: x satisfies typeof obj[keyof typeof obj]
	)
}

compileOnly(() => {
	// has a requirement
	h.strictProp('foo', h.string)(
		// @ts-expect-error
		0
	)
})
testHelper(
	h.strictProp('foo', h.string),
	{
		ok: [{ foo: '' }],
		fail: [emptyObj, { foo: 0 }, { bar: '' }, Object.create({ foo: '' })],
	},
	x => Object.prototype.hasOwnProperty.call(x, 'foo') && 'foo' in x/* hint for TS compiler */ && typeof x.foo == 'string',
	(x, pass) =>
		pass(x)
			? x satisfies { foo: string }
			// @ts-expect-error
			: x satisfies { foo: string }
)
testHelper(
	h.strictProp('foo', h.string, { own: false }),
	{
		ok: [{ foo: '' }, Object.create({ foo: '' })],
		fail: [emptyObj, { foo: 0 }, { bar: '' }],
	},
	x => 'foo' in x && typeof x.foo == 'string',
	(x, pass) =>
		pass(x)
			? x satisfies { foo: string }
			// @ts-expect-error
			: x satisfies { foo: string }
)
testHelper(
	h.strictProp('foo', h.string, { own: false, partial: true }),
	{
		ok: [emptyObj, { foo: '' }, Object.create({ foo: '' })],
		fail: [{ foo: 0 }, Object.create({ foo: 0 })],
	},
	x => !('foo' in x) || typeof x.foo == 'string',
	(x, pass) =>
		pass(x)
			? (x satisfies { foo?: string }).foo
			// @ts-expect-error
			: (x satisfies { foo?: string }).foo
)
compileOnly(() => {
	// requires nothing
	h.prop('foo', h.string)(0)
})
testHelper(
	h.looseProp('length', h.number),
	{
		ok: ['', []],
		fail: [null, 0, {}],
	},
	x => 'length' in Object(x) && typeof (x as any).length == 'number',
	(x, pass) =>
		pass(x)
			? x satisfies { length: number }
			// @ts-expect-error
			: x satisfies { length: number }
)

// NOTE: `props` relies on `prop`
compileOnly(() => {
	// has a requirement
	h.strictProps({})(
		// @ts-expect-error
		0
	)
})
testHelper(
	h.strictProps({ foo: h.string, bar: h.number }, { own: false }),
	{
		ok: [{ foo: '', bar: 0 }],
		fail: [emptyObj, { foo: '' }, { bar: 0 }, { foo: 0, bar: 0 }],
	},
	x => 'foo' in x && 'bar' in x && typeof x.foo == 'string' && typeof x.bar == 'number',
	(x, pass) =>
		pass(x)
			? x satisfies { foo: string; bar: number }
			// @ts-expect-error
			: x satisfies { foo: string; bar: number }
)
testHelper(
	h.strictProps({ foo: h.string, bar: h.number }, { own: false, partial: true }),
	{
		ok: [{ foo: '', bar: 0 }, emptyObj, { foo: '' }, { bar: 0 }],
		fail: [{ foo: 0, bar: 0 }],
	},
	x => (!('foo' in x) || typeof x.foo == 'string') && (!('bar' in x) || typeof x.bar == 'number'),
	(x, pass) => {
		if (pass(x)) {
			const { foo, bar } = x satisfies { foo?: string; bar?: number }
		} else {
			// @ts-expect-error
			const { foo, bar } = x satisfies { foo?: string; bar?: number }
		}
	}
)
testHelper(
	h.strictProps({ foo: h.string }, { allowExtra: false }),
	{
		ok: [{ foo: '' }],
		fail: [{ foo: '', bar: 0, }],
	},
	x => Reflect.ownKeys(x).length <= ['foo'].length,
	() => {} // type checking is meaningless here
)
testHelper(
	h.strictProps({ foo: h.string, bar: h.number }, { partial: true, allowExtra: false }),
	{
		ok: [{ foo: '' }, { bar: 0 }],
		fail: [{ baz: true }, { foo: '', baz: true }, { foo: '', bar: 0, baz: true }],
	},
	x => new Set(Reflect.ownKeys(x)).difference(new Set(['foo', 'bar'])).size <= 0,
	() => {} // type checking is meaningless here
)
testHelper(
	h.strictProps({}),
	{
		ok: [emptyObj],
		fail: [], // nothing
	},
	_ => true,
	(x, pass) =>
		pass(x)
			? [
				{} satisfies typeof x,
				x satisfies Partial<Record<any, never>>,
			]
			: x satisfies never
)
compileOnly(() => {
	// requires nothing
	h.props({})(0)
})

testHelper(
	h.strictDict(h.string, h.number),
	{
		ok: [{ a: 0 }, { a: 0, b: 1 }],
		fail: [{ [Symbol()]: 0 }, { a: '' }, { a: 0, b: '' }],
	},
	x => Reflect.ownKeys(x).every(key => typeof key == 'string' && typeof x[key as never] == 'number'),
	(x, pass) =>
		pass(x)
			? x satisfies Record<string, number>
			// @ts-expect-error
			: x satisfies Record<string, number>
)
compileOnly(() => {
	// requires nothing
	h.dict(h.string, h.number)(0)
})

testHelper(
	h.array,
	{
		ok: [[], [0], ['']],
		fail: [0, '', emptyObj],
	},
	x => Array.isArray(x),
	(x, pass) =>
		pass(x)
			? x satisfies Array<unknown>
			// @ts-expect-error
			: x satisfies Array<unknown>
)
testHelper(
	h.arrayOf(h.string),
	{
		ok: [],
		fail: [],
	},
	x => Array.isArray(x) && x.every(x => typeof x == 'string'),
	(x, pass) =>
		pass(x)
			? x satisfies Array<string>
			// @ts-expect-error
			: x satisfies Array<string>
)
testHelper(
	h.tuple(),
	{
		ok: [[]],
		fail: [0, '', emptyObj],
	},
	x => Array.isArray(x) && x.length == 0,
	(x, pass) =>
		pass(x)
			? x satisfies []
			// @ts-expect-error
			: x satisfies []
)
testHelper(
	h.tuple(h.string),
	{
		ok: [['']],
		fail: [[], [0], ['', ''], [0, 0]],
	},
	x => Array.isArray(x) && x.length == 1 && typeof x[0] == 'string',
	(x, pass) =>
		pass(x)
			? x satisfies [string]
			// @ts-expect-error
			: x satisfies [string]
)
testHelper(
	h.tuple(h.string, h.number),
	{
		ok: [['', 0]],
		fail: [[], [''], [0], ['', ''], [0, ''], ['', 0, '']],
	},
	x => Array.isArray(x) && x.length == 2 && typeof x[0] == 'string' && typeof x[1] == 'number',
	(x, pass) =>
		pass(x)
			? x satisfies [string, number]
			// @ts-expect-error
			: x satisfies [string, number]
)


// complex helpers

testHelper(
	h.pipe(h.object, h.strictProps({ foo: h.string })),
	{
		ok: [{ foo: '' }],
		fail: [0, '', emptyObj], // `pipe` here makes primitive values valid as an input, but the validation still fails
	},
	// NOTE: used `in` for convenience, although it is not appropriate, strictly
	x => is(x, h.object) && 'foo' in x && typeof x.foo == 'string',
	(x, pass) =>
		pass(x)
			? x satisfies { foo: string }
			// @ts-expect-error
			: x satisfies { foo: string }
)

testHelper(
	h.or(h.string, h.number),
	{
		ok: [0, ''],
		fail: [true, Symbol(), emptyObj, [], () => {}],
	},
	x => typeof x == 'string' || typeof x == 'number',
	(x, pass) =>
		pass(x)
			? x satisfies string | number
			// @ts-expect-error
			: x satisfies string | number
)

testHelper(
	h.or(h.string, h.number),
	{
		ok: [0, ''],
		fail: [true, Symbol(), emptyObj, [], () => {}],
	},
	x => typeof x == 'string' || typeof x == 'number',
	(x, pass) =>
		pass(x)
			? x satisfies string | number
			// @ts-expect-error
			: x satisfies string | number
)

testHelper(
	h.and(h.strictProp('foo', h.string), h.strictProp('bar', h.number)),
	{
		ok: [{ foo: '', bar: 0 }],
		fail: [emptyObj, { foo: '' }, { bar: 0 }, { foo: 0, bar: 0 }],
	},
	x => 'foo' in x && typeof x.foo == 'string' && 'bar' in x && typeof x.bar == 'number',
	(x, pass) =>
		pass(x)
			? x satisfies { foo: string; bar: number }
			// @ts-expect-error
			: x satisfies { foo: string; bar: number }
)

testHelper(
	h.not<{}>()(h.or(h.null_, h.undefined_)),
	{
		ok: [0, '', [], emptyObj],
		fail: [null, undefined],
	},
	x => x !== null && x !== undefined,
	(x, pass) =>
		pass(x)
			? x satisfies {}
			// @ts-expect-error
			: x satisfies {}
)

testHelper(
	h.equal(0),
	{
		ok: [0],
		fail: [1, -1.23, '', null, emptyObj],
	},
	x => x === 0,
	(x, pass) =>
		pass(x)
			? x satisfies 0
			// @ts-expect-error
			: x satisfies 0
)

compileOnly(() => {
	type Expected = 0 | 1 | 2
	
	const iv = h.oneOf(0, 1, 2)
	iv satisfies IntermediateValidator<Expected, any>
	0 as Expected satisfies ValidationTargetOf<typeof iv>
})
declare const gen: Generator<0 | 1 | 2>
compileOnly(() => {
	type Expected = 0 | 1 | 2
	
	// currently const generics cannot infer type correctly from generators
	// @ts-expect-error
	h.oneOf(...gen) satisfies IntermediateValidator<Expected, any>
	// @ts-expect-error
	h.oneOf(...gen) satisfies IntermediateValidator<number, any> // not even `number`
	
	const iv = h.looseOneOf(...gen)
	iv satisfies IntermediateValidator<Expected, any>
	0 as Expected satisfies ValidationTargetOf<typeof iv>
})

{
	class A { foo = '' }
	testHelper(
		h.instanceOf(A),
		{
			ok: [new A()],
			fail: [0, emptyObj, { foo: '' }],
		},
		x => x instanceof A,
		(x, pass) =>
			pass(x)
				? x satisfies A
				// @ts-expect-error
				: x satisfies A
	)
}
