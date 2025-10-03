import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fp from 'fastify-plugin'

const WebSocketPlugin : FastifyPluginAsync = async(fastify : FastifyInstance, options : any) =>
{
    fastify.register(fastifyWebsocket, {
          errorHandler: function (error, socket, req, reply) {
              fastify.log.error(`erroHandler function called, reason : ${error.message}`);
              socket.terminate()
          },
          options: {
              maxPayload: 1048576,
              // JWT verification can go here
              // verifyClient: function (info, next) {
              //     if (info.req.headers['x-fastify-header'] !== 'fastify is awesome !') {
              //         return next(false) // the connection is not allowed
              //     }
              //     next(true) // the connection is allowed
              // }
          },
          preClose: (done) => { // Note: can also use async style, without done-callback
              const server = fastify.websocketServer
  
              for (const socket of server.clients) {
                  socket.close(1001, 'WS server is going offline in custom manner, sending a code + message')
              }
  
              server.close(done)
  
              server.on('close', () => {
                  fastify.log.info('connection closed');
              })
          }
    })
    fastify.log.info('Websocket plugin loaded .');
}

export default fp(WebSocketPlugin)