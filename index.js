const fs = require("fs");
const readline = require("readline");

const runPath = "./first_run.json";
const worldStatePath = "./world_state.json";


function loadJson(path) {
  const raw = fs.readFileSync(path, "utf-8");
  return JSON.parse(raw);
}

function saveJson(path, obj) {
  fs.writeFileSync(path, JSON.stringify(obj, null, 2), "utf-8");
}

function ensureWorldState() {
  if (!fs.existsSync(worldStatePath)) {
    saveJson(worldStatePath, {
      current_node: 0,
      year: 0,
      flags: [],
    });
  }
  const ws = loadJson(worldStatePath);

  ws.current_node = Number.isFinite(ws.current_node) ? ws.current_node : 0;
  ws.year = Number.isFinite(ws.year) ? ws.year : 0;
  ws.flags = Array.isArray(ws.flags) ? ws.flags : [];
  return ws;
}

function hasAllFlags(worldState, requiresFlags) {
  if (!requiresFlags || requiresFlags.length === 0) return true;
  return requiresFlags.every((f) => worldState.flags.includes(f));
}

function applyEffects(worldState, effects) {
  const add = effects?.flags_add || [];
  const remove = effects?.flags_remove || [];

  for (const addFlag of add) {
    if (!worldState.flags.includes(addFlag)) worldState.flags.push(addFlag);
  }

  for (const removeFlag of remove) {
    worldState.flags = worldState.flags.filter((x) => x !== removeFlag);
  }
}

function main() {
  const run = loadJson(runPath);
  const worldState = ensureWorldState();

  console.log("Ashen Crown loaded.");
  console.log("Run ID:", run.run_id);

  const node = run.nodes.find(
  (n) => n.node_index === worldState.current_node
);


  if (!node) {
    console.log("No more nodes. Your tale ends here.");
    return;
  }

  if (!hasAllFlags(worldState, node.requires_flags)) {
    console.log("The world rejects you.");
    console.log("Required fate:", node.requires_flags || []);
    return;
  }

  console.log(`Year ${node.node_index}: ${node.title}`);
  console.log("Choices:");
  node.choices.forEach((c, i) => console.log(`${i + 1}. ${c.label}`));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Choose an option (1–${node.choices.length}): ", (answer) => {
    const idx = parseInt(answer, 10) - 1;

    if (Number.isNaN(idx) || idx < 0 || idx >= node.choices.length) {
      console.log("Invalid choice. The world remains silent.");
      rl.close();
      return;
    }

    const choice = node.choices[idx];
    console.log("You chose:", choice.label);
    console.log("Fate shifts...");

    applyEffects(worldState, choice.effects);
    console.log("Effects:", choice.effects);

// === 结局判断 ===
    if (choice.next === null) {
    console.log("\nYour tale ends here.");
    saveJson(worldStatePath, worldState);
    rl.close();
   return;
}

// === 正常推进 ===
worldState.current_node = choice.next;
worldState.year += 1;

saveJson(worldStatePath, worldState);


    console.log("World state saved:", worldState);
    rl.close();
  });
}

main();
