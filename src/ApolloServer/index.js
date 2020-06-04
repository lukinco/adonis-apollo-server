'use strict'

const { HttpQueryError, runHttpQuery } = require('apollo-server-core')
const GraphiQL = require('apollo-server-module-graphiql')
const { print } = require('graphql')

class ApolloServer {
  graphql ({ options, request, response, onError }) {
    if (!options) {
      throw new Error('Apollo Server requires options.')
    }

    return runHttpQuery([request], {
      method: request.method(),
      options: options,
      query: request.method() === 'POST' ? toString(request.post()) : request.get()
    }).then(({ graphqlResponse }) => {
      const parsedResponse = JSON.parse(graphqlResponse)
      if (!parsedResponse.errors) {
        return response.json(graphqlResponse)
      }

      const transformedError = onError ? onError(parsedResponse.errors) : parsedResponse.errors
      return response.json({
        errors: transformedError,
        data: parsedResponse.data
      })
    }, error => {
      if ('HttpQueryError' !== error.name) {
        throw error
      }

      if (error.headers) {
        Object.keys(error.headers).forEach(header => {
          response.header(header, error.headers[header])
        })
      }

      const errorParsed = JSON.parse(error.message).errors
      const transformedError = onError ? onError(errorParsed) : errorParsed

      response.status(error.statusCode).send({
        errors: transformedError
      })
    })
  }

  graphiql ({ options, request, response }) {
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
