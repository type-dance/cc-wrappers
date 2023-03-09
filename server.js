#!/usr/bin/env -S deno run --allow-net --allow-read --allow-run --allow-write --unstable

import * as fs from "https://deno.land/std@0.178.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.178.0/path/mod.ts";

let host_port_promise_resolve;
const host_port_promise = new Promise((res) => {
  host_port_promise_resolve = res;
});

const reqs = [];
async function req_handler(req) {
  reqs.push(await req.json());
  return Response.json(null);
}

const ac = new AbortController();
Deno.serve(
  { signal: ac.signal, port: 0, onListen: host_port_promise_resolve },
  req_handler
);

const { hostname, port } = await host_port_promise;
const cc_wrappers_server = `http://${hostname}:${port}`;

const p = Deno.run({
  cmd: Deno.args,
  env: { CC_WRAPPERS_SERVER: cc_wrappers_server },
});

const ec = await p.status();
ac.abort();

async function isValid(req) {
  const { directory, file } = req;
  const p = path.isAbsolute(file) ? file : path.join(directory, file);
  return await fs.exists(p);
}

async function filterValid(reqs) {
  return (
    await Promise.all(
      reqs.map(async (req) => ((await isValid(req)) ? [req] : []))
    )
  ).flat();
}

await Deno.writeTextFile(
  "compile_commands.json",
  JSON.stringify(await filterValid(reqs), null, 2)
);

Deno.exit(ec.code);
