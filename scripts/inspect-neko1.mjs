import fs from "fs";

const buf = fs.readFileSync(
  `${process.env.USERPROFILE}/Downloads/neko1.aseprite`
);
const lines = [];

for (let i = 128; i < buf.length - 1; i++) {
  if (buf.readUInt16LE(i) === 0xf1fa) {
    lines.push(`magic F1FA at ${i}`);
  }
}

for (let i = 128; i < Math.min(buf.length, 220); i += 4) {
  lines.push(
    `@${i}: u32=${buf.readUInt32LE(i)} u16=${buf.readUInt16LE(i)} chunkType=${buf.readUInt16LE(i + 4)}`
  );
}

lines.push("tail hex " + buf.subarray(128).toString("hex"));
fs.writeFileSync("scripts/inspect-out.txt", lines.join("\n"));
console.log(lines.join("\n"));
