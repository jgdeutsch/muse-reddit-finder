import { NextResponse } from "next/server";

// MuseDungeon page index for matching
const museDungeonPages = [
  // Classes
  { name: "Artificer", keywords: ["artificer"], url: "/characters/classes/artificer-5e/", type: "Class" },
  { name: "Barbarian", keywords: ["barbarian", "rage", "reckless"], url: "/characters/classes/barbarian-5e/", type: "Class" },
  { name: "Bard", keywords: ["bard", "bardic inspiration"], url: "/characters/classes/bard-5e/", type: "Class" },
  { name: "Cleric", keywords: ["cleric", "channel divinity"], url: "/characters/classes/cleric-5e/", type: "Class" },
  { name: "Druid", keywords: ["druid", "wild shape"], url: "/characters/classes/druid-5e/", type: "Class" },
  { name: "Fighter", keywords: ["fighter", "action surge", "second wind"], url: "/characters/classes/fighter-5e/", type: "Class" },
  { name: "Monk", keywords: ["monk", "ki", "martial arts", "stunning strike"], url: "/characters/classes/monk-5e/", type: "Class" },
  { name: "Paladin", keywords: ["paladin", "divine smite", "lay on hands", "aura"], url: "/characters/classes/paladin-5e/", type: "Class" },
  { name: "Ranger", keywords: ["ranger", "favored enemy", "hunter"], url: "/characters/classes/ranger-5e/", type: "Class" },
  { name: "Rogue", keywords: ["rogue", "sneak attack", "cunning action", "thief"], url: "/characters/classes/rogue-5e/", type: "Class" },
  { name: "Sorcerer", keywords: ["sorcerer", "metamagic", "sorcery points"], url: "/characters/classes/sorcerer-5e/", type: "Class" },
  { name: "Warlock", keywords: ["warlock", "eldritch", "pact", "invocation"], url: "/characters/classes/warlock-5e/", type: "Class" },
  { name: "Wizard", keywords: ["wizard", "arcane recovery", "spellbook"], url: "/characters/classes/wizard-5e/", type: "Class" },

  // Races
  { name: "Tiefling", keywords: ["tiefling"], url: "/characters/races/tiefling-5e/", type: "Race" },
  { name: "Dragonborn", keywords: ["dragonborn"], url: "/characters/races/dragonborn-5e/", type: "Race" },
  { name: "Elf", keywords: ["elf", "elven", "astral elf"], url: "/characters/races/elf-5e/", type: "Race" },
  { name: "Dwarf", keywords: ["dwarf", "dwarven"], url: "/characters/races/dwarf-5e/", type: "Race" },
  { name: "Halfling", keywords: ["halfling"], url: "/characters/races/halfling-5e/", type: "Race" },
  { name: "Human", keywords: ["human"], url: "/characters/races/human-5e/", type: "Race" },
  { name: "Half-Orc", keywords: ["half-orc", "orc"], url: "/characters/races/half-orc-5e/", type: "Race" },
  { name: "Gnome", keywords: ["gnome"], url: "/characters/races/gnome-5e/", type: "Race" },
  { name: "Hexblood", keywords: ["hexblood"], url: "/characters/races/hexblood-5e/", type: "Race" },

  // Conditions
  { name: "Exhaustion", keywords: ["exhaustion", "exhausted"], url: "/rules/conditions/exhaustion-5e/", type: "Condition" },
  { name: "Grappled", keywords: ["grapple", "grappled", "grappling"], url: "/rules/conditions/grappled-5e/", type: "Condition" },
  { name: "Stunned", keywords: ["stunned", "stun"], url: "/rules/conditions/stunned-5e/", type: "Condition" },
  { name: "Prone", keywords: ["prone"], url: "/rules/conditions/prone-5e/", type: "Condition" },
  { name: "Frightened", keywords: ["frightened", "fear"], url: "/rules/conditions/frightened-5e/", type: "Condition" },
  { name: "Paralyzed", keywords: ["paralyzed", "paralysis"], url: "/rules/conditions/paralyzed-5e/", type: "Condition" },
  { name: "Incapacitated", keywords: ["incapacitated"], url: "/rules/conditions/incapacitated-5e/", type: "Condition" },
  { name: "Poisoned", keywords: ["poisoned", "poison"], url: "/rules/conditions/poisoned-5e/", type: "Condition" },
  { name: "Invisible", keywords: ["invisible", "invisibility"], url: "/rules/conditions/invisible-5e/", type: "Condition" },
  { name: "Charmed", keywords: ["charmed", "charm"], url: "/rules/conditions/charmed-5e/", type: "Condition" },

  // Core Mechanics
  { name: "Ability Scores", keywords: ["ability score", "stats", "strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma", "stat"], url: "/rules/core-mechanics/dnd-stats/", type: "Rule" },
  { name: "Alignments", keywords: ["alignment", "lawful", "chaotic", "neutral", "good", "evil"], url: "/rules/core-mechanics/dnd-alignments/", type: "Rule" },
  { name: "Advantage/Disadvantage", keywords: ["advantage", "disadvantage"], url: "/rules/core-mechanics/advantage-disadvantage-5e/", type: "Rule" },
  { name: "Proficiency", keywords: ["proficiency", "proficient"], url: "/rules/core-mechanics/proficiency-bonus-5e/", type: "Rule" },
  { name: "Saving Throws", keywords: ["saving throw", "save"], url: "/rules/core-mechanics/saving-throws-5e/", type: "Rule" },
  { name: "Skill Checks", keywords: ["skill check", "ability check"], url: "/rules/core-mechanics/skill-checks-5e/", type: "Rule" },

  // Features
  { name: "Sneak Attack", keywords: ["sneak attack"], url: "/characters/features/sneak-attack-5e/", type: "Feature" },
  { name: "Divine Smite", keywords: ["divine smite", "smite"], url: "/characters/features/divine-smite-5e/", type: "Feature" },
  { name: "Wild Shape", keywords: ["wild shape"], url: "/characters/features/wild-shape-5e/", type: "Feature" },
  { name: "Rage", keywords: ["rage", "raging"], url: "/characters/features/rage-5e/", type: "Feature" },
  { name: "Action Surge", keywords: ["action surge"], url: "/characters/features/action-surge-5e/", type: "Feature" },
  { name: "Extra Attack", keywords: ["extra attack"], url: "/characters/features/extra-attack-5e/", type: "Feature" },
  { name: "Evasion", keywords: ["evasion"], url: "/characters/features/evasion-5e/", type: "Feature" },
  { name: "Uncanny Dodge", keywords: ["uncanny dodge"], url: "/characters/features/uncanny-dodge-5e/", type: "Feature" },

  // Spells (popular ones)
  { name: "Fireball", keywords: ["fireball"], url: "/spells/offensive/fireball-5e/", type: "Spell" },
  { name: "Shield", keywords: ["shield spell"], url: "/spells/defensive/shield-5e/", type: "Spell" },
  { name: "Counterspell", keywords: ["counterspell"], url: "/spells/utility-control/counterspell-5e/", type: "Spell" },
  { name: "Eldritch Blast", keywords: ["eldritch blast"], url: "/spells/cantrips/eldritch-blast-5e/", type: "Spell" },
  { name: "Thaumaturgy", keywords: ["thaumaturgy"], url: "/spells/cantrips/thaumaturgy-5e/", type: "Spell" },

  // Feats
  { name: "Great Weapon Master", keywords: ["great weapon master", "gwm"], url: "/characters/feats/great-weapon-master-5e/", type: "Feat" },
  { name: "Sharpshooter", keywords: ["sharpshooter"], url: "/characters/feats/sharpshooter-5e/", type: "Feat" },
  { name: "Lucky", keywords: ["lucky feat"], url: "/characters/feats/lucky-5e/", type: "Feat" },
  { name: "Alert", keywords: ["alert feat"], url: "/characters/feats/alert-5e/", type: "Feat" },
  { name: "Sentinel", keywords: ["sentinel"], url: "/characters/feats/sentinel-5e/", type: "Feat" },
];

function findMatchingPages(title: string, selftext: string): typeof museDungeonPages {
  const combined = (title + " " + selftext).toLowerCase();
  const matches: typeof museDungeonPages = [];

  for (const page of museDungeonPages) {
    for (const keyword of page.keywords) {
      if (combined.includes(keyword.toLowerCase())) {
        if (!matches.find(m => m.url === page.url)) {
          matches.push(page);
        }
        break;
      }
    }
  }

  return matches.slice(0, 3); // Max 3 matches per post
}

async function getRedditToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Reddit credentials not configured");
  }

  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error("Failed to get Reddit token");
  }

  const data = await response.json();
  return data.access_token;
}

interface RedditPost {
  title: string;
  url: string;
  permalink: string;
  selftext: string;
  subreddit: string;
  created_utc: number;
  num_comments: number;
  score: number;
  link_flair_text?: string;
}

async function fetchSubreddit(token: string, subreddit: string): Promise<RedditPost[]> {
  const response = await fetch(`https://oauth.reddit.com/r/${subreddit}/new?limit=25`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "User-Agent": "MuseDungeon/1.0",
    },
  });

  if (!response.ok) {
    console.error(`Failed to fetch r/${subreddit}:`, response.status);
    return [];
  }

  const data = await response.json();
  return data.data.children.map((child: { data: RedditPost }) => child.data);
}

export async function GET() {
  try {
    const token = await getRedditToken();

    // Fetch from multiple D&D subreddits
    const [dnd, dndnext, dmacademy] = await Promise.all([
      fetchSubreddit(token, "DnD"),
      fetchSubreddit(token, "dndnext"),
      fetchSubreddit(token, "DMAcademy"),
    ]);

    const allPosts = [...dnd, ...dndnext, ...dmacademy];

    // Filter for questions and find matching pages
    const questionKeywords = ["how", "does", "can", "what", "why", "help", "question", "?", "rule", "work", "explain"];

    const results = allPosts
      .filter(post => {
        const title = post.title.toLowerCase();
        return questionKeywords.some(kw => title.includes(kw));
      })
      .map(post => {
        const matches = findMatchingPages(post.title, post.selftext || "");
        return {
          title: post.title,
          url: `https://reddit.com${post.permalink}`,
          subreddit: post.subreddit,
          selftext: (post.selftext || "").slice(0, 300),
          created: new Date(post.created_utc * 1000).toISOString(),
          comments: post.num_comments,
          score: post.score,
          flair: post.link_flair_text || null,
          museDungeonMatches: matches.map(m => ({
            name: m.name,
            url: `https://musedungeon.com${m.url}`,
            type: m.type,
          })),
        };
      })
      .filter(post => post.museDungeonMatches.length > 0)
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
      .slice(0, 20);

    return NextResponse.json({ posts: results });
  } catch (error) {
    console.error("Reddit API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch Reddit posts" },
      { status: 500 }
    );
  }
}
