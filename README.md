# adonis-apollo-server [WIP]

GraphQL implementation using Apollo Server for Adonis

This package integrates Apollo GraphQL Server with the AdonisJS framework. It allows you to use Apollo server in your AdoinsJS app.

> **NOTE:** This package requires [@adonisjs/bodyparser](https://github.com/adonisjs/adonis-bodyparser) and [graphql](https://github.com/graphql/graphql-js)

## Installation

```bash
yarn add lukinco/adonis-apollo-server#COMMIT_HASH
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

Route.post('/graphql', ({ request, response }) => {
    return ApolloServer.graphql({ schema }, request, response)
})

Route.get('/graphiql', ({ request, response }) => {
    return ApolloServer.graphiql({ endpointURL: '/graphql' }, request, response)
})
```
