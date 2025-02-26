/**
 * @example
 * ```ts
 * const foo = (x: { bar: 0 }, partial: boolean) => {
 *   if (!('baz' in x)) {
 *     if (partial) return noInferReturn(x satisfies { bar: 0 })
 *     else throw new Error()
 *   }
 *   return x as { bar: 0; baz?: unknown }
 * }
 * ```
 */
export const noInferReturn = (value: unknown) => value as never
