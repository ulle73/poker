const { readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { createHash } = require("node:crypto");
const { gunzip } = require("node:zlib");
const { promisify } = require("node:util");
const catalog = require("./flop-study-boards.json");
const decompress = promisify(gunzip);

exports.readBoard = async (directory, board) => {
  if (!Object.hasOwn(catalog, board)) throw Error("Brädan saknas i flopstudien.");
  const data = await readFile(join(directory, board + ".json.gz"));
  if (createHash("sha256").update(data).digest("hex") !== catalog[board])
    throw Error("Flopfilen stämmer inte med den publicerade studien.");
  return decompress(data, {maxOutputLength: 8 * 1024 * 1024});
};
