# Lrclib TypeScript

API Client to open lyrcis database [LrcLib](https://lrclib.net) implemented in
pure TypeScript. So it should work in a web browser but not tested yet.

The command line interface (CLI) is design to run with Deno. It's work well in
my music folder scanned by my [Jellyfin](https://jellyfin.org/) instance.

## CLI Usage

With all flags allow flags:

```
$ deno run --allow-net=lrclib.net \
  --allow-run=mediainfo \
  --allow-read \
  --allow-write \
  path/to/main.ts MUSIC_DIR
```

## Why

I would like to add synced lyrics to my music. The script doesn't search for
lyrics if it finds a lyrics file with the same name as the audio file. I have
fun implementing this client because I enjoy write async program, JavaScript
language and Deno.

## Dependencies

LrcLib don't need any dependency just TypeScript to dev.

The command line interface use [Deno std](https://jsr.io/@std). It's call
[MediaInfo](https://mediaarea.net/fr/MediaInfo) to read metadata on audio files.

## TODO

- [ ] Write unit tests
- [ ] Better logging?
- [ ] Write workers?
- [ ] Cleanup code
