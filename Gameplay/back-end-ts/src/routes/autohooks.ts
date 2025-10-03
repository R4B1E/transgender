import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import fp from 'fastify-plugin';
import Realtime from "../realtime-client/interface";

const AutoHook : FastifyPluginAsync = async function(fastify: FastifyInstance, options: any)
{
    const realtime = new Realtime();
    fastify.decorate('realtime', realtime);
}

export default fp(AutoHook);