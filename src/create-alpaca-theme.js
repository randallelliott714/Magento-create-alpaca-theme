import colors from 'colors'
import Inquirer from 'inquirer'
import cliProgress from 'cli-progress'
import Spinner from '../utils/spinner.js'
import { templateFiles, exemplaryComponent } from './filesList.js'
import { directoriesList } from './directioriesList.js'
import { CLISuccesMessage } from '../utils/messages.js'
import { magentoUpgrade } from './magento-actions.js'
import { composerRequire } from './composer-actions.js'
import { installComponents } from './components-actions.js'
import { installFrontools, compileFiles } from './frontools-actions.js'
import {
  validateName,
  validateComposer,
  isMagentoInstance,
  validateRegistrationName
} from './validators.js'
import {
  createDirectory,
  addTemplateFile
} from './local-env-actions.js'
import {
  BASE_PATH,
  LOADING_BAR,
  PACKAGE_PATH,
  NOT_MAGENTO_MSG_TOP,
  CHECK_MARK_CHARACTER,
  NOT_MAGENTO_MSG_BOTTOM
} from '../utils/constants.js'

const { log } = console
const spinner = new Spinner()
const infoColor = colors.yellow
const bar = new cliProgress.SingleBar({
  format: LOADING_BAR.FORMAT,
  barCompleteChar: LOADING_BAR.COMPLETE_CHAR,
  barIncompleteChar: LOADING_BAR.INCOMPLETE_CHAR,
  hideCursor: LOADING_BAR.CURSOR_HIDDEN,
  barsize: LOADING_BAR.SIZE
})

const promptQuestions = [
  {
    type: 'input',
    message: `Enter your theme full name (${colors.yellow('e.g. Child Theme')}):`,
    name: 'fullName',
    validate: validateName
  },
  {
    type: 'input',
    message: `Enter theme registration name (${colors.yellow('one phrase, e.g. child-theme')}):`,
    name: 'name',
    validate: validateRegistrationName
  },
  {
    type: 'confirm',
    message: `Extend examplary Alpaca Component? (${colors.yellow('recommended')})`,
    name: 'exemplaryComponent'
  }
]

const init = () => {
  if (isMagentoInstance()) {
    console.clear()
    log(colors.blue('Snowdog Alpaca Theme CLI v1.0.0\n'))

    Inquirer.prompt(promptQuestions).then(async (answers) => {
      try {
        console.time(colors.blue('Finished in')) // Start time counter
        spinner.start()
        bar.start(100, 0, { info: infoColor('Validating composer...') })
        await validateComposer()

        bar.update(1, { info: infoColor('Downloading Alpaca Packages...') })
        /* ENABLE AFTER FEATURE-PERFORMANCE REALEASE */
        // await composerRequire(PACKAGE_PATH.ALPACA_PACKAGES)

        /* TEMP - DELETE AFTER FEATURE-PERFORMANCE REALEASE */
        await composerRequire(PACKAGE_PATH.THEME_FRONTEND_ALPACA_TEST)

        bar.update(16, { info: infoColor('Downloading Frontools...') })
        await composerRequire(PACKAGE_PATH.FRONTOOLS)

        bar.update(31, { info: infoColor('Installing Frontools...') })
        await installFrontools()

        bar.update(35, { info: infoColor('Creating directories...') })
        await Promise.all(directoriesList.map(async (dir) => {
          await createDirectory(`${BASE_PATH}${answers.name}${dir}`)
        }))

        templateFiles.forEach((file) => {
          bar.increment(0.5, { info: infoColor(`Creating ${file.name} file...`) })
          addTemplateFile(file, answers.name, answers.fullName)
        })

        if (answers.exemplaryComponent) {
          await createDirectory(`${BASE_PATH}${answers.name}/Snowdog_Components/components/Molecules/button/`)
          await createDirectory(`${BASE_PATH}${answers.name}/Snowdog_Components/components/styles/`)

          exemplaryComponent.forEach((file) => {
            bar.increment(0.5, { info: infoColor(`Creating ${file.name} file...`) })
            addTemplateFile(file, answers.name, answers.fullName)
          })
        }

        bar.update(40, { info: infoColor('Installing Snowdog Components...') })
        await installComponents(answers.name)

        bar.update(60, { info: infoColor('Upgrading Magneto instance...') })
        await magentoUpgrade()

        bar.update(87, { info: infoColor('Compiling files...') })
        await compileFiles()

        bar.update(100, { info: colors.blue('Enjoy Alpaca :)') })
        process.stdout.write(`\r${CHECK_MARK_CHARACTER}`)
        spinner.stop()
        bar.stop()
        console.timeEnd(colors.blue('Finished in')) // Stop time counter
        CLISuccesMessage(answers.fullName)
      } catch (error) {
        bar.update(0, { info: colors.red('Installation failed.') })
        spinner.stop()
        bar.stop()
        log(`\n${colors.red(error)}`)
        process.exit()
      }
    })
  } else {
    console.error(
      colors.red(NOT_MAGENTO_MSG_TOP),
      `\n${colors.yellow(NOT_MAGENTO_MSG_BOTTOM)}`
    )
  }
}

export default init
