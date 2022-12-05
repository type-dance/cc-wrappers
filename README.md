# `cc-wrappers`

C/C++ compiler wrapper scripts to generate
[`compile_commands.json`](https://clang.llvm.org/docs/JSONCompilationDatabase.html).

## How to use

- Ensure
  [`deno`](https://deno.land/manual/getting_started/installation) is
  in `PATH`
- Set `CC_UNWRAPPED`/`CXX_UNWRAPPED` environment variables to point to
  the real C/C++ compiler
- Configure the project with `CC`/`CXX` to point to **absolute** paths
  of `cc.js`/`cxx.js`
- Any command that may invoke `cc.js`/`cxx.js` must be wrapped with
  `server.js`, e.g. `/foo/server.js ./configure CC=/foo/cc.js
  CXX=/foo/cxx.js` or `/foo/server.js hadrian/build -j`
- When the build finishes, `server.js` writes `compile_commands.json`
  to its working directory

## How it works

- `server.js` binds to a random port and starts an http server, the
  server address is passed to all subprocesses via
  `CC_WRAPPERS_SERVER`.
- `cc.js`/`cxx.js` checks their arguments, if there's `-c`, they
  assume they're being used to compile stuff, generate a
  `compile_commands.json` entry, post to the server and wait for
  server ack.
- Regardless of whether `cc.js`/`cxx.js` is invoked with `-c`, they'll
  invoke the actual unwrapped compiler with the same arguments, exit
  with the same exit code, and do not mess with stdout/stderr.
- `cxx.js` symlinks to `cc.js`, they decide whether to invoke
  `CC_UNWRAPPED`/`CXX_UNWRAPPED` by checking if `import.meta.url` is
  `cc.js`/`cxx.js`.
- When the build process completes, `server.js` has recorded all
  invocations of `cc.js`/`cxx.js`. It then does some filtering,
  checking whether the source file actually still exist, if not that's
  likely a boring auto-generated source file and gets dropped.
- `server.js` pretty-prints `compile_commands.json` and exits with the
  same exit code of the build process.

## Why

Some build systems don't support emitting `compile_commands.json` yet.
There's [`bear`](https://github.com/rizsotto/Bear), but `bear` has its
own limits and don't always reliably work, e.g. it doesn't work for
`hadrian` at all, at least when cross compiling GHC.

I came up with this low-tech wrapper idea as a showerthought. I'm
pretty sure I'm not the first one to put up an implementation, if
there's prior art I'd be glad to hear.

## TODOs

- More principled response file parsing logic
- More filtering/dedupe logic to avoid confusing the IDE with multiple
  entries of the same source file
- Make it incremental, support appending to existing
  `compile_commands.json`
- Support different C/C++ compiler combinations in the same run, e.g.
  due to the need of cross compilation
- Support invoking other compiler wrappers like `ccache`
