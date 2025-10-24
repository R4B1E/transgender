import { type FastifyInstance, type FastifyPluginAsync } from "fastify"
import Realtime from "../Realtime/app"
import { Prisma } from "../../generated/prisma"

type Games = Map< string, Map<string, gameObject> >; // 1v1 => (gameId => gameObject)

interface matchObject{
    createdAt: number,
    id: string,
    round: number,
    slotA: string,
    slotB: string,
    winner: string
    duration?: number
}

interface gameObject{
    players : Set<string>,
    rounds: Map<number, matchObject[]>,
    currentRound: number,
    status?: "PENDING" | "ON"
}

async function matchResultHandler(games: Games, fastify: FastifyInstance, realtime: ReturnType<typeof Realtime>, msg: any){
    const { gameId , matchId, winnerId, mode} = msg;
    console.log(`received ${JSON.stringify(msg)}`);
    const g = games.get(mode)?.get(gameId);
    if (!g) {
        fastify.log.warn(`Received result for unknown game ${gameId}`);
        return;
    }

    const currentMatches : matchObject[] = g.rounds.get(g.currentRound) || [];
    const match = currentMatches.find(m => m.id === matchId);
    if (!match){
        fastify.log.warn(`Result for unknown match ${matchId} in round ${g.currentRound}`);
        return;
    }

    if (match.winner){
        fastify.log.warn(`Duplicate result for match ${matchId}, ignoring`);
        return;
    }

    const winner = (match.slotA === winnerId) ? match.slotA : match.slotB;
    match.winner = winner;
    const duration = Date.now() - match.createdAt;
    await fastify.room.update(matchId, {duration, gameWinner: match.winner});

    const roundDone = currentMatches.every(m => m.winner.length > 0);
    if (roundDone) {
        const winners = currentMatches.map(m => m.winner);
        if (winners.length === 1){
            const champion = winners[0];
            realtime.publish(`${gameId}-game:complete`, {champion}, true);
            fastify.log.info(`published to room ${gameId}-game:complete`);
            await fastify.game.update(gameId, {gameWinner: champion});
            fastify.log.info(`Game ${gameId} complete! winner: ${champion}`);
            games.get(mode)?.delete(gameId);
            return;
        }

        const nextRoundNum = g.currentRound + 1;
        const nextMatches : matchObject[] = makeNextRound(currentMatches, nextRoundNum);
        realtime.publish(`${matchId}-nextRound`, {matches: nextMatches}, true);
        g.rounds.set(nextRoundNum, nextMatches);
        g.currentRound = nextRoundNum;

        for (const m of nextMatches){
            const payload = {
                gameId,
                matchId: m.id,
                round: m.round,
                players: [m.slotA, m.slotB] ,
                createdAt: Date.now() 
            }
            const players = [m.slotA, m.slotB].map(p => ({id : p})) as Prisma.PlayerCreateManyInput[];
            await fastify.room.create({matchId: m.id, gameId, players, round: m.round});
            realtime.publish(`${m.slotA}-matchmaking`, payload, true);
            realtime.publish(`${m.slotB}-matchmaking`, payload, true);
            realtime.subscribe(`${m.id}-match:result`, (msg) => matchResultHandler(games, fastify, realtime, msg))
            fastify.log.info(`Published match assign ${m.id} for game ${gameId}`);
        }
    }
}

// advance matches: given completed winners produce next round matches
function makeNextRound(matches : matchObject[], round : number) : matchObject[] {
  // matches: array of completed match objects with winner set
  const winners = matches.map(m => m.winner);
  const next : matchObject[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    next.push({
        createdAt: Date.now(),
        id: genId('match'),
        round,
        slotA: winners[i],
        slotB: winners[i+1],
        winner: '',
    });
  }
  return next;
}

function genId(prefix='id') : string{
  return `${prefix}_${Math.random().toString(36).slice(2,9)}`;
}

// bracket helper: produce list of matches for a list of players (1v1)
function seedBracket(players : Array<string>, fastify: FastifyInstance, gameId: number) : matchObject[]{
  // simple seeding: random shuffle then pair [0 vs 1], [2 vs 3], ...
  const shuffled = players.slice().sort(() => Math.random() - 0.5);
  const matches : Array<matchObject> = new Array();
  for (let i = 0; i < shuffled.length; i += 2) {
    // Maybe i need to add room entry to the database after the game finishes ??                                            
    matches.push({
        createdAt: Date.now(),
        id: genId('match'),
        round: 1,
        slotA: shuffled[i],
        slotB: shuffled[i+1],
        winner: ''
    });
  }
  return matches; // quarterfinal matches
}

// TO.DO: add map where the key is the player and its value is all the matches he's participating in

// TO.DO : the players map might have Player prisma object as its value
const Matchmaking: FastifyPluginAsync = async function (fastify: FastifyInstance, opts) {
    const realtime = Realtime('ws://realtime:' + fastify.config.REALTIME_PORT.toString(), { reconnect: true });
    let games : Map< string, Map<string, gameObject> > = new Map([["tournament", new Map()], ["1v1", new Map()]]);

    let defaultGames : Map<string, string> = new Map();

    realtime.onConnection((ev) => {
        realtime.subscribe('game:join', async (message) => {
            let { gameId = 'default', playerId , gameMode } = message;
            const gameSize = gameMode === "tournament" ? 4 : 2;

            realtime.subscribe(`${playerId}-disconnect`, async (msg) => {
                    // gameId = defaultGames.get(gameMode);
                    const g = games.get(gameMode)?.get(gameId);
                    if (g?.players.has(playerId) && g?.status === "PENDING"){
                        g?.players.delete(playerId);
                    }
                    if (g?.players.size === 0)
                    {
                        games.get(gameMode)?.delete(gameId);
                    }
                    if (defaultGames.get(gameMode) === gameId)
                        defaultGames.delete(gameMode)
            })

            if (!games.get(gameMode)?.has(gameId))
            {
                if (!defaultGames.get(gameMode))
                {
                    console.log('generating a new game')
                    gameId = genId('game');
                    defaultGames.set(gameMode, gameId);
                    games.get(gameMode)?.set(gameId, {players: new Set(), rounds: new Map(), currentRound: 0, status: "PENDING"});
                }

                else
                    gameId = defaultGames.get(gameMode);
            }
            
            const g = games.get(gameMode)?.get(gameId);

            g?.players.add(playerId);
            fastify.log.info(`Added player ${playerId} to ${gameId}`);
            fastify.log.info(`array of players : ${g?.players.values().toArray()}`)

            if (g?.players.size === gameSize){
                g.status = "ON";
                // add the game to the database
                fastify.log.info(`room full`);
                const qfMatches : matchObject[] = seedBracket(g.players.values().toArray(), fastify, gameId); // round 1
                await fastify.game.create(gameId, {mode: gameMode});
                g.rounds.set(1, qfMatches);
                g.currentRound = 1;
                realtime.publish(`${gameId}-nextRound`, {matches: qfMatches}, true);

                for (const m of qfMatches){
                    const payload = {
                        gameId,
                        matchId: m.id,
                        round: m.round,
                        players: [m.slotA, m.slotB],
                        createdAt: Date.now()
                    }
                    const players = [m.slotA, m.slotB].map(p => ({id : p})) as Prisma.PlayerCreateInput[];
                    await fastify.room.create({matchId: m.id, gameId, players, round: m.round});
                    realtime.publish(`${m.slotA}-matchmaking`, payload, true);
                    realtime.publish(`${m.slotB}-matchmaking`, payload, true);
                    realtime.subscribe(`${m.id}-match:result`, (msg) => matchResultHandler(games, fastify, realtime, msg))
                    fastify.log.info(`Published match assign ${m.id} for game ${gameId}`);
                }

                if (defaultGames.get(gameMode) === gameId)
                    defaultGames.delete(gameMode);
            }
        })
        // realtime.subscribe('match:result', async (msg) => {
        //     const { gameId , matchId, winnerId, mode} = msg;
        //     const g = games.get(mode)?.get(gameId);
        //     if (!g) {
        //         fastify.log.warn(`Received result for unknown game ${gameId}`);
        //         return;
        //     }

        //     const currentMatches : matchObject[] = g.rounds.get(g.currentRound) || [];
        //     const match = currentMatches.find(m => m.id === matchId);
        //     if (!match){
        //         fastify.log.warn(`Result for unknown match ${matchId} in round ${g.currentRound}`);
        //         return;
        //     }

        //     if (match.winner){
        //         fastify.log.warn(`Duplicate result for match ${matchId}, ignoring`);
        //         return;
        //     }

        //     const winner = (match.slotA === winnerId) ? match.slotA : match.slotB;
        //     match.winner = winner;
        //     const duration = Date.now() - match.createdAt;
        //     await fastify.room.update(matchId, {duration, gameWinner: match.winner});

        //     const roundDone = currentMatches.every(m => m.winner.length > 0);
        //     if (roundDone) {
        //         const winners = currentMatches.map(m => m.winner);
        //         if (winners.length === 1){
        //             const champion = winners[0];
        //             realtime.publish(`${gameId}-game:complete`, {champion}, true);
        //             fastify.log.info(`published to room ${gameId}-game:complete`);
        //             await fastify.game.update(gameId, {gameWinner: champion});
        //             fastify.log.info(`Game ${gameId} complete! winner: ${champion}`);
        //             games.get(mode)?.delete(gameId);
        //             return;
        //         }

        //         const nextRoundNum = g.currentRound + 1;
        //         const nextMatches : matchObject[] = makeNextRound(currentMatches, nextRoundNum);
        //         realtime.publish(`${matchId}-nextRound`, {matches: nextMatches}, true);
        //         g.rounds.set(nextRoundNum, nextMatches);
        //         g.currentRound = nextRoundNum;

        //         for (const m of nextMatches){
        //             const payload = {
        //                 gameId,
        //                 matchId: m.id,
        //                 round: m.round,
        //                 players: [m.slotA, m.slotB] ,
        //                 createdAt: Date.now() 
        //             }
        //             const players = [m.slotA, m.slotB].map(p => ({id : p})) as Prisma.PlayerCreateManyInput[];
        //             await fastify.room.create({matchId: m.id, gameId, players, round: m.round});
        //             realtime.publish(`${m.slotA}-matchmaking`, payload, true);
        //             realtime.publish(`${m.slotB}-matchmaking`, payload, true);
        //             fastify.log.info(`Published match assign ${m.id} for game ${gameId}`);
        //         }
        //     }
        // })
        fastify.log.info(`listening for game:join and match:result ...`);
    })
    fastify.addHook('onClose', async() => {
        realtime.destructor();
    })
}

export default Matchmaking