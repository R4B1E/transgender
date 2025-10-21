import { join } from 'node:path'
import Fastify from 'fastify'
import AutoLoad from '@fastify/autoload'
// use import in ts files

async function main() {

  const fastify = Fastify({
    logger: true,
    ajv: {
      customOptions: {
        removeAdditional: 'all'
      }
    },
  })

  await fastify.register(require('./loader'));

  await fastify.register(require('./configs/config'))
  fastify.log.info('Config loaded %o', fastify.config)

  await fastify.register(require('./plugins/prisma-data-source'))

  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    ignorePattern: /prisma-data-source\.(ts|js)$/i,
  })

  fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes')
  })

  fastify.register(AutoLoad, {
    dir: join(__dirname, 'matchmaking')
  })

  fastify.ready().then(() => {
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