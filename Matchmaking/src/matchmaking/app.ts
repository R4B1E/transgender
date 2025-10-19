import { type FastifyInstance, type FastifyPluginAsync } from "fastify"
import Realtime from "../Realtime/app"

interface matchObject{
    id: string,
    round: number,
    slotA: string,
    slotB: string,
    winner: string
}

interface gameObject{
    players : Array<string>,
    rounds: Map<number, matchObject[]>,
    currentRound: number 
}

// advance matches: given completed winners produce next round matches
function makeNextRound(matches : matchObject[], round : number) : matchObject[] {
  // matches: array of completed match objects with winner set
  const winners = matches.map(m => m.winner);
  const next : matchObject[] = [];
  for (let i = 0; i < winners.length; i += 2) {
    next.push({
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
  // players: array of { id, skill, ... } length 8
  // simple seeding: random shuffle then pair [0 vs 1], [2 vs 3], ...
  const shuffled = players.slice().sort(() => Math.random() - 0.5);
  const matches : Array<matchObject> = new Array();
  for (let i = 0; i < shuffled.length; i += 2) {
    // Maybe i need to add room entry to the database after the game finishes ??                                            
    matches.push({
      id: genId('match'),
      round: 1,
      slotA: shuffled[i],
      slotB: shuffled[i+1],
      winner: ''
    });
  }
  return matches; // quarterfinal matches
}

// TO.DO : the players map might have Player prisma object as its value
const Matchmaking: FastifyPluginAsync = async function (fastify: FastifyInstance, opts) {
    const realtime = Realtime('ws://realtime:' + fastify.config.REALTIME_PORT.toString(), { reconnect: true });
    let games : Map< string, Map<number, gameObject> > = new Map([["tournament", new Map()], ["1v1", new Map()]]);

    let defaultGames : Array<string> = [];

    realtime.onConnection((ev) => {
        realtime.subscribe('game:join', async (message) => {
            let { gameId = 'default', playerId , gameMode } = message;
            const gameSize = gameMode === "tournament" ? 4 : 2;

            if (!games.get(gameMode)?.has(gameId))
            {
                if (defaultGames.length === 0)
                {
                    gameId = genId('game');
                    defaultGames.push(gameId);
                    games.get(gameMode)?.set(gameId, {players: [], rounds: new Map(), currentRound: 0});
                }

                else
                    gameId = defaultGames[0];
            }

            const g = games.get(gameMode)?.get(gameId);

            if (g?.players.find(p=>p === playerId))
            {
                fastify.log.info(`player ${playerId} already queued for ${gameId}`);
                const m : matchObject | undefined = g.rounds.get(g.currentRound)?.find(p => {p.slotA == playerId || p.slotB == playerId});
                const payload = {
                    gameId,
                    matchId: m!.id,
                    round: m!.round,
                    players: [m?.slotA, m?.slotB]
                }
                realtime.publish(`${playerId}-matchmaking`, payload, true);
                return;
            }

            g?.players.push(playerId);
            fastify.log.info(`Added player ${playerId} to ${gameId}`);
            fastify.log.info(`array of players : ${g?.players}`)

            if (g?.players.length === gameSize){
                fastify.log.info(`room full`);
                const qfMatches : matchObject[] = seedBracket(g.players, fastify, gameId); // round 1
                g.rounds.set(1, qfMatches);
                g.currentRound = 1;

                for (const m of qfMatches){
                    const payload = {
                        gameId,
                        matchId: m.id,
                        round: m.round,
                        players: [m.slotA, m.slotB],
                        createdAt: Date.now()
                    }
                    realtime.publish(`${m.slotA}-matchmaking`, payload, true);
                    realtime.publish(`${m.slotB}-matchmaking`, payload, true);
                    fastify.log.info(`Published match assign ${m.id} for game ${gameId}`);
                }
                if (defaultGames.find((p) => p === gameId))
                    defaultGames.pop();
            }
        })
        realtime.subscribe('match:result', async (msg) => {
            const { gameId , matchId, winnerId, mode} = msg;
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

            const roundDone = currentMatches.every(m => m.winner.length > 0);
            if (roundDone) {
                const winners = currentMatches.map(m => m.winner.length > 0);
                if (winners.length === 1){
                    const champion = winners[0];
                    realtime.publish('game:complete', {gameId, champion, finishedAt: Date.now()}, true);
                    fastify.log.info(`Game ${gameId} complete! winner: ${champion}`);
                    return;
                }

                const nextRoundNum = g.currentRound + 1;
                const nextMatches : matchObject[] = makeNextRound(currentMatches, nextRoundNum);
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
                    realtime.publish(`${m.slotA}-matchmaking`, payload, true);
                    realtime.publish(`${m.slotB}-matchmaking`, payload, true);
                    fastify.log.info(`Published match assign ${m.id} for game ${gameId}`);
                }
            }
        })
        fastify.log.info(`listening for game:join and match:result ...`);
    })
    fastify.addHook('onClose', async() => {
        realtime.destructor();
    })
}

export default Matchmaking