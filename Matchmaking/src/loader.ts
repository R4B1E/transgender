import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify';
// import from './schemas/params.json'

const PluginEnv : FastifyPluginAsync = fp(async function (fastify, opts) {
  fastify.addSchema(require('./schemas/params.json'));
  fastify.addSchema(require('./schemas/dotenv.json'));
})

export default PluginEnv