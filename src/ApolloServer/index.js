'use strict'

const { HttpQueryError, runHttpQuery } = require('apollo-server-core')
const GraphiQL = require('apollo-server-module-graphiql')
const { print } = require('graphql')

class ApolloServer {
  graphql (options, request, response) {
    if (!options) {
      throw new Error('Apollo Server requires options.')
    }

    return runHttpQuery([request], {
      method: request.method(),
      options: options,
      query: request.method() === 'POST' ? toString(request.post()) : request.get()
    }).then(({ graphqlResponse }) => {
      return response.json(graphqlResponse)
    }, error => {
      if ('HttpQueryError' !== error.name) {
        throw error
      }

      if (error.headers) {
        Object.keys(error.headers).forEach(header => {
          response.header(header, error.headers[header])
        })
      }

      response.status(error.statusCode).send(error.message)
    })
  }

  graphiql (options, request, response) {
    if (!options) {
      throw new Error('Apollo Server GraphiQL requires options.')
    }

    const query = request.originalUrl()

    return GraphiQL.resolveGraphiQLString(query, options, request).then(graphiqlString => {
      response.header('Content-Type', 'text/html').send(graphiqlString)
    }, error => response.send(error))
  }
}

function toString (value) {
  if (Object.prototype.toString.call(value.query) === '[object String]') {
    return value
  }

  return {
    query: print(value.query)
  }
}

module.exports = ApolloServer
