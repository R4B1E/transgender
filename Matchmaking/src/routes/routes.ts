import type { FastifyPluginAsync, RouteOptions } from "fastify";
import fastifyPlugin from "fastify-plugin";
import {SchemaParams as paramsInterface} from '../types/params'
import { gameWithRoom } from "../controllers/gameController";

const matchmakingRoutes : FastifyPluginAsync = fastifyPlugin(async (fastify , opts) => {
    fastify.route({
        method: 'GET',
        url: '/player/:id',
        schema: {
            params: fastify.getSchema('schema:params')
        },
        handler: async (request, reply) => {
            const {id} = request.params as paramsInterface;
            try {
                const Games = await fastify.game.get(null, id, false);
                return Games;
            } catch (error) {
                reply.status(404).send(`player ${id} not found`);
            }
        }
    } as RouteOptions)
    fastify.route({
        method: 'GET',
        url: '/game/:id',
        schema: {
            params: fastify.getSchema('schema:params')
        },
        handler: async (request, reply) => {
            const {id} = request.params as paramsInterface;
            try {
                const game = (await fastify.game.get(id, null, true))[0] as gameWithRoom;
                const rooms = game.rooms;
                return rooms;
            }
            catch (error){
                reply.status(404).send(`game ${id} not found`);
            }
        }
    }as RouteOptions)
})

export default matchmakingRoutes;