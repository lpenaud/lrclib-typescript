import * as fs from "jsr:@std/fs@1.0.10";
import * as path from "jsr:@std/path@1.0.8";
import { LrcLibApiClient, LrcLibApiClientGetResponse } from "./lrclib.ts";

interface AudioTrack {
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  pathname: string;
}

interface MediaInfoGeneralTrack {
  Track?: string;
  Duration: string;
  Album?: string;
  Album_Performer?: string;
}

interface MediaInfoOutput {
  media: {
    "@ref": string;
    track: [MediaInfoGeneralTrack];
  };
}

function validTags(
  { media: { "@ref": pathname, track: [track] } }: MediaInfoOutput,
): AudioTrack | null {
  const props: Array<keyof MediaInfoGeneralTrack> = [
    "Track",
    "Duration",
    "Album",
    "Album_Performer",
  ];
  if (props.some((p) => track[p] === undefined)) {
    return null;
  }
  return {
    albumName: track.Album as string,
    artistName: track.Album_Performer as string,
    duration: parseFloat(track.Duration),
    trackName: track.Track as string,
    pathname,
  };
}

async function audioTags(paths: string[]): Promise<AudioTrack[]> {
  const cmd = new Deno.Command("mediainfo", {
    args: ["--Output=JSON", ...paths],
    stdin: "null",
    stdout: "piped",
    stderr: "inherit",
  });
  const { code, stdout, success } = await cmd.output();
  if (!success) {
    throw new Error(`ffprobe finished with the code: ${code}`);
  }
  const medias: MediaInfoOutput[] = JSON.parse(
    new TextDecoder().decode(stdout),
  );
  return medias.map((m) => validTags(m))
    .filter((v) => v !== null);
}

interface WriteLyricsFileOptions {
  pathname: string;
  lyrics: LrcLibApiClientGetResponse;
}

async function writeLyricsFile(
  { pathname, lyrics: { plainLyrics, syncedLyrics } }: WriteLyricsFileOptions,
): Promise<void> {
  const { dir, name } = path.parse(pathname);
  const plainFile = path.join(dir, `${name}.txt`);
  const lyricsFile = path.join(dir, `${name}.lrc`);
  let dest: string;
  let content: string;
  if (syncedLyrics) {
    dest = lyricsFile;
    content = syncedLyrics;
    if (await fs.exists(plainFile)) {
      await Deno.remove(plainFile);
    }
  } else if (plainLyrics) {
    if (await fs.exists(plainFile)) {
      return;
    }
    dest = plainFile;
    content = plainLyrics;
  } else {
    console.log("No lyrics found for '%s'", pathname);
    return;
  }
  console.log("Write: '%s'", dest);
  await Deno.writeTextFile(dest, content);
}

interface WalkAudioOptions {
  limit?: number;
}

async function* walkAudio(root: string, { limit = 64 }: WalkAudioOptions = {}) {
  const walk = fs.walk(root, {
    exts: [".mp3", ".flac", ".ogg", ".m4a"],
    includeDirs: false,
    includeFiles: true,
  });
  let paths: string[] = [];
  for await (const { path: pathname } of walk) {
    const { dir, name } = path.parse(pathname);
    const lyricsFile = path.join(dir, `${name}.lrc`);
    if (await fs.exists(lyricsFile)) {
      continue;
    }
    if (paths.push(pathname) >= limit) {
      yield* await audioTags(paths);
      paths = [];
    }
  }
  if (paths.length > 0) {
    yield* await audioTags(paths);
  }
}

async function* findLyrics(
  indir: string,
): AsyncGenerator<WriteLyricsFileOptions> {
  const client = new LrcLibApiClient({
    url: "https://lrclib.net",
  });
  for await (
    const { artistName, trackName, duration, pathname } of walkAudio(indir)
  ) {
    const lyrics = await client.get({
      artistName,
      trackName,
      duration: Math.round(duration),
    });
    if (lyrics === null || lyrics.instrumental) {
      continue;
    }
    yield {
      lyrics,
      pathname: pathname,
    };
  }
}

export async function main([indir]: string[]): Promise<number> {
  if (indir === undefined) {
    console.log("Usage: %s INDIR", import.meta.filename ?? import.meta.url);
    return 1;
  }
  let tasks: Promise<void>[] = [];
  for await (const options of findLyrics(indir)) {
    if (tasks.push(writeLyricsFile(options)) >= 64) {
      await Promise.all(tasks);
      tasks = [];
    }
  }
  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
  return 0;
}
