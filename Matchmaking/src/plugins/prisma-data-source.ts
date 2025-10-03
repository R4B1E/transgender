import fp from 'fastify-plugin'
import { PrismaClient } from '../../generated/prisma/client'
import type { FastifyPluginAsync } from 'fastify';

const PrismaPlugin: FastifyPluginAsync = async (fastify, opts) => {
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    fastify.log?.info('Prisma connected');
  } catch (err) {
    fastify.log?.error('Prisma connection error', err as undefined);
    throw err;
  }

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async () => {
    try {
      await prisma.$disconnect();
      fastify.log?.info('Prisma disconnected');
    } catch (err) {
      fastify.log?.error('Error disconnecting Prisma', err as undefined);
    }
  });
};

export default fp(PrismaPlugin, { name: 'prisma-plugin' });