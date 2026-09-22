import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

interface ValorantStats {
    name: string;
    tag: string;
    rank: string;
    rr: number;
    agent: string;
    kd: number;
    hs: number;
}

function roastPlayer(stats: ValorantStats): string {
    let roast = ` Analysing Valorant Player: ${stats.name}#${stats.tag}\n\n`;

    // --- Rank & RR Roast ---
    const rankLower = stats.rank.toLowerCase();
    if (rankLower.includes("iron") || rankLower.includes("bronze")) {
        roast += ` Rank: ${stats.rank} -> Even if I wanted to, I wouldn't be this bad.\n`;
    } else if (rankLower.includes("radiant") || rankLower.includes("immortal")) {
        roast += ` Rank: ${stats.rank} -> You definitely haven't showered in months.\n`;
    } else if (rankLower.includes("unrated")) {
        roast += ` Rank: Unrated -> Why are you even checking your stats here?\n`;
    } else {
        roast += ` Rank: ${stats.rank} -> You are just a mid-level player.\n`;
    }

    if (stats.rr < 10 && !rankLower.includes("unrated") && !rankLower.includes("radiant")) {
        roast += ` RR: ${stats.rr} -> Very close to demoting.\n`;
    } else if (stats.rr > 90 && !rankLower.includes("radiant")) {
        roast += ` RR: ${stats.rr} -> You know it won't happen.\n`;
    }

    // --- K/D & Aim Roast ---
    if (stats.kd < 0.9) {
        roast += ` K/D: ${stats.kd} -> You shouldn't even be in these lobbies and no, you are not a team player.\n`;
    } else if (stats.kd > 1.3) {
        roast += ` K/D: ${stats.kd} -> Either you are cheating or haven't showered in months.\n`;
    } else {
        roast += ` K/D: ${stats.kd} -> Irrelevant, even if you didn't play the round probably no one would notice.\n`;
    }

    if (stats.hs < 15) {
        roast += ` Headshot: ${stats.hs}% -> The game gets easier when you start shooting heads pal.\n`;
    } else if (stats.hs > 60) {
        roast += ` Headshot: ${stats.hs}% -> Are you aimbotting?\n`;
    }

    // --- Agent Roast ---
    const duelists = ["Jett", "Reyna", "Phoenix", "Raze", "Yoru", "Neon", "Iso"];

    if (duelists.includes(stats.agent) && stats.kd < 1.0) {
        roast += ` Agent: ${stats.agent} -> Why are you playing duelists if you have a negative kd.\n`;
    } else if (stats.agent === "Sage") {
        roast += ` Agent: ${stats.agent} -> You are probably an e-girl.\n`;
    } else if (stats.agent === "KAY/O") {
        roast += ` Agent: ${stats.agent} -> You definitely flash your teammates all the time.\n`;
    } else if (stats.agent === "Deadlock" || stats.agent === "Harbor") {
        roast += ` Agent: ${stats.agent} -> You are not fun at parties.\n`;
    } else {
        roast += ` Agent: ${stats.agent} -> At least you don't instalock Reyna.\n`;
    }

    return roast;
}

async function fetchValorantStats(name: string, tag: string): Promise<ValorantStats> {
    console.log(`\nFetching stats for ${name}#${tag} from HenrikDev servers...\n`);

    const apiKey = process.env.API_KEY;
    const urlMatches = `https://api.henrikdev.xyz/valorant/v1/lifetime/matches/eu/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
    const urlMMR = `https://api.henrikdev.xyz/valorant/v1/mmr/eu/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;

    try {
        // 1. Fetch match stats
        const responseMatches = await fetch(urlMatches, { headers: { "Authorization": apiKey } });
        if (!responseMatches.ok) throw new Error(`Matches API Error: ${responseMatches.status}`);
        const jsonMatches = await responseMatches.json();
        const matchesData = jsonMatches.data;

        // 2. Fetch Rank stats
        const responseMMR = await fetch(urlMMR, { headers: { "Authorization": apiKey } });
        if (!responseMMR.ok) throw new Error(`MMR API Error: ${responseMMR.status}`);
        const jsonMMR = await responseMMR.json();
        const mmrData = jsonMMR.data;

        // Calculate K/D, Headshots and find Most Played Agent
        let totalKills = 0, totalDeaths = 0;
        let totalHeadshots = 0, totalShots = 0;
        let mainAgent = "all";

        if (matchesData && matchesData.length > 0) {
            const agentCounts: { [key: string]: number } = {};

            for (const match of matchesData) {
                // K/D
                totalKills += match.stats.kills;
                totalDeaths += match.stats.deaths;

                // Headshots
                const shots = match.stats.shots;
                totalHeadshots += shots.head;
                totalShots += (shots.head + shots.body + shots.leg);

                // Record Agent picks
                const agentName = match.stats.character.name;
                agentCounts[agentName] = (agentCounts[agentName] || 0) + 1;
            }

            let maxPlays = 0;
            for (const agent in agentCounts) {
                const currentPlays = agentCounts[agent] || 0;

                if (currentPlays > maxPlays) {
                    maxPlays = currentPlays;
                    mainAgent = agent;
                }
            }
        }

        // Calculations for K/D and HS%
        const calculatedKd = totalDeaths === 0 ? totalKills : (totalKills / totalDeaths);
        const calculatedHs = totalShots === 0 ? 0 : Math.round((totalHeadshots / totalShots) * 100);

        // 3. Combine data from both APIs and return
        return {
            name: mmrData.name || name,
            tag: mmrData.tag || tag,
            rank: mmrData.currenttierpatched || "Unrated",
            rr: mmrData.ranking_in_tier || 0,
            agent: mainAgent,
            kd: Number(calculatedKd.toFixed(2)),
            hs: calculatedHs
        };

    } catch (error) {
        console.error("Failed to fetch real data:", error);
        console.log("Falling back to mock data...\n");

        return {
            name: name,
            tag: tag,
            rank: "Iron 1",
            rr: 0,
            agent: "Brimstone",
            kd: 0.5,
            hs: 10
        };
    }
}

const app = express();

// Enabling CORS and Json reading
app.use(cors());
app.use(express.json());

// Establishing Endpoint
app.post('/api/roast', async (req, res) => {
    const { name, tag } = req.body;

    if (!name || !tag) {
        return res.status(400).json({ error: "Please provide both username and tag." });
    }

    try {
        const stats = await fetchValorantStats(name, tag);
        const roastMessage = roastPlayer(stats);

        res.json({ roast: roastMessage });
    } catch (error) {
        res.status(500).json({ error: "Something went wrong on the server." });
    }
});

// Initializing server on port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Ο Backend Server τρέχει στο http://localhost:${PORT}`);
});
