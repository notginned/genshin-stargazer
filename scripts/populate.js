import { writeFile } from "fs/promises";
import { fetchCharacters } from "./fetchCharacters.js";
import { fetchWeapons } from "./fetchWeapons.js";

async function main() {
    const [weps, chars] = await Promise.all([
        fetchWeapons(),
        fetchCharacters(),
    ]);

    await Promise.all([
        writeFile("./data/characters.json", JSON.stringify(chars, null, 2)),
        writeFile("./data/weapons.json", JSON.stringify(weps, null, 2)),
    ]);
}

main();
