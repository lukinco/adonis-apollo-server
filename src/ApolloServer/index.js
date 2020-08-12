'use strict'

const { HttpQueryError, runHttpQuery } = require('apollo-server-core')
const GraphiQL = require('apollo-server-module-graphiql')
const { print } = require('graphql')
const { processRequest, GraphQLUpload } = require('graphql-upload')
const { makeExecutableSchema } = require('graphql-tools')

class ApolloServer {
  getQuery (request, response) {
    if (request.is('multipart/form-data')) {
      return processRequest(request.request, response.response)
    }

    return request.method() === 'POST' ? toString(request.post()) : request.get()
  }

  async graphql ({ options, request, response, onError }) {
    if (!options) {
      throw new Error('Apollo Server requires options.')
    }

    const schemaWithUpload = {
      typeDefs: `${options.schema.typeDefs}\nscalar Upload`,
      resolvers: {
        ...options.schema.resolvers,
        Upload: GraphQLUpload,
      },
    }

    options.schema = makeExecutableSchema(schemaWithUpload)

    const query = await this.getQuery(request, response)

    return runHttpQuery([request], {
      method: request.method(),
      options: options,
      query: query,
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
