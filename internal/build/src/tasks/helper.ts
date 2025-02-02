import path from 'path'
import {
  arrayToRegExp,
  getTypeSymbol,
  hyphenate,
  isCommonType,
  isEnumType,
  isUnionType,
  main,
} from 'components-helper'
import {
  epOutput,
  epPackage,
  getPackageManifest,
  projRoot,
} from '@element-plus/build-utils'

import type { TaskFunction } from 'gulp'
import type {
  ReAttribute,
  ReComponentName,
  ReDocUrl,
  ReWebTypesSource,
  ReWebTypesType,
} from 'components-helper'

const typeMap = {
  vue: ['Component', 'VNode'],
}

const reComponentName: ReComponentName = (title) =>
  `el-${hyphenate(title).replace(/[ ]+/g, '-')}`

const reDocUrl: ReDocUrl = (fileName, header) => {
  const docs = 'https://element-plus.org/en-US/component/'
  const _header = header ? header.replaceAll(/\s+/g, '-').toLowerCase() : ''

  return `${docs}${fileName}.html${_header ? '#' : ''}${_header}`
}

const reWebTypesSource: ReWebTypesSource = (title) => {
  const symbol = `El${title
    .replaceAll(/-/g, ' ')
    .replaceAll(/^\w|\s+\w/g, (item) => {
      return item.trim().toUpperCase()
    })}`

  return { symbol }
}

const reAttribute: ReAttribute = (value, key, _, title) => {
  const str = value
    .replace(/^\*\*(.*)\*\*$/, (_, item) => item)
    .replace(/^`(.*)`$/, (_, item) => item)
    .replaceAll(/<del>.*<\/del>/g, '')

  if (title === 'Events' && key === 'Name' && /^(-|—)$/.test(str)) {
    return 'default'
  } else if (str === '' || /^(-|—)$/.test(str)) {
    return undefined
  } else if (key === 'Name' && /v-model:(.+)/.test(str)) {
    const _str = str.match(/v-model:(.+)/)
    return _str ? _str[1] : undefined
  } else if (key === 'Name' && /v-model/.test(str)) {
    return 'model-value'
  } else if (key === 'Name') {
    return str
      .replaceAll(/\s*[\\*]\s*/g, '')
      .replaceAll(/\s*<.*>\s*/g, '')
      .replaceAll(/\s*\(.*\)\s*/g, '')
      .replaceAll(/\B([A-Z])/g, '-$1')
      .toLowerCase()
  } else if (key === 'Type') {
    return str
      .replaceAll(/\bfunction(\(.*\))?(:\s*\w+)?\b/gi, 'Function')
      .replaceAll(/\bdate\b/g, 'Date')
      .replaceAll(/\bstring \| Component\b/g, 'string / Component')
      .replaceAll(/\([^)]*\)(?!\s*=>)/g, '')
  } else if (key === 'Accepted Values') {
    return /\[.+\]\(.+\)/.test(str) || /^\*$/.test(str)
      ? undefined
      : str.replaceAll(/`/g, '').replaceAll(/\([^)]*\)(?!\s*=>)/g, '')
  } else if (key === 'Subtags') {
    return str
      ? `el-${str
          .replaceAll(/\s*\/\s*/g, '/el-')
          .replaceAll(/\B([A-Z])/g, '-$1')
          .replaceAll(/\s+/g, '-')
          .toLowerCase()}`
      : undefined
  } else {
    return str
  }
}

const reWebTypesType: ReWebTypesType = (type) => {
  const isEnum = isEnumType(type)
  const isTuple = /^\[.*\]$/.test(type)
  const isArrowFunction = /^\(.*\)\s*=>\s*\w+/.test(type)
  const isPublicType = isCommonType(type)
  const symbol = getTypeSymbol(type)
  const isUnion = isUnionType(symbol)
  const module = findModule(type)

  return isEnum ||
    isTuple ||
    isArrowFunction ||
    isPublicType ||
    !symbol ||
    isUnion
    ? type
    : { name: type, source: { symbol, module } }
}

const findModule = (type: string): string | undefined => {
  let result: string | undefined = undefined

  for (const key in typeMap) {
    const regExp = arrayToRegExp(typeMap[key as keyof typeof typeMap])
    const inModule = regExp.test(getTypeSymbol(type))

    if (inModule) {
      result = key
      break
    }
  }

  return result
}

export const buildHelper: TaskFunction = (done) => {
  const { name, version } = getPackageManifest(epPackage)

  const tagVer = process.env.TAG_VERSION
  const _version = tagVer
    ? tagVer.startsWith('v')
      ? tagVer.slice(1)
      : tagVer
    : version!

  main({
    name: name!,
    version: _version,
    entry: `${path.resolve(
      projRoot,
      'docs/en-US/component'
    )}/!(datetime-picker|message-box|message).md`,
    outDir: epOutput,
    reComponentName,
    reDocUrl,
    reWebTypesSource,
    reAttribute,
    reWebTypesType,
    props: 'Attributes',
    propsOptions: 'Accepted Values',
    tableRegExp:
      /#+\s+(.*\s*Attributes|.*\s*Events|.*\s*Slots|.*\s*Directives)\s*\n+(\|?.+\|.+)\n\|?\s*:?-+:?\s*\|.+((\n\|?.+\|.+)+)/g,
  })

  done()
}
