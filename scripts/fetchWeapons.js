import { JSDOM } from "jsdom";

function getWeaponsList(dom) {
  const [current, upcoming] = dom.window.document.querySelectorAll(
    "table.sortable tbody"
  );

  const curArr = Array.from(current.querySelectorAll("tr"));
  const upcomingArr = Array.from(upcoming.querySelectorAll("tr"));

  return curArr.concat(upcomingArr);
}

function getWeaponName(row) {
  return row.children[1].firstChild?.title;
}

function getWeaponRarity(row ) {
  return row.children[2].firstChild.firstChild?.title;
}

function getWeapons(dom) {
  const rows = getWeaponsList(dom);
  const data = rows.reduce((acc, cur) => {
    const name = getWeaponName(cur);
    const rarity = getWeaponRarity(cur);

    if (name === undefined || rarity === undefined) return acc;

    acc[name] = rarity;

    return acc;
  }, {});

  return data;
}

async function fetchWeapons() {
  const page = await fetch(
    "https://genshin-impact.fandom.com/wiki/Weapon/List"
  ).then((res) => res.arrayBuffer());

  const dom = new JSDOM(page);

  const list = getWeapons(dom);
  console.debug(`Fetched ${Object.keys(list).length} weapons`);

  return list;
}

export { fetchWeapons };
