'use strict'

const { ServiceProvider } = require('@adonisjs/fold')
const ApolloServer = require('../src/ApolloServer')

class ApolloServerProvider extends ServiceProvider {
  /**
   * Register AdonisApollo to the IoC container
   * with `Adonis/Addons/ApolloServer` namespace.
   *
   * @method register
   *
   * @return {void}
   */
  register () {
    this.app.singleton('Adonis/Addons/ApolloServer', () => {
      return new (ApolloServer)()
    })

    this.app.alias('Adonis/Addons/ApolloServer', 'ApolloServer')
  }
}

module.exports = ApolloServerProvider
