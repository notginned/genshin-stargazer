import { parseDate } from "../../dataParser/parseData.ts";
import characters from "../../../../data/characters.json";
import banners from "../../../../data/banners.json";
import weapons from "../../../../data/weapons.json";
import type { Wish } from "../../../types/Wish.types.ts";
import type { Banner, BannerList } from "../banners.types.ts";
import { searchBanners } from "../utils/searchBanners.ts";

const wepMap = new Map(Object.entries(weapons));
const charMap = new Map(Object.entries(characters));
const bannerList: BannerList = Object.entries<string[]>(banners)
  .map<Banner>(([date, bannerTuple]) => [new Date(date).valueOf(), bannerTuple])
  .sort(([timestamp1], [timestamp2]) => Number(timestamp1) - Number(timestamp2));

function getBanner({ wishType, timeReceived, part }: Wish) {
  const index = searchBanners(bannerList, timeReceived);

  const banners = bannerList[index][1];

  switch (wishType) {
    case "Character Event Wish":
      return banners[part === "Wish 2" ? 1 : 0];
    case "Weapon Event Wish":
      return "Epitome Invocation";
    case "Permanent Wish":
      return "Wanderlust Invocation";
    case "Beginners' Wish":
      return "Beginners' Wish";
    case "Chronicled Wish":
      return banners[2] || "Chronicled Wish";
    case "Lightrace Wish":
      return banners[2] || "Lightrace Wish";
    default:
      throw new Error("Couldn't get wish type");
  }
}

function getRarity({ itemName }: Wish) {
  const rarity = wepMap.get(itemName) || charMap.get(itemName);

  if (!rarity) throw new Error("Couldn't get rarity");

  return rarity;
}

function getItemType({ itemName }: Wish) {
  if (wepMap.get(itemName)) return "Weapon";

  return "Character";
}

function getPity(rarity: string, pityCounter: PityCounter) {
  const prevFiveStarPity = ++pityCounter.fiveStar;
  const prevFourStarPity = ++pityCounter.fourStar;

  if (rarity === "5 Stars") {
    pityCounter.fiveStar = 0;
    return prevFiveStarPity;
  }
  if (rarity === "4 Stars") {
    pityCounter.fourStar = 0;
    return prevFourStarPity;
  }

  return 1;
}

// Returns the number of rolls done so far in the same banner
function getPerBanner(wishes: Wish[], i: number, pityCounter: PityCounter) {
  const prevBanner = getBanner(wishes[Math.max(i - 1, 0)]);
  const currentBanner = getBanner(wishes[i]);

  if (prevBanner === currentBanner) {
    return ++pityCounter.perBanner;
  } else {
    return (pityCounter.perBanner = 1);
  }
}

function getGroupCount(wishes: Wish[], i: number, pityCounter: PityCounter) {
  const prevWishTime = wishes[Math.max(i - 1, 0)].timeReceived;
  const curWishTime = wishes[i].timeReceived;

  if (prevWishTime === curWishTime) {
    return pityCounter.groupCount;
  } else {
    return ++pityCounter.groupCount;
  }
}

interface PityCounter {
  perBanner: number;
  groupCount: number;
  fourStar: number;
  fiveStar: number;
}

export interface WishRow {
  id: Wish["id"];
  type: ReturnType<typeof getItemType>;
  name: Wish["itemName"];
  timeReceived: ReturnType<typeof parseDate>;
  pity: ReturnType<typeof getPity>;
  rarity: ReturnType<typeof getRarity>;
  rollNum: ReturnType<typeof getPerBanner>;
  group: ReturnType<typeof getGroupCount>;
  banner: ReturnType<typeof getBanner>;
  part: Wish["part"];
}

const generateTableData = (wishes: Wish[]): WishRow[] => {
  const pityCounter = {
    perBanner: 0,
    groupCount: 1,
    fourStar: 0,
    fiveStar: 0,
  } satisfies PityCounter;

  return wishes.toReversed().map((wish, i, revWishes) => {
    const rarity = getRarity(wish);
    const banner = getBanner(wish);
    // Reverse the wishes to get them from oldest to newest
    // We pass in the reversed array so that counter calculations are correct

    return {
      id: wish.id,
      type: getItemType(wish),
      name: wish.itemName,
      timeReceived: parseDate(wish.timeReceived),
      rarity: rarity,
      pity: getPity(rarity, pityCounter),
      rollNum: getPerBanner(revWishes, i, pityCounter),
      group: getGroupCount(revWishes, i, pityCounter),
      banner: banner,
      part: wish.part,
    } satisfies WishRow;
  });
};

export { generateTableData };
