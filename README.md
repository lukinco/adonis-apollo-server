# adonis-apollo-server [WIP]

GraphQL implementation using Apollo Server for Adonis

This package integrates Apollo GraphQL Server with the AdonisJS framework. It allows you to use Apollo server in your AdoinsJS app.

> **NOTE:** This package requires [@adonisjs/bodyparser](https://github.com/adonisjs/adonis-bodyparser) and [graphql](https://github.com/graphql/graphql-js)

## Installation

```bash
yarn add --exact @lukinco/adonis-apollo-server
```

> Don't forget to substitute `COMMIT_HASH` by a real commit hash :)

### Registering provider

Make sure to register the provider inside `start/app.js` file.

```js
const providers = [
  'adonis-apollo-server/providers/ApolloServerProvider'
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
const { makeExecutableSchema } = require('graphql-tools')

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

const schema = makeExecutableSchema({ typeDefs, resolvers })

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

> TODO

## License

MIT
