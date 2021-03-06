import fs from 'fs'
import path from 'path'

import { rollup } from 'rollup'

import insert from '../index'

const resolve = (file: string) => path.resolve(__dirname, file + '.js')
const read = (file: string) => fs.readFileSync(resolve(file)).toString()

const format = { format: 'es' } as const
const options = { sourceMap: false }

const expectTransformed = read('transform-expect').replace(
  '$$',
  path.resolve(__dirname, 'template.html'),
)

test('should add file path comment in html template correctly', async () => {
  const bundle = await rollup({
    input: resolve('transform'),
    plugins: [
      insert.transform(
        (_magicString, code, id) =>
          `export default ${JSON.stringify(`<!--${id}-->\n${code}`)}`,
        {
          ...options,
          include: '**/*.html',
        },
      ),
    ],
  })

  const {
    output: [{ code }],
  } = await bundle.generate(format)

  expect(code).toBe(expectTransformed)
})

test('should throw error if returned content is not string nor MagicString', async () => {
  await expect(
    rollup({
      input: resolve('transform'),
      plugins: [insert.transform(() => 0 as any)],
    }),
  ).rejects.toThrow(
    'The output content should be an instance of string or MagicString, but received: 0',
  )
})

test('should work with returning void', async () => {
  const bundle = await rollup({
    input: resolve('transform'),
    plugins: [
      insert.transform(
        (magicString, code, id) => {
          magicString.overwrite(
            0,
            code.length,
            `export default ${JSON.stringify(`<!--${id}-->\n${code}`)}`,
          )
        },
        {
          ...options,
          include: '**/*.html',
        },
      ),
    ],
  })

  const {
    output: [{ code }],
  } = await bundle.generate(format)

  expect(code).toBe(expectTransformed)
})

test('should work with source map', async () => {
  const bundle = await rollup({
    input: resolve('transform'),
    plugins: [
      insert.transform(
        (magicString, code, id) => {
          magicString.overwrite(
            0,
            code.length,
            `export default ${JSON.stringify(`<!--${id}-->\n${code}`)}`,
          )
        },
        {
          include: '**/*.html',
        },
      ),
    ],
  })

  const {
    output: [{ code }],
  } = await bundle.generate(format)

  expect(code).toContain(expectTransformed)
})

test('should append code correctly', async () => {
  const bundle = await rollup({
    input: resolve('append'),
    plugins: [insert.append('export default append', options)],
  })

  const {
    output: [{ code }],
  } = await bundle.generate(format)

  expect(code).toMatch(/export default append;\s*$/)
})

test('should prepend code correctly', async () => {
  const bundle = await rollup({
    input: resolve('prepend'),
    plugins: [insert.prepend('const prepend = () => {}\n', options)],
  })

  const {
    output: [{ code }],
  } = await bundle.generate(format)

  expect(code).toMatch(/^const prepend = \(\) => {}/)
})

test('should wrap code correctly', async () => {
  const bundle = await rollup({
    input: resolve('wrap'),
    plugins: [
      insert.wrap('const wrap = () => {}\n', 'export default wrapped', options),
    ],
  })

  const {
    output: [{ code }],
  } = await bundle.generate(format)

  expect(code).toMatch(
    /^const wrap = \(\) => {}[\S\s]+export default wrapped;\s*$/,
  )
})
