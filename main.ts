#!/usr/bin/env -S deno run --allow-net=lrclib.net --allow-run=mediainfo --allow-read --allow-write

import { main } from "./src/cli.ts";

if (import.meta.main) {
  main(Deno.args.slice())
    .then(Deno.exit);
}
