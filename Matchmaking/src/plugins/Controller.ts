import fp from 'fastify-plugin'
import gameController from '../controllers/gameController'
import roomController from '../controllers/roomController'
import playerController from '../controllers/playerController'

const ControllerPlugin = fp(async function(fastify, opts) {
    const gameService = await gameController(fastify.prisma);
    const roomService = await roomController(fastify.prisma);
    const playerService = await playerController(fastify.prisma);
    fastify.decorate('game', gameService),
    fastify.decorate('room', roomService);
    fastify.decorate('player', playerService);
})

export default ControllerPlugin