#!/usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-run

import * as path from "https://deno.land/std@0.167.0/path/mod.ts";

const server = Deno.env.get("CC_WRAPPERS_SERVER");

const whoami = path.basename(import.meta.url);

const cc_unwrapped = Deno.env.get(
  { "cc.js": "CC_UNWRAPPED", "cxx.js": "CXX_UNWRAPPED" }[whoami]
);

async function realArgs(args) {
  const rsp = args.find((arg) => arg.startsWith("@"));
  if (!rsp) return args;
  const rsp_content = await Deno.readTextFile(rsp.slice(1));
  return rsp_content
    .split("\n")
    .filter((arg) => arg)
    .map(JSON.parse);
}

function parseArgs(args) {
  if (!args.includes("-c")) return null;
  const file = args.find((arg) => arg.endsWith(".c") || arg.endsWith(".cpp"));
  if (!file) return null;
  if (args.includes("-DPROFILING") || args.includes("-DDEBUG")) return null;
  return {
    directory: Deno.cwd(),
    arguments: [cc_unwrapped, ...args],
    file,
  };
}

async function onParsedArgs(args, parsed_args) {
  if (parsed_args) {
    await (
      await fetch(server, { body: JSON.stringify(parsed_args), method: "POST" })
    ).json();
  }
  const p = Deno.run({ cmd: [cc_unwrapped, ...args] });
  const ec = await p.status();
  Deno.exit(ec.code);
}

onParsedArgs(Deno.args, parseArgs(await realArgs(Deno.args)));
