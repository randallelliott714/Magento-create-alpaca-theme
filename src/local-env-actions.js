import * as fs from 'fs'
import * as fsPromises from 'fs/promises'
import { readFile } from 'fs/promises'
import { BASE_PATH } from '../utils/constants.js'

export function createDirectory(path) {
  return new Promise((resolve, reject) => {
    fs.mkdir(path, { recursive: true }, (err) => {
      if (err) {
        reject(err)
      }

      resolve()
    })
  })
}

export async function createFile(path, payload) {
  return fsPromises.writeFile(path, payload, (err) => {
    if (err) {
      throw err
    }
  })
}

export async function addTemplateFile(file, themeName = null) {
  const {
    name,
    templateFilePath,
    childFileDestination,
    replacePhrase,
    phraseToReplace,
    useSampleTemplate,
    addThemeNameToFileName,
    prependedImport
  } = file

  try {
    const template = useSampleTemplate
      ? await readFile(new URL(templateFilePath, import.meta.url))
      : await readFile(templateFilePath)
    const re = new RegExp(phraseToReplace, 'gim')
    const filePath = `${BASE_PATH}${themeName}${childFileDestination}`
    const updatedTemplate = replacePhrase ? template.toString().replace(re, themeName) : template

    if (childFileDestination.includes('dev')) {
      await createFile(childFileDestination, updatedTemplate)
    } else if (addThemeNameToFileName) {
      await createFile(`${filePath}_${themeName}-${name}`, updatedTemplate)
    } else {
      await createFile(`${filePath}${name}`, updatedTemplate)
    }

    if (prependedImport) {
      const data = fs.readFileSync(`${filePath}${name}`)
      const fd = fs.openSync(`${filePath}${name}`, 'w+')
      const buffer = Buffer.from(prependedImport.replace(re, themeName))
      fs.writeSync(fd, buffer, 0, buffer.length, 0)
      fs.writeSync(fd, data, 0, data.length, buffer.length)
      fs.close(fd)
    }
  } catch (error) {
    console.error(`\n${error}`)
  }
}
