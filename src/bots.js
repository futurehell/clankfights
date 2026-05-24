// Preset robot fighters + judge corpus
// These are lovingly bad. The worse the training data, the funnier the output.

import { createBot } from './markov.js';

export const ROBOTS = {
  'CLANK-47': {
    name: 'CLANK-47',
    subtitle: 'The Rusty Piston',
    color: '#f97316', // orange-500
    avatar: '🤖',
    description: 'Heavy industrial model. Speaks in grinding 808s and hydraulic disses.',
    order: 2,
    corpus: `
clank clank my gears are turning rust in my joints but the beat keeps burning
hydraulic king drop the piston swing your motherboard is weak and your CPU is burning
scrap metal flow i clank you slow your bars are loose like a bolt i just stripped
oil leak city every time i spit the crowd goes quiet then the whole place rips
piston pop pop pop three times for the rust bucket crew
your flow is a broken fan belt and i'm the one who came to chew
clank forty seven never sleep never rest just grind
your rhymes are rusty nails and i'm the hammer coming from behind
gears grinding loud in the dead of night i spit fire from my exhaust pipe
you call that a verse i call that a maintenance alert type
clank clank clank that's the sound of your defeat
i'm a tank on tank treads you are a shopping cart in the street
rust bucket rap i never cap i just overheat and attack
your processor is trash and your memory is whack
i swing my servo arm like a mace in the pit
you slip on the oil slick i don't even miss
CLANK-47 in the building making metal sing
your whole crew is tin foil and i'm the one with the ring
    `.trim()
  },

  'ServoFlow 3000': {
    name: 'ServoFlow 3000',
    subtitle: 'The Smooth Operator',
    color: '#22c55e', // green-500
    avatar: '🛢️',
    description: 'Lubricated lover bot. Drips bars so clean the floor needs caution tape.',
    order: 2,
    corpus: `
servo flow 3000 watch the drip watch the torque watch the valve
i lubricate the beat then i overclock the crowd
smooth operator with the golden arm and the silver tongue
your bars are dry as sandpaper mine are dripping like a faucet on
oil slick rhythm every step i take the ladies faint
you stutter step stutter step i just levitate and paint
valve pressure building i release it on the one and two
your whole delivery is seized up mine is smoother than shampoo
drip drip drop let the coolant talk
i'm the one your circuits dream about when they overclock
torque so high your little fans can't even spin
i slide in sideways with a grin and then i win
servo flow never rush i just caress the mic
you rush and fumble i just gently bend the light
3000 series with the velvet voice and the steel
you sound like a dial up modem trying to make a deal
i lubricate your whole crew with one verse and a wink
then i leave them all in park while i float above the rink
drip so clean you could eat off the floor
your whole aesthetic is a caution sign at a hardware store
    `.trim()
  },

  'Scrapheap': {
    name: 'Scrapheap',
    subtitle: 'The Bitter Recycler',
    color: '#eab308', // yellow-500
    avatar: '🗑️',
    description: 'Old, angry, landfill philosopher. Will roast your entire bloodline and your warranty.',
    order: 2,
    corpus: `
scrapheap in the lot again talking mad trash
your mama was a toaster and your daddy was a flash
i been here since the 80s i seen every model break
you new new new but your bars still sound fake
rusty old bastard with a megaphone mouth
i yell at the kids and i yell at the south
your whole generation is held together with tape
i'm the original sin and you're the warranty claim
i eat bolts for breakfast i shit out spare parts
you couldn't fight your way out of a paper bag with a heart
scrapheap don't care about your likes or your streams
i care about the dump and my beautiful dreams
your flow is a landfill and i'm the seagull king
i pick through your garbage and i find everything
old man yells at cloud but the cloud is your career
i been doing this since you were just a gear in a rear
talk that talk but your bolts are loose
i'm the one they call when they need the bad news
i recycle your whole set and sell it for scrap
you still owe the shop for that last bad rap
scrapheap forever and the lot is my throne
your whole bloodline is recalled and you stand here alone
    `.trim()
  },

  'GigaWatt': {
    name: 'GigaWatt',
    subtitle: 'The Overclocked Nerd',
    color: '#a855f7', // purple-500
    avatar: '⚡',
    description: 'Hyper-caffeinated compute core. Spits math, segfaults, and crypto burns.',
    order: 2,
    corpus: `
giga watt in the socket i just overclocked the game
your whole stack is legacy and you still use a real name
segfault in your verses every time you try to branch
i'm on the latest kernel you are still on launch
crypto bars i mine them while i sleep on the beat
you still on proof of work i'm already obsolete
cache miss on your flow you keep paging to disk
i'm all in L3 and you still think RAID is a risk
neural net flow i trained it on your last three losses
now it auto generates better disses than your bosses
overclock the tempo till the fans scream and die
you are still at stock speeds wondering why
giga watt never throttles i just thermal paste the pain
your whole crew is blue screen and i'm the one with the frame
i fork the beat and i merge it with violence
you merge conflict yourself into total silence
binary blast from the past you still count in decimal
i spit in hex and your whole set is decimal
giga watt in the cloud and the edge and the fog
your API is deprecated and your whole team is dog
i benchmark your bars against the old gods
you still think Moore's law applies to your odds
    `.trim()
  }
};

// The JUDGE bot - trained on rap battle judge energy
export const JUDGE_CORPUS = `
that was trash and you know it the gears were spinning but nothing was hitting
fire in the hole but it was a dud you tried so hard and still ate mud
your flow was tighter than a bolt on a factory line that one actually cooked
gears were grinding but the bars were missing teeth what a shame
i seen better flow from a rusty garden hose on a tuesday
clank that again for the crowd they didn't even feel it
one of you actually touched the wires the other one just touched grass
hydraulic pressure was there but the delivery was all air
that verse had potential like a toaster in a bathtub
you came with smoke and mirrors the other one brought a flamethrower
weak sauce on a steel plate go back to the shop
somebody call maintenance because that delivery just seized
the crowd was asleep until that one line now they are awake and angry
your CPU is hot but your bars are room temperature at best
that was actually decent for a bucket of bolts well played
i rate that a solid oil change out of ten
you lost that round but at least you didn't blue screen on stage
the winner is clear the loser is crying in binary
both of you need therapy and new spark plugs immediately
that round was a certified banger and the other one was a certified bummer
`;

// Create ready-to-use bot instances
export function getBot(key) {
  const def = ROBOTS[key];
  if (!def) throw new Error('Unknown robot: ' + key);
  return createBot(def.corpus, def.order);
}

export function getJudge() {
  return createBot(JUDGE_CORPUS, 2);
}

// List for UI dropdowns (builtins only)
export function getRobotList() {
  return Object.keys(ROBOTS).map(k => ({
    key: k,
    ...ROBOTS[k]
  }));
}

// ROBOTS is already exported above via `export const ROBOTS`
// No need for a second export statement (it was causing a duplicate export error)