import fp from 'fastify-plugin'
import gameController from '../controllers/gameController'
import roomController from '../controllers/roomController'

const ControllerPlugin = fp(async function(fastify, opts) {
    const gameService = await gameController(fastify.prisma);
    const roomService = await roomController(fastify.prisma);
    fastify.decorate('game', gameService),
    fastify.decorate('room', roomService);
})

export default ControllerPlugin