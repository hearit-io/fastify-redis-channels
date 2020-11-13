// ============================================================================|
/*
* Project : HEARIT
*
* Developing an innovative connected/smart home intelligent
* management system for the needs of blind or visually impaired
* persons.
*
* Purpose:
*
* Fastify plugin for Redis pre-sharded channels implementation.
* It is based on @hearit-io/redis-channels.
*
* Decorators:
*
* It adds to your fastify instance following decorators:
*
* channels  - an instance of RedisChannels. For more details see
*            https://github.com/hearit-io/redis-channels#readme
*
* RedisChannelsError - a channel error class
*
* The plugin works with a single Redis instances or a cluster.
*
* Author: Emil Usunov <emil@hearit.io>
*
* License:
*
* MIT License
*
*/
// ============================================================================|
'use strict'

const fp = require('fastify-plugin')

const {
  RedisChannels,
  RedisChannelsError
} = require('@hearit-io/redis-channels')

//
// The plugin function
// ----------------------------------------------------------------------------|
function fastifyRedisChannels (fastify, opts, done) {
  if (typeof fastify.channels !== 'undefined') {
    return done(new Error('A channels instance has already been registered!'))
  }

  try {
    //
    // Append a channels instance and an error class.
    // ------------------------------------------------------------------------|
    fastify.decorate('channels', new RedisChannels(opts))
    fastify.decorate('RedisChannelsError', RedisChannelsError)
  } catch (error) {
    return done(error)
  }

  //
  // Clean up connections and consumers 'onClose' automatically.
  // --------------------------------------------------------------------------|
  const cleanUpChannels = async (fastify, done) => {
    try {
      await fastify.channels.cleanup()
      done()
    } catch (error) {
      done(error)
    }
  }
  fastify.addHook('onClose', cleanUpChannels)

  done()
}

module.exports = fp(fastifyRedisChannels, {
  fastify: '>=3.x',
  name: 'fastify-redis-channels'
})
