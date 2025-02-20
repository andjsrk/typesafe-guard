import assert from 'assert'
import * as p from '../src/prelude.js'

{
	const enumerableSymKey = Symbol()
	const nonEnumerableSymKey = Symbol()
	const obj: Record<'enumerableStrKey' | typeof enumerableSymKey, number> = {
		enumerableStrKey: 0,
		[enumerableSymKey]: 1,
	}
	Object.defineProperties(obj, {
		nonEnumerableStrKey: {
			value: 2,
			enumerable: false,
		},
		[nonEnumerableSymKey]: {
			value: 3,
			enumerable: false,
		},
	})
	
	const kg = p.objectKeys(obj)
	kg satisfies Generator<string | symbol>
	const keys = [...kg]
	assert(keys.length == 2)
	assert(keys.includes('enumerableStrKey'))
	assert(keys.includes(enumerableSymKey))
	
	const skg = p.objectStringKeys(obj)
	skg satisfies Generator<string>
	const strKeys = [...skg]
	assert(strKeys.length == 1)
	assert(strKeys.includes('enumerableStrKey'))
	
	const eg = p.objectEntries(obj)
	eg satisfies Generator<['enumerableStrKey', number] | [typeof enumerableSymKey, number]>
	const entries = [...eg]
	assert(entries.length == 2)
	assert(entries.some(([k, v]) => k === 'enumerableStrKey' && v === 0))
	assert(entries.some(([k, v]) => k === enumerableSymKey && v === 1))
	
	const skeg = p.objectStringKeyEntries(obj)
	skeg satisfies Generator<['enumerableStrKey', number]>
	const strKeyEntries = [...skeg]
	assert(strKeyEntries.length == 1)
	assert(strKeyEntries.some(([k, v]) => k === 'enumerableStrKey' && v === 0))
}
