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
* Validates fastify-redis-channels plugin
*
* Author: hearit.io
*
* License:
*
* MIT License
*
*/
// ============================================================================|
const tap = require('tap')
const Fastify = require('fastify')
const fastifyRedisChannelsPlugin = require('../index')

// ----------------------------------------------------------------------------|
tap.test('Both fastify.channels and fastify.RedisChannelsError should exist',
  t => {
    t.plan(3)
    register(t, { channels: { application: 'test' } }, function (err, fastify) {
      t.same(err, null)
      t.ok(fastify.channels)
      t.ok(fastify.RedisChannelsError)
    })
  })

// ----------------------------------------------------------------------------|
tap.test('Simulate an error on fastify.channels.cleanup()', t => {
  t.plan(3)
  register(t, {
    channels: { application: 'test', redis: { maxRetriesPerRequest: 0 } }
  }, function (err, fastify) {
    fastify.channels._consumers.dummy = { keys: 'dummy', consumer: 'dummy' }
    t.same(err, null)
    t.ok(fastify.channels)
    t.ok(fastify.RedisChannelsError)
  })
})

// ----------------------------------------------------------------------------|
tap.test('Register a plugin twice (no namespace)', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(() => fastify.close())
  fastify
    .register(fastifyRedisChannelsPlugin, { channels: { application: 'test' } })
    .register(fastifyRedisChannelsPlugin, { channels: { application: 'test' } })
    .ready(err => {
      t.ok(err)
      t.equal(err.message, 'A channels instance has already been registered!')
    })
})

// ----------------------------------------------------------------------------|
tap.test('Register a plugin twice (same namespace)', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(() => fastify.close())
  fastify
    .register(fastifyRedisChannelsPlugin, {
      channels: { application: 'test' },
      namespace: 'test'
    })
    .register(fastifyRedisChannelsPlugin, {
      channels: { application: 'test' },
      namespace: 'test'
    })
    .ready(err => {
      t.ok(err)
      t.equal(err.message, 'A channels instance for a namespace \'test\' has already been registered!')
    })
})

// ----------------------------------------------------------------------------|
tap.test('Register a plugin twice (two diferent namespaces)', t => {
  t.plan(1)
  const fastify = Fastify()
  t.teardown(() => fastify.close())
  fastify
    .register(fastifyRedisChannelsPlugin, {
      channels: { application: 'test' },
      namespace: 'test1'
    })
    .register(fastifyRedisChannelsPlugin, {
      channels: { application: 'test' },
      namespace: 'test2'
    })
  t.pass('Plugin registred with two diferent name spaces')
})

// ----------------------------------------------------------------------------|
tap.test('Register a plugin with a wrong option value', t => {
  t.plan(2)
  const fastify = Fastify()
  t.teardown(() => {
    fastify.close()
    process.exit(0)
  })
  fastify
    .register(fastifyRedisChannelsPlugin, { channels: { slots: 777 } })
    .ready(err => {
      t.match(err.message, 'Invalid shards')
      t.ok(err)
    })
})

// ----------------------------------------------------------------------------|
function register (t, options, callback) {
  const fastify = Fastify()
  t.teardown(() => fastify.close().catch(() => {}))
  fastify.register(fastifyRedisChannelsPlugin, options)
    .ready(err => callback(err, fastify))
}
