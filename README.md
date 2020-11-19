# fastify-redis-channels

[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](code_of_conduct.md)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)
![NPM License](https://img.shields.io/npm/l/fastify-redis-channels)
![NPM Downloads](https://img.shields.io/npm/dt/fastify-redis-channels)


A Fastify plugin for fast, reliable, and scalable channels implementation based on Redis streams.

Suitable for IoT applications with a massive network traffic, pub/sub use cases or any implementation with multiple producers/consumers.

Can be used with a single Redis instance and later updated easily to a cluster configuration without need of any application change.

The implementation uses native Promises.

Do you want your project to grow? Then start right from the begging.


Under the hood [@hearit-io/redis-channels](https://github.com/hearit-io/redis-channels#readme) is used, the options you pass to a register will be passed to the RedisChannels instance.


## Table of Contents

* [Install](#install)
* [Usage](#usage)
* [Learn by doing](#learn-by-doing)
  * [Chat server](#chat-server)
* [Project status](#project-status)
* [Todo](#todo)
* [Authors and acknowledgment](#authors-and-acknowledgment)
* [License](#license)


## Install

```shell
$ npm install fastify-redis-channels --save
```

## Usage

Add it to your project with register and that's it! 

You can access the RedisChannels instance via `fastify.channels`. A RedisChannelsError object is accessible via `fastify.RedisChannelsError`.  

All channels are automatically closed when a fastify instance is closed.

## Learn by doing 

### Chat server

We will create a basic chat server based on websockets in this example.

#### Step 1 - Install all required packages

Create an empty folder for your application and initialise it:

```shell
mkdir chat
cd chat
npm init
```

Install all required packages:

```shell
npm install --save fastify fastify-websocket fastify-redis-channels
```

#### Step 2 - Create a chat room page

This step implements a chat room page where a user can send/receive messages to/from other users. 

It automatically creates a chat room for everything in the root path of the URL.

For example, visiting `http://localhost/room1` and `http://localhost/room2` will create chat rooms `room1` and `room2`.

Create a `room.js` file with a following content:

```javascript
'use strict'

function fastifyPluginRoom (fastify, opts, done) {

  // Route to the room
  fastify.get('/:room', (request, replay) => {
    replay.type('text/html').send(view(request.params.room))
  })

  done()
}

// Builds a page view with a text area, input field and a submit button.
function view (room) {
  const page = `

  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <title>Chat room '${room}'</title>
  </head>
  <body>
    <textarea id="log" cols="100" rows="20" readonly></textarea><br>
    <input id="input" type="text" size="100"><br>
    <input id="submit" type="button" value="Send"> to room '${room}'
    
    <script>
      const ws = new WebSocket(
        'ws://' + window.location.host + '/ws/' + '${room}'
      )

      ws.onmessage = function(e) {
        const data = JSON.parse(e.data)
        document.querySelector('#log').value += (data.message + '\\n')
      }

      ws.onclose = function(e) {
        console.error('socket closed')
      }

      document.querySelector('#input').focus()
      document.querySelector('#input').onkeyup = function(e) {
        if (e.keyCode === 13) {
          document.querySelector('#submit').click()
        }
      }

      document.querySelector('#submit').onclick = function(e) {
        const inputElem = document.querySelector('#input')
        ws.send(JSON.stringify({ 'message': inputElem.value }))
        inputElem.value = ''
      }
    </script>
  </body>
  </html>
  `
  return page
}

module.exports = fastifyPluginRoom

```

#### Step 3 - Create a Fastify server

In this step we implement a simple Fastify server listening on port 3000.

Create a file `server.js` as shown bellow: 

```javascript
'use strict'

const fastify = require('fastify')()

fastify.register(require('./room'))

fastify.ready(error => {
  if (error) console.log(error)
})

fastify.listen({ port: 3000 }, (error, address) => {
  if (error) console.log(error)
  console.log('Listen on : ', address)
})
```

Run the server with the command:

```
npm start
```

You will get on the console the following output:

```
Listen on :  http://[::]:3000
```

You should see your chat `room` on [http://localhost:3000/room]([http://localhost:3000/room)


#### Step 4 - Create a consumer using channels

In this step we will create a consumer which broadcasts all messages received via websockets to all clients in the corresponding chat rooms.


Create a file `consumer.js` as shown below: 

```javascript
'use strict'

function fastifyConsumerPlugin(fastify, opts, done) {
  try {

    fastify.get('/ws/:room', { websocket: true }, handler)

    done()
  } catch(error) {
    done(error)
  }
}


// A websocket handle function (called once after a handshake)
async function handler(connection, req, params) {
  const fastify = this

  try {
    // Creates a tunnel object to access a channel associated with the room.
    const tunnel = await fastify.channels.use(params.room)

    // Subscribes for messages.
    await fastify.channels.subscribe(tunnel)

    // Starts a consumer.
    consume(fastify, connection, tunnel)
      .then((resolve) => {
        console.log('Consumer finished')
      })
      .catch((reject) => {
        connection.socket.close()
        return
      })

    // Produces received from a websocket messages to the corresponding tunnel.
    connection.socket.on('message', async (message) => {
      try {
        connection.resume()
        await fastify.channels.produce(tunnel, message)
      } catch (error) {
        connection.socket.close()
        return
      }
    })

    // Unsubscribe on websocket close
    connection.socket.on('close', async () => {
      await fastify.channels.unsubscribe(tunnel)
    })
  }
  catch(error) {
    connection.socket.close()
  }
}

// A consumer implementation
// Consumes messages from the tunnel and broadcast them to the websocket.
async function consume(fastify, connection, tunnel) {
  for await (const messages of fastify.channels.consume(tunnel)) {
    for (const i in messages) {
      connection.socket.send(messages[i].data)
    }
  }
}

module.exports = fastifyConsumerPlugin
```

Register all plugins in the fastify server. The file `server.js` should look like this:

```javascript
'use strict'

const fastify = require('fastify')()

fastify.register(require('fastify-websocket'))
fastify.after(error => {
   if (error) console.log(error)
})

fastify.register(require('fastify-redis-channels'), {
  channels: {
    application: 'example',
  },
  redis: {
    host: 'localhost',
    port: 6379
  }
})
fastify.after(error => {
   if (error) console.log(error)
})

fastify.register(require('./consumer'))
fastify.after(error => {
   if (error) console.log(error)
})

fastify.register(require('./room'))
fastify.ready(error => {
  if (error) console.log(error)
})

fastify.listen({ port: 3000 }, (error, address) => {
  if (error) console.log(error)
  console.log('Listen on : ', address)
})
```

#### Step 5 - Test your chat application

Before you test your chat, room application make sure you have up and running Redis server on the default host `localhost` and port `6379`. For more info about the installation see on Redis [download](https://redis.io/download) page.


Run the server with the command:

```shell
npm start
```

You will get on the console the following output:

```
Listen on :  http://[::]:3000
```

Open in two browser window a link to our example chat `room` [http://localhost:3000/room]([http://localhost:3000/room).

Have a fun with your chat! :)

The complete example is available here [fastify-redis-channels-chat-example](https://github.com/hearit-io/fastify-redis-channels-chat-example)


## Project status

### [hearit.io](https://hearit.io)


<img src="https://raw.githubusercontent.com/hearit-io/graphics/main/hearing-black-96dp.svg" width="48" height="48"/> | Smart home automatization designed for visually impaired people.
------------ | -------------

**fastify-redis-channels** is used productive in our web [app](https://hearit.io/demo). The package will be updated and maintained in a regular base. 

The main goals of [hearit.io](https://hearit.io) is to make accessible the world of IoT to everyone. 

No technological, design or speed compromises, we just do it. 
 
We will be grateful to you if you make awareness to other people of our project.

Other useful packages, part of our project, will be available soon. 

We use [Fastify](http://fastify.io) as an application framework. Thanks for the great job!


## Todo
- [x] Add plugin unit tests.
- [ ] TypeScript support.



## Authors and acknowledgment

[hearit.io](https://hearit.io)

## License

MIT
