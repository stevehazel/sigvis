const intro = {
  'id': 'intro',
  'name': 'Introduction',
  steps: [
    {
      title: 'What\'s happening here?',
      saveID: 'intro1',
      reset: true,
      start: true,
      config: {
        NUM_NODES: 100,
        GREEDY_REMOVAL: false,
        MAX_GROUP_LEVELS: 2,
        EMITS_VISIBLE: false,
        PRETTY_EMITS: false,
        EMIT_RATE: 0.1,
        LINKS_PERMA_VISIBLE: true,
        LINKS_STRONG_VISIBLE: false,
        LINKS_WEAK_VISIBLE: false,
        LINK_PERMA_BOND: true,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 2,
        NODE_HEALTH_VISIBLE: false,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_LENGTH_DISTANCE: true,
        EMIT_OPACITY_MULTIPLIER: 1,
        SIGNAL_COST: 1,
      },
    },
    {
      title: 'Let\'s start with a single circle',
      //saveID: 'one',
      reset: true,
      start: true,
      config: {
        NUM_NODES: 1,
        GREEDY_REMOVAL: true,
        MAX_GROUP_LEVELS: 1,
        EMITS_VISIBLE: false,
        PRETTY_EMITS: true,
        EMIT_RATE: 0.00,
        LINKS_STRONG_VISIBLE: false,
        LINKS_WEAK_VISIBLE: false,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 10,
        NODE_HEALTH_VISIBLE: false,
        EMIT_WIDTH_MULTIPLIER: 4,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_OPACITY_MULTIPLIER: 2,
        SIGNAL_COST: 1,
      },
    },
    {
      title: 'The color of a circle is its identity',
      config: {
        NUM_NODES: 1,
        GREEDY_REMOVAL: true,
        MAX_GROUP_LEVELS: 1,
        EMITS_VISIBLE: false,
        PRETTY_EMITS: true,
        EMIT_RATE: 0.00,
        LINKS_STRONG_VISIBLE: false,
        LINKS_WEAK_VISIBLE: false,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 10,
        NODE_HEALTH_VISIBLE: false,
        EMIT_WIDTH_MULTIPLIER: 4,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_OPACITY_MULTIPLIER: 2,
        SIGNAL_COST: 1,
      },
    },
    {
      title: 'A circle continuously emits signals',
      config: {
        NUM_NODES: 1,
        GREEDY_REMOVAL: true,
        MAX_GROUP_LEVELS: 1,
        PRETTY_EMITS: true,
        LINKS_STRONG_VISIBLE: false,
        LINKS_WEAK_VISIBLE: false,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 10,
        EMIT_LENGTH_DISTANCE: false,
        NODE_HEALTH_VISIBLE: false,
        SIGNAL_COST: 1,

        EMITS_VISIBLE: true,
        EMIT_RATE: 0.02,
        EMIT_WIDTH_MULTIPLIER: 4,
        EMIT_OPACITY_MULTIPLIER: 2,
      },
    },
    {
      title: 'Each signal has an identity. It gets this from its circle',
      config: {
        NUM_NODES: 1,
        GREEDY_REMOVAL: true,
        MAX_GROUP_LEVELS: 1,
        PRETTY_EMITS: true,
        LINKS_STRONG_VISIBLE: false,
        LINKS_WEAK_VISIBLE: false,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 10,
        EMIT_LENGTH_DISTANCE: false,
        NODE_HEALTH_VISIBLE: false,
        SIGNAL_COST: 1,

        EMITS_VISIBLE: true,
        EMIT_RATE: 0.02,
        EMIT_WIDTH_MULTIPLIER: 4,
        EMIT_OPACITY_MULTIPLIER: 2,
      },
    },
    {
      title: 'Every emitted signal costs the circle. Alone, a circle will soon vanish.',
      config: {
        NUM_NODES: 1,
        GREEDY_REMOVAL: true,
        MAX_GROUP_LEVELS: 1,
        PRETTY_EMITS: true,
        LINKS_STRONG_VISIBLE: false,
        LINKS_WEAK_VISIBLE: false,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 10,
        EMITS_VISIBLE: true,
        EMIT_RATE: 0.02,
        EMIT_WIDTH_MULTIPLIER: 4,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_OPACITY_MULTIPLIER: 2,

        SIGNAL_COST: 10,
        NODE_HEALTH_VISIBLE: true,
      },
    },
    {
      title: 'Let\'s crank up the signal emit rate',
      config: {
        NUM_NODES: 1,
        GREEDY_REMOVAL: true,
        MAX_GROUP_LEVELS: 1,
        PRETTY_EMITS: true,
        LINKS_STRONG_VISIBLE: false,
        LINKS_WEAK_VISIBLE: false,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 10,
        EMITS_VISIBLE: true,
        EMIT_WIDTH_MULTIPLIER: 4,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_OPACITY_MULTIPLIER: 2,

        NODE_HEALTH_VISIBLE: true,
        EMIT_RATE: 0.08,
        SIGNAL_COST: 2,
      },
    },
    {
      title: 'Now we add a second circle. Much more interesting!',
      //saveID: 'two',
      start: true,
      config: {
        MAX_GROUP_LEVELS: 1,
        GREEDY_REMOVAL: true,
        PRETTY_EMITS: true,
        LINKS_STRONG_VISIBLE: false,
        LINKS_WEAK_VISIBLE: false,
        EMIT_LENGTH_MULTIPLIER: 10,
        EMITS_VISIBLE: true,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_OPACITY_MULTIPLIER: 1,
        SIGNAL_COST: 1,

        NODE_HEALTH_VISIBLE: true,
        NUM_NODES: 2,
        EMIT_RATE: 0.04,
        NODE_HEALTH: 500,
        EMIT_LENGTH_MULTIPLIER: 5,
      },
    },
    {
      title: 'Each signal can "hit" another circle',
      config: {
        MAX_GROUP_LEVELS: 1,
        GREEDY_REMOVAL: true,
        PRETTY_EMITS: true,
        LINKS_STRONG_VISIBLE: false,
        LINKS_WEAK_VISIBLE: false,
        EMIT_LENGTH_MULTIPLIER: 10,
        EMITS_VISIBLE: true,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_OPACITY_MULTIPLIER: 1,
        SIGNAL_COST: 1,

        NODE_HEALTH_VISIBLE: true,
        NUM_NODES: 2,
        EMIT_RATE: 0.04,
        NODE_HEALTH: 500,
        EMIT_LENGTH_MULTIPLIER: 5,
      },
    },
    {
      title: 'Three things happen when a signal hits.',
      config: {
        GREEDY_REMOVAL: true,
        MAX_GROUP_LEVELS: 1,
        PRETTY_EMITS: true,
        EMIT_LENGTH_MULTIPLIER: 10,
        EMITS_VISIBLE: true,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_OPACITY_MULTIPLIER: 1,
        SIGNAL_COST: 1,

        NODE_HEALTH_VISIBLE: true,
        NUM_NODES: 2,
        EMIT_RATE: 0.04,
        LINKS_WEAK_VISIBLE: true,
        LINKS_STRONG_VISIBLE: true,
        NODE_HEALTH: 500,
      },
    },
    {
      title: '1. Both circles get a boost',
      config: {
        GREEDY_REMOVAL: true,
        MAX_GROUP_LEVELS: 1,
        PRETTY_EMITS: true,
        EMIT_LENGTH_MULTIPLIER: 10,
        EMITS_VISIBLE: true,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_OPACITY_MULTIPLIER: 1,
        SIGNAL_COST: 1,

        NODE_HEALTH_VISIBLE: true,
        NUM_NODES: 2,
        EMIT_RATE: 0.04,
        LINKS_WEAK_VISIBLE: true,
        LINKS_STRONG_VISIBLE: true,
        NODE_HEALTH: 500,
      },
    },
    {
      title: '2. The signal induces similarity',
      config: {
        GREEDY_REMOVAL: true,
        MAX_GROUP_LEVELS: 1,
        PRETTY_EMITS: true,
        EMIT_LENGTH_MULTIPLIER: 10,
        EMITS_VISIBLE: true,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_OPACITY_MULTIPLIER: 1,
        SIGNAL_COST: 1,

        NODE_HEALTH_VISIBLE: true,
        NUM_NODES: 2,
        EMIT_RATE: 0.04,
        LINKS_WEAK_VISIBLE: true,
        LINKS_STRONG_VISIBLE: true,
        NODE_HEALTH: 500,
      },
    },
    {
      title: '3. The two circles get closer together',
      config: {
        GREEDY_REMOVAL: true,
        MAX_GROUP_LEVELS: 1,
        PRETTY_EMITS: true,
        EMIT_LENGTH_MULTIPLIER: 10,
        EMITS_VISIBLE: true,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_OPACITY_MULTIPLIER: 1,
        SIGNAL_COST: 1,

        NODE_HEALTH_VISIBLE: true,
        NUM_NODES: 2,
        EMIT_RATE: 0.04,
        LINKS_WEAK_VISIBLE: true,
        LINKS_STRONG_VISIBLE: true,
        NODE_HEALTH: 500,
      },
    },

    {
      title: 'But! They tend to drift apart ',
      config: {
        GREEDY_REMOVAL: true,
        MAX_GROUP_LEVELS: 1,
        PRETTY_EMITS: true,
        EMIT_LENGTH_MULTIPLIER: 10,
        EMITS_VISIBLE: true,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_OPACITY_MULTIPLIER: 1,
        SIGNAL_COST: 1,

        NODE_HEALTH_VISIBLE: true,
        NUM_NODES: 2,
        EMIT_RATE: 0.04,
        LINKS_WEAK_VISIBLE: true,
        LINKS_STRONG_VISIBLE: true,
        NODE_HEALTH: 500,
      },
    },
    {
      title: 'Let\'s add a few more circles and see what happens',
      /*saveID: 'six',*/
      start: true,
      reset: true,
      config: {
        GREEDY_REMOVAL: true,
        NUM_NODES: 6,
        MAX_GROUP_LEVELS: 1,
        EMITS_VISIBLE: true,
        PRETTY_EMITS: true,
        EMIT_RATE: 0.01,
        LINKS_STRONG_VISIBLE: true,
        LINKS_WEAK_VISIBLE: true,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 4,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_OPACITY_MULTIPLIER: 1,
        NODE_HEALTH_VISIBLE: true,
      },
    },
    {
      title: 'We see similar circles linking more often and more strongly',
      config: {
        GREEDY_REMOVAL: true,
        NUM_NODES: 6,
        MAX_GROUP_LEVELS: 1,
        EMITS_VISIBLE: true,
        PRETTY_EMITS: true,
        EMIT_RATE: 0.01,
        LINKS_STRONG_VISIBLE: true,
        LINKS_WEAK_VISIBLE: true,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 4,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_OPACITY_MULTIPLIER: 1,
        NODE_HEALTH_VISIBLE: true,
      },
    },
    {
      title: 'We also see nearby circles become more similar',
      config: {
        GREEDY_REMOVAL: true,
        NUM_NODES: 6,
        MAX_GROUP_LEVELS: 1,
        EMITS_VISIBLE: true,
        PRETTY_EMITS: true,
        EMIT_RATE: 0.01,
        LINKS_STRONG_VISIBLE: true,
        LINKS_WEAK_VISIBLE: true,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 4,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_OPACITY_MULTIPLIER: 1,
        NODE_HEALTH_VISIBLE: true,
      },
    },
    {
      title: 'What happens when we crank up the signal emit rate?',
      config: {
        GREEDY_REMOVAL: true,
        NUM_NODES: 6,
        MAX_GROUP_LEVELS: 1,
        EMITS_VISIBLE: true,
        PRETTY_EMITS: false,
        EMIT_RATE: 0.12,
        LINKS_STRONG_VISIBLE: true,
        LINKS_WEAK_VISIBLE: true,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 2,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_OPACITY_MULTIPLIER: 1,
        NODE_HEALTH_VISIBLE: true,
      },
    },
    {
      title: 'More to come!',
      config: {
        GREEDY_REMOVAL: true,
        NUM_NODES: 6,
        MAX_GROUP_LEVELS: 1,
        EMITS_VISIBLE: false,
        PRETTY_EMITS: false,
        EMIT_RATE: 0.12,
        LINKS_STRONG_VISIBLE: true,
        LINKS_WEAK_VISIBLE: true,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 1,
        EMIT_LENGTH_DISTANCE: true,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_OPACITY_MULTIPLIER: 1,
        NODE_HEALTH_VISIBLE: true,
      },
    },
  ]
}

const merged = {
  'id': 'merged',
  'name': 'Merging dense regions',
  'steps': [
    {
      title: 'Dense areas may merge into a larger node',
      start: true,
      reset: true,
      config: {
        GREEDY_REMOVAL: true,
        NUM_NODES: 7,
        MAX_GROUP_LEVELS: 2,
        EMITS_VISIBLE: true,
        PRETTY_EMITS: false,
        EMIT_RATE: 0.04,
        LINKS_STRONG_VISIBLE: true,
        LINKS_WEAK_VISIBLE: true,
        NODE_HEALTH: 200,
        EMIT_LENGTH_MULTIPLIER: 4,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_OPACITY_MULTIPLIER: 1,
        NODE_GROUP_THRESHOLD: 2,
      },
    },
    {
      title: 'Larger nodes are more likely to be hit by signals',
    },
    {
      title: 'More nodes...',
      start: true,
      reset: true,
      config: {
        GREEDY_REMOVAL: true,
        NUM_NODES: 30,
        MAX_GROUP_LEVELS: 2,
        EMITS_VISIBLE: false,
        PRETTY_EMITS: false,
        EMIT_RATE: 0.04,
        EMIT_LENGTH_DISTANCE: false,
        EMIT_WIDTH_MULTIPLIER: 1,
        EMIT_OPACITY_MULTIPLIER: 1,
        NODE_GROUP_THRESHOLD: 2,
      },
    },
    {
      title: 'Even more nodes',
      start: true,
      reset: true,
      config: {
        GREEDY_REMOVAL: true,
        NUM_NODES: 70,
        MAX_GROUP_LEVELS: 3,
        EMITS_VISIBLE: false,
        EMIT_LENGTH_DISTANCE: true,
        PRETTY_EMITS: false,
        LINKS_WEAK_VISIBLE: false,
        EMIT_RATE: 0.06,
        NODE_GROUP_THRESHOLD: 3,
      },
    },
  ]
};

const test = {
  'id': 'test',
  'name': 'Test',
  'steps': [
    {
      title: 'Testing one two',
      saveID: 'one',
      start: true,
      reset: true,
      config: {
        GREEDY_REMOVAL: true,
        NUM_NODES: 270,
        MAX_GROUP_LEVELS: 3,
        EMITS_VISIBLE: false,
        PRETTY_EMITS: false,
        LINKS_WEAK_VISIBLE: false,
        EMIT_RATE: 0.06,
        NODE_GROUP_THRESHOLD: 3,
      },
    },
  ]
}

export const setups = {
  intro,
  merged,
  test,
}