# adonis-apollo-server [WIP]

> GraphQL implementation using Apollo Server for Adonis

This package integrates Apollo GraphQL Server with the AdonisJS framework. It allows you to use Apollo server in your AdoinsJS app.

> **NOTE:** This package requires [@adonisjs/bodyparser](https://github.com/adonisjs/adonis-bodyparser) and [graphql](https://github.com/graphql/graphql-js)

## Installation

```bash
yarn add --exact @lukinco/adonis-apollo-server
```

### Registering provider

Make sure to register the provider inside `start/app.js` file.

```js
const providers = [
  '@lukinco/adonis-apollo-server/providers/ApolloServerProvider'
]
```

That's all!

## Usage

Now you can use the provider by pulling it from IoC container

```js
// start/routes.js

'use strict'

const Route = use('Route')
const ApolloServer = use('ApolloServer')

const typeDefs = `
  type Query {
    testString: String
  }
`

const resolvers = {
  Query: {
    testString () {
      return 'Seems to be working!'
    }
  }
}

const schema = { typeDefs, resolvers }

Route.post('/graphql', ({ auth, request, response }) => {
  return ApolloServer.graphql({ 
    options: {
      schema,
      context: { auth }
    },
    request, 
    response,
    onError: (errors) => {
      // this function is optional. "errors" is an array of all errors. 
      // You may show the errors the way you want to.
      // If this function is defined, you must return an array of errors.
    }
  })
})

Route.get('/graphiql', ({ request, response }) => {
  return ApolloServer.graphiql({
    options: { endpointURL: '/graphql' }, 
    request, 
    response
  })
})
```

## Uploads

To make uploads, you must set `autoProcess: false` on `config/bodyParser.js`.

You must define the field that will receive the uploaded file with scalar type `Upload`:

```gql
type Mutation {
  upload (file: Upload!): String
}
```

#### Usage

You may create a helper file in `app/Helpers/upload.js`:

```js
'use strict'

const fs = require('fs')
const { join } = require('path')
const slugify = require('slugify')
const { v4: uuidv4 } = require('uuid')
const Env = use('Env')

const UPLOAD_DIRNAME = 'uploads'
const FULL_UPLOAD_PATH = join(process.cwd(), 'public', UPLOAD_DIRNAME)

fs.mkdir(FULL_UPLOAD_PATH, { recursive: true }, () => {})

module.exports = async (file) => {
  const { createReadStream, filename } = await file
  const fileStream = createReadStream()
  const newFilename = `${uuidv4()}-${slugify(filename, { lower: true })}`

  const pathToUploadFile = join(FULL_UPLOAD_PATH, newFilename)
  const uploadDistStream = fs.createWriteStream(pathToUploadFile)

  await new Promise((resolve, reject) => {
    uploadDistStream.on('finish', resolve)

    uploadDistStream.on('error', (error) => {
      console.log('error', error)
      fs.unlink(pathToUploadFile, () => reject(error))
    })

    fileStream.on('error', (error) => uploadDistStream.destroy(error))

    fileStream.pipe(uploadDistStream)
  })

  return `${Env.get('UPLOAD_HOST')}/${UPLOAD_DIRNAME}/${newFilename}`
}
```

Libs `slugify` and  `uuid` are optional, but they will help you to create unique filenames.

You can use an env var `UPLOAD_HOST`, like my example, if you want to upload files in different places by environment.

Then, when you want to make an upload, you just have to use that function, passing the file received as argument, and the function will return a Promise, that resolves to a full path of the file uploaded.

To send a file, look the next examples.

#### How to test using Insomnia

On Insomnia, you must use Multipart requests, and send 3 fields:

- `operations`: a JSON with `query` and `variables` keys:
```json
{
  "query": "mutation ($file: Upload!) {\n  upload (file: $file) \n}",
  "variables": {
    "file": null
  }
}
```

- `map`: a JSON mapping the file that will be upload with your variables set in `operations`:
```json
{
  "0": ["variables.file"]
}
```

- `0`: the file itself. `0` is used here because we set in `map` above that `0` will point to our `variables.file` entry.

That's it :)

#### How to write tests

In Adonis v4, you have to install `axios` and `form-data` libraries to make the upload work on server side.

Then, you can use a helper to upload file like this:

```js
const fs = require('fs')
const gql = require('graphql-tag')
const { print } = require('graphql/language/printer')
const axios = require('axios')
const FormData = require('form-data')
const Env = use('Env')

async function requestQuery ({ client, token, query, variables, file }) {
  if (token) {
    response = response.header('Authorization', `Bearer ${token}`)
  }

  const operations = {
    query: print(query),
    variables,
  }

  file = typeof file === 'string'
    ? { field: 'file', attach: file }
    : file

  const variableInput = Object.keys(variables)[0] === file.field
    ? `${file.field}`
    : `${Object.keys(variables)[0]}.${file.field}`

  const map = {
    0: [`variables.${variableInput}`],
  }

  const form = new FormData()
  form.append('operations', JSON.stringify(operations))
  form.append('map', JSON.stringify(map))
  form.append('0', fs.createReadStream(file.attach))

  return axios
    .post(`${Env.get('APP_URL')}/graphql`, form, {
      headers: {
        authorization: `Bearer ${token}`,
        ...form.getHeaders(),
      },
    })
}
```

Then, just write your test:

```js
const fs = require('fs')
const { test, trait } = use('Test/Suite')('Upload')
const Helpers = use('Helpers')
const gql = require('graphql-tag')
const { expect } = require('chai')

trait('Test/ApiClient')
trait('Auth/Client')

const UPLOAD = gql`
  mutation ($file: Upload!) {
    upload (file: $file) {
      location
    }
  }
`

test('Should upload an image with mimetype PNG', async ({ client }) => {
  const file = Helpers.tmpPath('file.png')
  fs.writeFile(file, 'TEST', () => {})

  const response = await requestQuery({
    client,
    token, // use a token if you only want allow uploads for logged in users
    query: UPLOAD,
    variables: { file: null },
    file,
  })

  const result = response.data

  expect(response.status).to.be.equal(200)
  expect(result).to.have.keys('data')
  expect(result.data).to.have.keys(['upload'])
  expect(result.data.upload).to.be.a('string')
})
```

## License

MIT
