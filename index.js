const chalk = require('chalk')
const figlet = require('figlet')
const axios = require('axios')
const fs = require('fs')
const {program} = require('commander')
program.version('0.0.1')

program
  .requiredOption('--portainer-url <url>', 'Portainer instance URL')
  .requiredOption('--portainer-username <username>', 'Portainer username')
  .requiredOption('--portainer-password <password>', 'Portainer password')
  .requiredOption('--portainer-stack <stack_name>', 'Portainer stack name')
  .requiredOption('--stackfile <stack_file>', 'Portainer stack file')
  .option('-e, <env_vars...>', 'Environment variables')
  .parse(process.argv)

const options = program.opts()


let token = ''
let stackId = null
let fileData = null
let envobj = []

console.log(
  chalk.yellow(figlet.textSync('deportainer', {horizontalLayout: 'full'})),
)

function deploy() {
  if (options['e'].length > 0) {
    console.log(chalk.bgMagenta('Environment variable(s) found'))
    options['e'].map((param) => {
      const [name, value] = param.split('=')
      envobj.push({name, value})
      console.log({name, value})
    })
  } else {
    console.log('No environment variables')
  }

  console.log(chalk.blue('Getting auth token...'))
  const req = axios
    .post(`${options['portainerUrl']}/auth`, {
      Username: options['portainerUsername'],
      Password: options['portainerPassword'],
    })
    .then(
      ({data}) => {
        token = data.jwt
        axios.defaults.headers.common = {Authorization: `Bearer ${token}`}
        console.log(chalk.green('The token was saved'))
        try {
          console.log(chalk.magenta('Reading stack file...'))
          fileData = fs.readFileSync(options['stackfile'], 'utf8')
          console.log(chalk.magenta('File read successfully'))
        } catch (err) {
          console.error(err)
          process.exit(1)
        }

        console.log(chalk.blue('Getting target stack ID...'))
        const req = axios(
          `${options['portainerUrl']}/stacks`,
        ).then(
          ({data}) => {
            console.log(chalk.green('IDs fetched'))
            data.map((stack) => {
              if (stack['Name'] === options['portainerStack']) {
                stackId = stack['Id']
                endpointId = stack['EndpointId']

                // Update Stack
                console.log(chalk.magenta('Requesting stack update...'))
                axios
                  .put(
                    `${options['portainerUrl']}/stacks/${stackId}?endpointId=${endpointId}`,
                    {
                      StackFileContent: fileData,
                      Env: envobj,
                      Prune: false,
                    },
                  )
                  .then(
                    (response) => {
                      if (response.status === 200) {
                        console.log(chalk.green('Success'))
                      } else {
                        console.log(response.data)
                      }
                    },
                    (error) => {
                      console.log(chalk.red(error))
                      process.exit(1)
                    },
                  )
              }
            })

            if (!stackId) {
              console.log(
                chalk.red(
                  `Can't find the stack "${options['portainerStack']}" in Portainer`,
                ),
              )
              process.exit(1)
            }
          },
          (error) => {
            console.log(chalk.red(error))
            process.exit(1)
          },
        )
      },
      (error) => {
        console.log(chalk.red(error))
        process.exit(1)
      },
    )
}

deploy()
