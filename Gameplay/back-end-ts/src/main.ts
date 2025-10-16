import { join } from 'node:path'
import Fastify from 'fastify'
import AutoLoad from '@fastify/autoload'
import fastifyEnvPlugin from './configs/config'
import PongServerPlugin from './game/server'

async function main() {

  const fastify = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all'
      }
    },
  })

  fastify.register(AutoLoad, {
    dir: join(__dirname, 'schemas'),
    indexPattern: /^loader$/i
  })

  await fastify.register(fastifyEnvPlugin)
  fastify.log.info('Config loaded %o', fastify.config)

  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins')
  })

  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    autoHooksPattern: /.*hooks$/i,
    autoHooks: true,
    cascadeHooks: true,
  })

  await fastify.register(PongServerPlugin);

  fastify.ready().then(() => {
    fastify.log.info('app ready .');
    fastify
      .listen({ host: '0.0.0.0', port: fastify.config.PORT || 3000 })
      .catch((err) => {
        fastify.log.error(err)
        process.exit(1)
      })
  })

  process.once('SIGINT', async function closeApplication() {
    const tenSeconds = 6000
    const timeout = setTimeout(function forceClose() {
      fastify.log.error('force closing server')
      process.exit(1)
    }, tenSeconds)
    timeout.unref()
    try {
      await fastify.close()
      fastify.log.info('bye bye')
    } catch (err) {
      fastify.log.error(err, 'the app had trouble turning off')
    }
  })
}

main();