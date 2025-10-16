import fp from "fastify-plugin"

const ErrorHandlerPlugin = fp(function (fastify, opts, next) {
    fastify.setErrorHandler((err, req, reply) => {
        if (reply.statusCode >= 500) {
            req.log.error({ req, res: reply, err: err },
                err?.message)
            reply.send(`Fatal error. Contact the support team. Id ${req.id}`)
            return
        }
        req.log.info({ req, res: reply, err: err },
            err?.message)
        reply.send(err)
    })
    next()
})

export default ErrorHandlerPlugin