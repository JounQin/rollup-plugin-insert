import { createFilter } from 'rollup-pluginutils'
import MagicString from 'magic-string'
import { Plugin } from 'rollup'

export interface RollupPluginInsertOptions {
  include?: string
  exclude?: string
  sourceMap?: boolean
}

export type RollupPluginInsertFn = (
  magicString: MagicString,
  code: string,
  id: string,
) => string | MagicString | void

export const transform = (
  insert: RollupPluginInsertFn,
  options: RollupPluginInsertOptions = {},
): Plugin => {
  const filter = createFilter(options.include, options.exclude)
  const sourceMap = options.sourceMap !== false

  return {
    name: 'insert',
    transform(code, id) {
      if (!filter(id)) return

      let magicString = new MagicString(code)
      const output = insert(magicString, code, id)

      if (typeof output === 'string') {
        magicString.overwrite(0, code.length, output)
      } else if (output instanceof MagicString) {
        magicString = output
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (output != null) {
        let received: string
        try {
          received = JSON.stringify(output)
        } catch {
          /* istanbul ignore next */
          received = String(output)
        }
        throw new TypeError(
          `The output content should be an instance of string or MagicString, but received: ${received}`,
        )
      }

      return {
        code: magicString.toString(),
        map: sourceMap ? magicString.generateMap() : undefined,
      }
    },
  }
}

export const append = (append: string, options?: RollupPluginInsertOptions) =>
  transform((magicString: MagicString) => magicString.append(append), options)

export const prepend = (prepend: string, options?: RollupPluginInsertOptions) =>
  transform((magicString: MagicString) => magicString.prepend(prepend), options)

export const wrap = (
  begin: string,
  end: string,
  options?: RollupPluginInsertOptions,
) =>
  transform(
    (magicString: MagicString) => magicString.prepend(begin).append(end),
    options,
  )

export default {
  transform,
  append,
  prepend,
  wrap,
}
