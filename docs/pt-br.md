# adonis-apollo-server

<p align="center">
  :us: <a href="/README.md">English</a>&nbsp;&nbsp;|&nbsp;&nbsp;:brazil: <a href="/docs/pt-br.md">Português do Brasil</a>
</p>

<p align="center"><img src="/design/logo-primary.png" /></p>

> Implementação do GraphQL usando Apollo Server para Adonis

Este pacote integra o Apollo GraphQL Server com o framework AdonisJS. Ele permite que você use o Apollo Server em sua aplicação AdonisJS.

> **NOTA:** Este pacote requer [@adonisjs/bodyparser](https://github.com/adonisjs/adonis-bodyparser) e [graphql](https://github.com/graphql/graphql-js)

## Instalação

```bash
yarn add --exact @lukinco/adonis-apollo-server
```

### Registrando provider

Tenha certeza de registrar o provider no arquivo `start/app.js`.

```js
const providers = [
  '@lukinco/adonis-apollo-server/providers/ApolloServerProvider'
];
```

Isso é tudo!

## Uso

Agora você pode usar o provider pegando ele do container IoC

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
      // Esta função é opcional. "errors" é um array de todos os erros.
      // Você pode mostrar os erros da maneira que quiser.
      // Se esta função for definida, você precisa retornar um array de erros.
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

Para fazer uploads, você precisa configurar `autoProcess: false` em `config/bodyParser.js`.

Você precisa definir o campo que vai receber o arquivo do upload com o tipo escalar `Upload`:

```gql
type Mutation {
  upload (file: Upload!): String
}
```

#### Uso

Você pode criar um arquivo 'helper' em `app/Helpers/upload.js`:

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

As bibliotecas `slugify` e `uuid` são opcionais, mas elas vão ajudar você a criar nomes únicos de arquivos.

Você pode usar uma variável env `UPLOAD_HOST`, como no exemplo, se você quer fazer upload de arquivos em diferentes ambientes.

Então, quando você quiser fazer um upload, você só tem que usar esta função, passando o arquivo recebido como argumento, e a função vai retornar uma Promise, que resolve o caminho completo do arquivo carregado.

Para enviar um arquivo, dê uma olhada nos próximos exemplos.

### Como testar usando Insomnia

No Insomnia, você precisa usar requisições Multipart, e enviar 3 campos:

- `operations`: um JSON com chaves `query` e `variables`:

```json
{
  "query": "mutation ($file: Upload!) {\n  upload (file: $file) \n}",
  "variables": {
    "file": null
  }
}
```

- `map`: um JSON mapeando o arquivo que vai ser carregado com suas variáveis configuradas em `operations`:


```json
{
  "0": ["variables.file"]
}
```

- `0`: o arquivo em si. `0` é usado aqui porque nós configuramos no `map` acima que `0` vai apontar para nossa entrada `variables.file`.

É isso :)

#### Como escrever testes

No Adonis v4, você precisa instalar as bibliotecas `axios` e `form-data` para fazer o upload funcionar no lado do servidor.

Então, você pode usar um helper para upload, como este:

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

Então, simplesmente escreva seu teste:

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
    token, // use um token se você quer permitir uploads somente para usuários autenticados
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

## Licença

MIT
