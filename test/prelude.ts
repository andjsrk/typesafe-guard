import * as p from '../src/prelude.js'

declare const x: unknown

if (p.isNullish(x)) x satisfies null | undefined
if (p.isNotNullish(x)) x satisfies {}
{
	const obj = { foo: 0, [Symbol()]: 0 }
	type ObjKey = keyof typeof obj

	for (const key of p.objectKeys(obj)) {
		key satisfies ObjKey
		// @ts-expect-error
		key satisfies symbol
		// @ts-expect-error
		key satisfies string
	}
	for (const key of p.objectStringKeys(obj)) {
		key satisfies ObjKey & string
		// @ts-expect-error
		key satisfies symbol
	}
	for (const entry of p.objectEntries(obj)) {
		entry satisfies [ObjKey, typeof obj[ObjKey]]
		// @ts-expect-error
		entry satisfies [ObjKey & string, typeof obj[ObjKey & string]]
		// @ts-expect-error
		entry satisfies [ObjKey & symbol, typeof obj[ObjKey & symbol]]
	}
	for (const entry of p.objectStringKeyEntries(obj)) {
		entry satisfies [ObjKey & string, typeof obj[ObjKey & string]]
		// @ts-expect-error
		entry satisfies [ObjKey & symbol, typeof obj[ObjKey & symbol]]
	}
}
