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
* channels  - an instance of a RedisChannels.
*
* or
*
* channels[namespace] - more than RedisChannels instances for each namespace.
*
* RedisChannelsError - a channel error class
*
*
* For more details see https://github.com/hearit-io/redis-channels#readme.
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
  const namespace = opts.namespace
  if (typeof namespace !== 'undefined' &&
      typeof fastify.channels !== 'undefined' &&
      typeof fastify.channels[namespace] !== 'undefined') {
    return done(new Error('A channels instance for a namespace \'' +
      namespace + '\' has already been registered!'))
  }
  if (typeof namespace === 'undefined' &&
      typeof fastify.channels !== 'undefined') {
    return done(new Error('A channels instance has already been registered!'))
  }

  try {
    //
    // Append a channels instance and an error class.
    // ------------------------------------------------------------------------|
    if (typeof namespace !== 'undefined') {
      fastify.decorate('channels', {})
      fastify.channels[namespace] = new RedisChannels(opts)
    } else {
      fastify.decorate('channels', new RedisChannels(opts))
    }
    fastify.decorate('RedisChannelsError', RedisChannelsError)
  } catch (error) {
    return done(error)
  }

  //
  // Try to clean up connections and consumers 'onClose' automatically.
  // --------------------------------------------------------------------------|
  const cleanUpChannels = async (fastify, done) => {
    try {
      if (typeof namespace !== 'undefined') {
        for (const i in fastify.channels) {
          await fastify.channels[i].cleanup()
        }
      } else {
        await fastify.channels.cleanup()
      }
      done()
    } catch (error) {
      return done(error)
    }
  }

  fastify.addHook('onClose', cleanUpChannels)

  done()
}

module.exports = fp(fastifyRedisChannels, {
  fastify: '>=3.x',
  name: 'fastify-redis-channels'
})
