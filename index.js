const chalk = require('chalk')
const figlet = require('figlet')
const axios = require('axios')
const fs = require('fs')
const argv = require('minimist')(process.argv.slice(2));


let token = ''
let portainer_stack = ''
let stackId = null
let fileData = null
let envobj = []

axios.defaults.headers.common = {Authorization: `Bearer ${token}`}

clear()
console.log(
  chalk.yellow(figlet.textSync('deportainer', {horizontalLayout: 'full'})),
)

function deploy() {
  if (argv?.['e']?.length > 0) {
    console.log(chalk.bgMagenta('Environment variable(s) found'))
    argv['e'].map(param => {
      const [name, value] = param.split('=');
      envobj.push({name, value})
      console.log({name, value})
    })
  } else {
    console.log('No environment variables')
  }

  console.log(chalk.blue('Getting auth token...'))
  const req = axios
    .post('https://portainer.ops.sugiereme.xyz/api/auth', {
      Username: 'admin',
      Password: 'Terra_ll_1',
    })
    .then(
      ({data}) => {
        token = data.jwt
        console.log(chalk.green('The token was saved'))
        try {
          console.log(chalk.magenta('Reading stack file...'))
          fileData = fs.readFileSync('./stack.yml', 'utf8')
          console.log(chalk.magenta('File read successfully'))
        } catch (err) {
          console.error(err)
          process.exit(1)
        }

        console.log(chalk.blue('Getting target stack ID...'))
        const req = axios(
          'https://portainer.ops.sugiereme.xyz/api/stacks',
        ).then(
          ({data}) => {
            console.log(chalk.green('IDs fetched'))
            data.map((stack) => {
              if (stack['Name'] === portainer_stack) {
                stackId = stack['Id']
                endpointId = stack['EndpointId']

                // Update Stack
                console.log(chalk.magenta('Requesting stack update...'))
                axios
                  .put(
                    `https://portainer.ops.sugiereme.xyz/api/stacks/${stackId}?endpointId=${endpointId}`,
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
                  `Can't find the stack "${portainer_stack}" in Portainer`,
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
