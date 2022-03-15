import * as fs from 'fs'
import {
  readFile,
  writeFile,
  readdir,
  rename
} from 'fs/promises'
import {
  VARIABLES_IMPORT_PATHS,
  BASE_PATH
} from '../constants/constants.js'

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

async function createFile(path, payload) {
  return writeFile(path, payload, (err) => {
    if (err) {
      throw err
    }
  })
}

async function listFiles(directory) {
  const dirents = await readdir(directory, { withFileTypes: true })

  return dirents
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name)
}

async function replacePhrase(filePath, phraseToReplace, phraseToReplaceWith) {
  const re = new RegExp(phraseToReplace, 'gim')
  const file = await readFile(filePath)
  const fileUpdated = file.toString().replace(re, phraseToReplaceWith)

  await createFile(filePath, fileUpdated)
}

async function addFilesFromDir(dir, themeName, ignoredFiles, dirInChildTheme = '') {
  const configFiles = await listFiles(dir)
  const re = new RegExp(ignoredFiles)
  const configFilesFiltered = configFiles.filter((str) => !re.test(str))

  await Promise.all(configFilesFiltered.map(async (fileName) => {
    const file = await readFile(`${dir}/${fileName}`)
    await createFile(`${BASE_PATH}${themeName}${dirInChildTheme}/${fileName}`, file)
  }))
}

async function addFilesFromTemplate(templateDir, targetDir) {
  const fileList = await listFiles(new URL(templateDir, import.meta.url))

  await Promise.all(fileList.map(async (fileName) => {
    const file = await readFile(new URL(`${templateDir}/${fileName}`, import.meta.url))
    await createFile(`${targetDir}/${fileName}`, file)
  }))
}

async function editFiles(filesToUpdate, dir) {
  await Promise.all(filesToUpdate.map(async (file) => {
    await replacePhrase(`${dir}/${file.name}`, file.phraseToReplace, file.phraseToReplaceWith)
  }))
}

async function prependImport(
  filePath,
  textToPrepend,
  themeName,
  lineToPrepend = null,
  prependAfterWord = null,
  phraseToReplace = null
) {
  const data = fs.readFileSync(filePath)
  const dataArr = data.toString().split('\n')
  const lineIdx = lineToPrepend || dataArr.findIndex((str) => str.includes(prependAfterWord)) + 2
  const re = phraseToReplace ? new RegExp(phraseToReplace, 'gim') : null

  dataArr.splice(lineIdx, 0, phraseToReplace ? textToPrepend.replace(re, themeName) : textToPrepend)
  const text = dataArr.join('\n')
  const fd = fs.openSync(filePath, 'w+')

  fs.writeSync(fd, text, 0, text.length, 0)
  fs.close(fd)
}

export async function copyImage(imagePaths) {
  const {
    imgTemplatePath,
    localImgPath
  } = imagePaths
  const img = await readFile(new URL(imgTemplatePath, import.meta.url))

  try {
    await createFile(localImgPath, img)
  } catch (error) {
    console.error(`\n${error}`)
  }
}

const ALPACA_THEME_DIR = 'vendor/snowdog/theme-frontend-alpaca'
const ALPACA_STYLES_DIR = `${ALPACA_THEME_DIR}/styles`
const ALPACA_COMPONENTS_DIR = `${ALPACA_THEME_DIR}/Snowdog_Components`
const ALPACA_COMPONENTS_STYLES_DIR = `${ALPACA_COMPONENTS_DIR}/components/styles`
const ALPACA_COMPONENTS_DOCS_STYLES_DIR = `${ALPACA_COMPONENTS_DIR}/docs/styles`
const MAGENTO_CHECKOUT_STYLES_DIR = `${ALPACA_THEME_DIR}/Magento_Checkout/styles`

const TEMPLATES_DIR = '../templates'

export async function setupComponentsConfigFiles(themeName) {
  const componentFilesToUpdate = [
    {
      name: 'gulpfile.mjs',
      phraseToReplace: 'Alpaca',
      phraseToReplaceWith: themeName
    },
    {
      name: 'package.json',
      phraseToReplace: 'alpaca-components',
      phraseToReplaceWith: themeName
    }
  ]

  await addFilesFromDir(ALPACA_COMPONENTS_DIR, themeName, '.lock|.md', '/Snowdog_Components')
  await addFilesFromTemplate('../templates/components/config', `${BASE_PATH}${themeName}/Snowdog_Components`)
  await editFiles(componentFilesToUpdate, `${BASE_PATH}${themeName}/Snowdog_Components`)
}

export async function setupThemeConfigFiles(themeName, fullThemeName) {
  const themeFilesToUpdate = [
    {
      name: 'theme.xml',
      phraseToReplace: 'Alpaca Theme',
      phraseToReplaceWith: fullThemeName
    },
    {
      name: 'registration.php',
      phraseToReplace: 'alpaca',
      phraseToReplaceWith: themeName
    },
    {
      name: 'README.md',
      phraseToReplace: 'YOUR_THEME_NAME',
      phraseToReplaceWith: fullThemeName
    }
  ]

  await addFilesFromDir(ALPACA_THEME_DIR, themeName, '.lock|.md|now|LICENSE|composer')
  await addFilesFromTemplate('../templates/theme', `${BASE_PATH}${themeName}`)
  await editFiles(themeFilesToUpdate, `${BASE_PATH}${themeName}`)
}

export async function setupFrontoolsConfigFiles(themeName) {
  const frontoolsFilesToUpdate = [
    {
      name: 'browser-sync.json',
      phraseToReplace: 'YOUR_THEME_NAME',
      phraseToReplaceWith: themeName
    },
    {
      name: 'themes.json',
      phraseToReplace: 'YOUR_THEME_NAME',
      phraseToReplaceWith: themeName
    }
  ]

  await addFilesFromTemplate('../templates/frontools', 'dev/tools/frontools/config')
  await editFiles(frontoolsFilesToUpdate, 'dev/tools/frontools/config')
}

export async function addBaseStyles(themeName) {
  const docsPath = `${BASE_PATH}${themeName}/Snowdog_Components/docs/styles`
  const docsFilesNames = await listFiles(docsPath)
  const docsText = VARIABLES_IMPORT_PATHS.COMMENT + VARIABLES_IMPORT_PATHS.DOCS

  const chechoutPath = `${BASE_PATH}${themeName}/Magento_Checkout/styles/checkout.scss`
  const checkoutText = VARIABLES_IMPORT_PATHS.COMMENT + VARIABLES_IMPORT_PATHS.CHECKOUT

  const themeLevelStylesPath = `${BASE_PATH}${themeName}/styles`
  const themeLevelStyles = await listFiles(themeLevelStylesPath)
  const themeLevelStylesText = VARIABLES_IMPORT_PATHS.COMMENT + VARIABLES_IMPORT_PATHS.MAIN

  // Components docs styles
  await addFilesFromDir(ALPACA_COMPONENTS_DOCS_STYLES_DIR, themeName, '_', '/Snowdog_Components/docs/styles')
  await Promise.all(docsFilesNames.map(async (fileName) => {
    await prependImport(`${docsPath}/${fileName}`, docsText, themeName, null, 'variables', 'YOUR_THEME_NAME')
  }))

  // Magento checkout styles
  await addFilesFromDir(MAGENTO_CHECKOUT_STYLES_DIR, themeName, '_', '/Magento_Checkout/styles')
  await prependImport(chechoutPath, checkoutText, themeName, null, 'variables', 'YOUR_THEME_NAME')

  // Theme level styles
  await addFilesFromDir(ALPACA_STYLES_DIR, themeName, 'email|gallery', '/styles')
  await Promise.all(themeLevelStyles.map(async (fileName) => {
    await prependImport(`${themeLevelStylesPath}/${fileName}`, themeLevelStylesText, themeName, null, 'variables', 'YOUR_THEME_NAME')
  }))

  // Component variables
  await addFilesFromTemplate('../templates/components/base', `${BASE_PATH}${themeName}/Snowdog_Components/components/Atoms/variables`)
  await rename(`${BASE_PATH}${themeName}/Snowdog_Components/components/Atoms/variables/variables.scss`, `${BASE_PATH}${themeName}/Snowdog_Components/components/Atoms/variables/_${themeName}-variables.scss`)
}

// Exemplary styles to extend button
export async function addExemplaryStyles(themeName) {
  const exemplaryFilesToUpdate = [
    {
      name: '_button-extend.scss',
      phraseToReplace: 'themeName',
      phraseToReplaceWith: themeName
    }
  ]

  const criticalStylesToUpdate = [
    {
      name: '_critical.scss',
      phraseToReplace: '../Molecules/button/button',
      phraseToReplaceWith: '../Molecules/button/button-extend'
    },
    {
      name: '_critical-checkout.scss',
      phraseToReplace: '../Molecules/button/button',
      phraseToReplaceWith: '../Molecules/button/button-extend'
    }
  ]

  await addFilesFromTemplate('../templates/components/exemplary', `${BASE_PATH}${themeName}/Snowdog_Components/components/Molecules/button`)
  await editFiles(exemplaryFilesToUpdate, `${BASE_PATH}${themeName}/Snowdog_Components/components/Molecules/button`)
  await rename(`${BASE_PATH}${themeName}/Snowdog_Components/components/Molecules/button/button.scss`, `${BASE_PATH}${themeName}/Snowdog_Components/components/Molecules/button/_${themeName}-button.scss`)
  await rename(`${BASE_PATH}${themeName}/Snowdog_Components/components/Molecules/button/button-variables.scss`, `${BASE_PATH}${themeName}/Snowdog_Components/components/Molecules/button/_${themeName}-button-variables.scss`)

  await addFilesFromDir(ALPACA_COMPONENTS_STYLES_DIR, themeName, 'mixins|-extends|_checkout', '/Snowdog_Components/components/styles')
  await editFiles(criticalStylesToUpdate, `${BASE_PATH}${themeName}/Snowdog_Components/components/styles`)
}
