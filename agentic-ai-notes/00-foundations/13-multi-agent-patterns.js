/**
 * ============================================================================
 *  13 — MULTI-AGENT PATTERNS
 * ============================================================================
 *
 *  Story: "The Film Crew"
 *  ----------------------
 *  Making a Bollywood film is never a one-person job:
 *
 *    Director (Supervisor) — Decides what happens next, delegates tasks.
 *    Cinematographer       — Handles the visual framing.
 *    Editor                — Cuts, arranges, polishes the footage.
 *    Music Director        — Composes the background score.
 *
 *  They can work in different patterns:
 *    - SUPERVISOR: Director tells each person what to do, reviews, re-assigns.
 *    - PIPELINE:   Cinematographer shoots -> Editor cuts -> Music adds score.
 *    - PEER-TO-PEER: Cinematographer and Music Director collaborate directly.
 *    - DEBATE: Director and Editor argue about the final cut.
 *
 *  Multi-agent systems work the same way — specialized "agents" (functions
 *  or LLM calls) collaborate to solve complex problems.
 *
 *  Topics covered
 *  ──────────────
 *  1. Why multi-agent?
 *  2. Sequential Pipeline pattern
 *  3. Supervisor (orchestrator) pattern
 *  4. Peer-to-peer pattern
 *  5. Debate / critique pattern
 *  6. Shared state vs message passing
 *  7. Agent communication protocols
 *  8. Putting it all together
 *
 *  Run:  node 13-multi-agent-patterns.js
 * ============================================================================
 */

// ============================================================================
// SECTION 1 — WHY MULTI-AGENT?
// ============================================================================

console.log("=== SECTION 1: Why Multi-Agent? ===\n");

/*
    A single LLM call can do a lot — but complex tasks benefit from
    DIVISION OF LABOUR, just like a film crew.

    Single agent problems:
    - Prompt gets bloated trying to do everything.
    - One mistake derails the entire chain.
    - Hard to improve one capability without affecting others.

    Multi-agent benefits:
    ┌──────────────────────────────────────────────────────────┐
    │ 1. SPECIALIZATION — each agent has a focused role/prompt │
    │ 2. MODULARITY — swap or upgrade agents independently    │
    │ 3. QUALITY — agents can review each other's work        │
    │ 4. SCALABILITY — add new agents for new capabilities    │
    └──────────────────────────────────────────────────────────┘
*/

console.log("Single agent = solo filmmaker. Can work, but limited.");
console.log("Multi-agent  = film crew. Specialized, modular, higher quality.\n");

// ============================================================================
// SECTION 2 — SEQUENTIAL PIPELINE PATTERN
// ============================================================================

console.log("=== SECTION 2: Sequential Pipeline ===\n");

/*
    The simplest multi-agent pattern: output of Agent A feeds into Agent B.

    Cinematographer (shoot) -> Editor (cut) -> Music Director (score)

    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  Writer   │───>│ Director │───>│  Editor  │───>│  Music   │
    │ (script)  │    │ (scenes) │    │ (polish) │    │ (score)  │
    └──────────┘    └──────────┘    └──────────┘    └──────────┘
*/

// Each "agent" is a function that takes input and returns output.
// In production, each would be an LLM call with a specialized prompt.

function writerAgent(topic) {
  console.log("  [Writer] Writing script...");
  return {
    script: `A dramatic story about ${topic}. Three acts: Setup in Mumbai, Conflict at the mill, Resolution at the court.`,
    scenes: ["Opening montage of Mumbai", "Hero confronts villain at mill", "Court verdict scene"],
  };
}

function directorAgent(script) {
  console.log("  [Director] Breaking script into shot list...");
  return {
    shots: script.scenes.map((scene, i) => ({
      scene: i + 1,
      description: scene,
      camera: i === 0 ? "Drone aerial" : i === 1 ? "Handheld close-up" : "Steady wide shot",
      mood: i === 0 ? "hopeful" : i === 1 ? "tense" : "triumphant",
    })),
  };
}

function editorAgent(shots) {
  console.log("  [Editor] Editing and arranging shots...");
  return {
    editedSequence: shots.shots.map((shot) => ({
      ...shot,
      duration: shot.scene === 2 ? "5 min (extended for tension)" : "3 min",
      transitions: shot.scene === 1 ? "fade in" : "cut",
      colorGrade: shot.mood === "tense" ? "desaturated" : "warm",
    })),
  };
}

function musicAgent(editedSequence) {
  console.log("  [Music Director] Composing background score...\n");
  return {
    score: editedSequence.editedSequence.map((scene) => ({
      scene: scene.scene,
      music: scene.mood === "hopeful"
        ? "Soft sitar with tabla"
        : scene.mood === "tense"
        ? "Heavy drums, dissonant strings"
        : "Full orchestra, triumphant theme",
    })),
  };
}

// Pipeline execution
function runPipeline(topic) {
  console.log(`  Pipeline: "${topic}"\n`);

  const step1 = writerAgent(topic);
  const step2 = directorAgent(step1);
  const step3 = editorAgent(step2);
  const step4 = musicAgent(step3);

  console.log("  Final output:");
  step4.score.forEach((s) => {
    console.log(`    Scene ${s.scene}: ${s.music}`);
  });
  console.log();
  return step4;
}

runPipeline("a whistleblower fighting corruption");

// ============================================================================
// SECTION 3 — SUPERVISOR (ORCHESTRATOR) PATTERN
// ============================================================================

console.log("=== SECTION 3: Supervisor Pattern ===\n");

/*
    The Director doesn't just pass work down a line — she decides WHO
    works on WHAT, reviews the output, and may send it back for revision.

    ┌─────────────────────────────────────────┐
    │             DIRECTOR (Supervisor)        │
    │                                         │
    │  1. Analyze the task                    │
    │  2. Pick the right agent                │
    │  3. Review the output                   │
    │  4. Re-assign or approve                │
    └────────┬──────────┬──────────┬──────────┘
             │          │          │
        ┌────v──┐  ┌────v──┐  ┌───v────┐
        │Writer │  │Editor │  │ Music  │
        └───────┘  └───────┘  └────────┘
*/

const agents = {
  writer: (task) => {
    if (task.type === "write") {
      return { status: "done", output: `Script: "${task.topic}" — 3 acts, 12 scenes.` };
    }
    return { status: "error", output: "I only write scripts!" };
  },
  editor: (task) => {
    if (task.type === "edit") {
      return { status: "done", output: `Edited: Tightened pacing, removed 2 redundant scenes.` };
    }
    return { status: "error", output: "I only edit!" };
  },
  music: (task) => {
    if (task.type === "compose") {
      return { status: "done", output: `Score: 45 min background music, 3 songs composed.` };
    }
    return { status: "error", output: "I only compose!" };
  },
  reviewer: (task) => {
    if (task.type === "review") {
      const isGood = !task.content.includes("redundant");
      return {
        status: "done",
        output: isGood
          ? "APPROVED: Quality meets standards."
          : "NEEDS REVISION: Still has pacing issues.",
        approved: isGood,
      };
    }
    return { status: "error", output: "I only review!" };
  },
};

function supervisorAgent(request, maxRounds = 3) {
  console.log(`  Supervisor received: "${request}"\n`);

  const state = { request, steps: [], currentOutput: null };

  // Supervisor decides the workflow
  const workflow = [
    { agent: "writer", task: { type: "write", topic: request } },
    { agent: "editor", task: { type: "edit" } },
    { agent: "reviewer", task: { type: "review" } },
  ];

  for (let round = 0; round < maxRounds; round++) {
    console.log(`  --- Round ${round + 1} ---`);

    for (const step of workflow) {
      const agent = agents[step.agent];
      const task = { ...step.task, content: state.currentOutput || "" };

      console.log(`  [Supervisor] Assigning to ${step.agent}...`);
      const result = agent(task);
      console.log(`  [${step.agent}] ${result.output}`);

      state.currentOutput = result.output;
      state.steps.push({ agent: step.agent, result });

      // If reviewer approves, we're done
      if (step.agent === "reviewer" && result.approved) {
        console.log("\n  [Supervisor] Project APPROVED! Wrapping up.\n");
        return state;
      }
    }

    console.log("  [Supervisor] Reviewer wants revisions, looping...\n");
    // On next round, the "redundant" word is gone from editor's new output
    state.currentOutput = "Revised: Tight pacing, all scenes essential.";
  }

  console.log("  [Supervisor] Max rounds reached, shipping as-is.\n");
  return state;
}

supervisorAgent("A heist thriller set in old Delhi");

// ============================================================================
// SECTION 4 — PEER-TO-PEER PATTERN
// ============================================================================

console.log("=== SECTION 4: Peer-to-Peer Pattern ===\n");

/*
    No central supervisor — agents talk directly to each other.
    Like the cinematographer and music director collaborating:
    "This scene is slow — can you make the music more upbeat?"

    Good for: creative collaboration, brainstorming
    Risk: no single point of control, can be chaotic
*/

function peerToPeerCollaboration() {
  const cinematographer = {
    name: "Cinematographer",
    process(input) {
      console.log(`  [Cinematographer] Received: "${input.message}"`);
      if (input.from === "music") {
        return {
          to: "music",
          message: "Good idea! I'll slow down the camera pan to match the rhythm.",
          done: true,
        };
      }
      return {
        to: "music",
        message: "Scene 3 is a 2-minute slow-mo rain sequence. Can you match the tempo?",
      };
    },
  };

  const musicDirector = {
    name: "Music Director",
    process(input) {
      console.log(`  [Music Director] Received: "${input.message}"`);
      return {
        to: "cinematographer",
        message: "I'll use a slow piano melody with rain sound effects. Maybe slow the pan too?",
      };
    },
  };

  const peers = { cinematographer, music: musicDirector };

  // Start the conversation
  let message = { from: "director", to: "cinematographer", message: "Plan Scene 3 together." };
  let maxTurns = 4;

  console.log("  Peer-to-Peer conversation:\n");

  for (let turn = 0; turn < maxTurns; turn++) {
    const target = message.to === "cinematographer" ? cinematographer : musicDirector;
    const response = target.process(message);

    message = {
      from: message.to,
      to: response.to,
      message: response.message,
    };

    console.log(`    -> to ${response.to}: "${response.message}"`);

    if (response.done) {
      console.log("  [Collaboration complete]\n");
      break;
    }
  }
}

peerToPeerCollaboration();

// ============================================================================
// SECTION 5 — DEBATE / CRITIQUE PATTERN
// ============================================================================

console.log("=== SECTION 5: Debate / Critique Pattern ===\n");

/*
    Two agents argue about a decision.  A judge (or the user) picks the winner.
    Like the Director and Editor debating the final cut.

    Use cases:
    - Improving answer quality (self-critique)
    - Red-teaming (one agent attacks, one defends)
    - Decision-making (pros vs cons agents)
*/

function debatePattern(topic) {
  console.log(`  Debate topic: "${topic}"\n`);

  // Agent 1: Advocate (argues FOR)
  function advocate(topic, round, previousCritique) {
    const arguments_ = {
      1: `The song sequence is essential — it establishes the romance subplot and Bollywood audiences expect it. It's a 3-minute breather after intense action.`,
      2: `I hear the pacing concern, but we can trim it to 2 minutes. The song was tested with focus groups — 78% loved it. Removing it would disappoint the core audience.`,
      3: `Final proposal: Keep a 90-second montage version. Best of both worlds — maintains rhythm, keeps the emotional beat.`,
    };
    return arguments_[round] || "I rest my case.";
  }

  // Agent 2: Critic (argues AGAINST)
  function critic(topic, round, previousArgument) {
    const critiques = {
      1: `The song breaks pacing entirely. We go from a high-stakes chase to a garden dance? The audience will check their phones. Modern films are moving away from forced songs.`,
      2: `Focus groups are unreliable — they rate individual scenes, not flow. A trimmed version is still a disruption. Use the song over end credits instead.`,
      3: `A 90-second montage could work IF we integrate it into the narrative — show it as the hero's memory flashback during the court scene. That serves story AND emotion.`,
    };
    return critiques[round] || "I disagree.";
  }

  // Judge
  function judge(advocateArgs, criticArgs) {
    console.log("  [Judge] Reviewing both sides...");
    // In production: LLM evaluates both arguments
    return {
      winner: "compromise",
      reasoning: "Both sides have merit. The 90-second flashback montage integrates the song into the narrative while maintaining pacing.",
      finalDecision: "Use a 90-second song montage as a flashback during the court scene.",
    };
  }

  const rounds = 3;
  const advocateArgs = [];
  const criticArgs = [];

  for (let round = 1; round <= rounds; round++) {
    console.log(`  --- Round ${round} ---`);

    const argFor = advocate(topic, round, criticArgs[criticArgs.length - 1]);
    console.log(`  [Advocate] ${argFor}`);
    advocateArgs.push(argFor);

    const argAgainst = critic(topic, round, argFor);
    console.log(`  [Critic]   ${argAgainst}\n`);
    criticArgs.push(argAgainst);
  }

  const verdict = judge(advocateArgs, criticArgs);
  console.log(`  [Judge] Winner: ${verdict.winner}`);
  console.log(`  [Judge] Decision: ${verdict.finalDecision}\n`);

  return verdict;
}

debatePattern("Should we keep the song sequence in the action film?");

// ============================================================================
// SECTION 6 — SHARED STATE vs MESSAGE PASSING
// ============================================================================

console.log("=== SECTION 6: Shared State vs Message Passing ===\n");

/*
    How do agents share information?

    SHARED STATE (like a shared Google Doc):
    - All agents read/write to a common object.
    - Simple but can cause conflicts.
    - Good for: small systems, same process.

    MESSAGE PASSING (like email/Slack):
    - Agents send structured messages to each other.
    - Clean interfaces, loose coupling.
    - Good for: distributed systems, different processes.
*/

// Shared State approach
console.log("  --- Shared State Approach ---\n");

const sharedState = {
  script: null,
  shots: null,
  editedFootage: null,
  score: null,
  status: "not_started",
  log: [],
};

function writerWithState(state) {
  state.script = "A story about a lost treasure in Rajasthan.";
  state.status = "script_done";
  state.log.push("[Writer] Script written");
}

function editorWithState(state) {
  if (!state.script) {
    state.log.push("[Editor] ERROR: No script to edit!");
    return;
  }
  state.editedFootage = `Edited version of: ${state.script}`;
  state.status = "edit_done";
  state.log.push("[Editor] Footage edited");
}

writerWithState(sharedState);
editorWithState(sharedState);

console.log("  State after pipeline:");
console.log(`    status: ${sharedState.status}`);
console.log(`    log: ${sharedState.log.join(" -> ")}\n`);

// Message Passing approach
console.log("  --- Message Passing Approach ---\n");

class AgentMailbox {
  constructor() {
    this.queues = {};
  }

  register(agentName) {
    this.queues[agentName] = [];
  }

  send(from, to, content) {
    if (!this.queues[to]) {
      console.log(`    [Mailbox] Agent "${to}" not registered!`);
      return;
    }
    const message = { from, to, content, timestamp: Date.now() };
    this.queues[to].push(message);
    console.log(`    [Mailbox] ${from} -> ${to}: "${content.type}"`);
  }

  receive(agentName) {
    const messages = this.queues[agentName] || [];
    this.queues[agentName] = [];
    return messages;
  }
}

const mailbox = new AgentMailbox();
mailbox.register("writer");
mailbox.register("editor");
mailbox.register("director");

mailbox.send("director", "writer", { type: "write_script", topic: "heist in Jaipur" });
mailbox.send("director", "editor", { type: "standby", message: "wait for script" });

const writerMail = mailbox.receive("writer");
console.log(`    Writer received ${writerMail.length} message(s)`);

// Writer processes and sends result back
mailbox.send("writer", "director", {
  type: "script_complete",
  script: "The Pink City Heist — 3 acts, 15 scenes.",
});

const directorMail = mailbox.receive("director");
console.log(`    Director received ${directorMail.length} message(s)\n`);

console.log("  Shared State: simpler, faster, risk of race conditions.");
console.log("  Message Passing: cleaner, scalable, good for microservices.\n");

// ============================================================================
// SECTION 7 — AGENT COMMUNICATION PROTOCOLS
// ============================================================================

console.log("=== SECTION 7: Agent Communication Protocols ===\n");

/*
    Structured messages help agents understand each other.
    Think of it like a film production's call sheet — everyone knows
    the format.
*/

// Standard agent message format
const messageProtocol = {
  id: "msg_001",
  from: "director",
  to: "editor",
  type: "task",           // task | result | error | feedback | query
  priority: "high",       // low | medium | high | critical
  content: {
    action: "edit_scene",
    params: { scene: 3, notes: "Tighten pacing, remove awkward pause at 2:15" },
  },
  replyTo: null,          // ID of message this replies to
  timestamp: Date.now(),
};

console.log("  Standard message format:");
console.log(JSON.stringify(messageProtocol, null, 2));
console.log();

// Agent registry — who can do what?
const agentRegistry = {
  writer:   { capabilities: ["write_script", "write_dialogue"], status: "available" },
  editor:   { capabilities: ["edit_scene", "color_grade", "add_transitions"], status: "busy" },
  music:    { capabilities: ["compose_score", "select_songs"], status: "available" },
  reviewer: { capabilities: ["review_quality", "give_feedback"], status: "available" },
};

function findAgent(capability) {
  for (const [name, info] of Object.entries(agentRegistry)) {
    if (info.capabilities.includes(capability) && info.status === "available") {
      return name;
    }
  }
  return null;
}

console.log("  Agent Registry:");
Object.entries(agentRegistry).forEach(([name, info]) => {
  console.log(`    ${name}: [${info.capabilities.join(", ")}] — ${info.status}`);
});
console.log(`\n  Who can "compose_score"? -> ${findAgent("compose_score")}`);
console.log(`  Who can "edit_scene"? -> ${findAgent("edit_scene") || "nobody available (editor is busy)"}\n`);

// ============================================================================
// SECTION 8 — PUTTING IT ALL TOGETHER
// ============================================================================

console.log("=== SECTION 8: Full Multi-Agent Film Production ===\n");

/*
    Let's combine everything into a mini production system:
    - Director (supervisor) orchestrates
    - Pipeline for the main flow
    - Debate for creative decisions
    - Shared state for project tracking
*/

function fullProduction(movieIdea) {
  console.log(`  Production: "${movieIdea}"\n`);

  // Project state (shared)
  const project = {
    idea: movieIdea,
    script: null,
    directorNotes: null,
    editedCut: null,
    music: null,
    status: "pre-production",
    decisions: [],
  };

  // Phase 1: Pipeline — Script to Cut
  console.log("  --- Phase 1: Pipeline (Script -> Shot -> Edit) ---");
  project.script = `Script for "${movieIdea}": 3 acts, hero's journey structure.`;
  console.log(`  [Writer] ${project.script}`);

  project.directorNotes = "Shot list: 45 shots, mix of wide and close-up.";
  console.log(`  [Director] ${project.directorNotes}`);

  project.editedCut = "First cut: 2h 15m. Needs trimming.";
  console.log(`  [Editor] ${project.editedCut}\n`);

  // Phase 2: Debate — Should we add an item song?
  console.log("  --- Phase 2: Debate (Creative Decision) ---");
  const proArgument = "Item song will boost box office — proven formula.";
  const conArgument = "Item song breaks narrative. This is a serious thriller.";
  const decision = "Skip item song. Add energetic background score in interval block.";
  console.log(`  [Pro] ${proArgument}`);
  console.log(`  [Con] ${conArgument}`);
  console.log(`  [Director decides] ${decision}`);
  project.decisions.push(decision);
  console.log();

  // Phase 3: Supervisor review loop
  console.log("  --- Phase 3: Supervisor Review ---");
  const reviews = [
    { reviewer: "Director", feedback: "Pacing is off in Act 2. Editor, fix it.", approved: false },
    { reviewer: "Director", feedback: "Much better. Music, add tension in Act 2.", approved: false },
    { reviewer: "Director", feedback: "Perfect. Ship it!", approved: true },
  ];

  for (const review of reviews) {
    console.log(`  [${review.reviewer}] ${review.feedback}`);
    if (review.approved) {
      project.status = "ready_for_release";
      break;
    }
  }

  console.log(`\n  Final project status: ${project.status}`);
  console.log(`  Decisions made: ${project.decisions.length}`);
  console.log("  Production complete!\n");

  return project;
}

fullProduction("A cyberpunk thriller set in 2050 Varanasi");

// ============================================================================
// KEY TAKEAWAYS
// ============================================================================

console.log("=== KEY TAKEAWAYS ===\n");
console.log("1. PIPELINE: A -> B -> C. Simple, predictable, good for linear workflows.");
console.log("2. SUPERVISOR: Central orchestrator delegates, reviews, re-assigns.");
console.log("3. PEER-TO-PEER: Agents collaborate directly. Flexible but harder to control.");
console.log("4. DEBATE: Two agents argue, a judge decides. Great for quality improvement.");
console.log("5. SHARED STATE: All agents read/write one object. Simple but beware race conditions.");
console.log("6. MESSAGE PASSING: Structured messages between agents. Clean and scalable.");
console.log("7. Agent REGISTRY: Track who can do what, route tasks to available agents.");
console.log("8. Real systems combine patterns — pipeline + supervisor + debate.\n");
console.log("=== And... CUT! That's a wrap! ===\n");
