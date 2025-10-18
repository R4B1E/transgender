import { FastifyInstance } from "fastify";
import type Realtime from "../realtime-client/interface";

declare module 'fastify' {
  interface FastifyInstance {
    config: { // this should be the same as the confKey in options
      // specify your typing here
      PORT: number,
      NODE_ENV: string,
      REALTIME_PORT: number
    };
  }
}