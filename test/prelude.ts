import { entries, isNotNullish, isNullish, keys, stringKeyEntries, stringKeys } from '../src/prelude.js'

declare const x: unknown

if (isNullish(x)) x satisfies null | undefined
if (isNotNullish(x)) x satisfies {}
{
	const obj = { foo: 0, [Symbol()]: 0 }
	type ObjKey = keyof typeof obj

	for (const key of keys(obj)) {
		key satisfies ObjKey
		// @ts-expect-error
		key satisfies symbol
		// @ts-expect-error
		key satisfies string
	}
	for (const key of stringKeys(obj)) {
		key satisfies ObjKey & string
		// @ts-expect-error
		key satisfies symbol
	}
	for (const entry of entries(obj)) {
		entry satisfies [ObjKey, typeof obj[ObjKey]]
		// @ts-expect-error
		entry satisfies [ObjKey & string, typeof obj[ObjKey & string]]
		// @ts-expect-error
		entry satisfies [ObjKey & symbol, typeof obj[ObjKey & symbol]]
	}
	for (const entry of stringKeyEntries(obj)) {
		entry satisfies [ObjKey & string, typeof obj[ObjKey & string]]
		// @ts-expect-error
		entry satisfies [ObjKey & symbol, typeof obj[ObjKey & symbol]]
	}
}
