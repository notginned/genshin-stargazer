import { createScheduler, createWorker, PSM } from "tesseract.js";
import { logDebug } from "../../../utils/lib";

class Scheduler {
  static COLUM_PARAMS = {
    tessedit_pageseg_mode: PSM.SINGLE_COLUMN,
    tessedit_char_whitelist:
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890():-' \n",
  };

  static PAGE_PARAMS = {
    tessedit_pageseg_mode: PSM.RAW_LINE,
    tessedit_char_whitelist: "0123456789 \n",
    preserve_interword_spaces: "1",
  };

  static WORKER_OPTS = {
    // corePath: "/tesseract",
    // workerPath: "/tesseract/worker.min.js",
    // langPath: "/tesseract",
    langPath:
      "https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0",
  } satisfies Partial<Tesseract.WorkerOptions>;

  scheduler: Tesseract.Scheduler;
  pageWorker!: Tesseract.Worker;

  isReady: boolean = false;

  constructor() {
    this.scheduler = createScheduler();
  }

  async initialize(callback?: () => void) {
    if (this.isReady) return this;

    const [pageWorker, ...workers] = await Promise.all(
      Array(11)
        .fill(0)
        .map(() => createWorker("eng", 1, Scheduler.WORKER_OPTS))
    );

    for await (const worker of workers) {
      worker.setParameters(Scheduler.COLUM_PARAMS);
    }

    await pageWorker.setParameters(Scheduler.PAGE_PARAMS);

    if (typeof callback === "function") callback();

    workers.forEach((worker) => {
      this.scheduler.addWorker(worker);
    });

    this.pageWorker = pageWorker;
    this.isReady = true;
    return this;
  }

  async terminate() {
    await this.scheduler.terminate();
    await this.pageWorker.terminate();
  }
}

const schedulerPromise = new Scheduler().initialize();

async function getScheduler() {
  await schedulerPromise;
  logDebug("scheduler is ready");
  return schedulerPromise;
}

getScheduler();

export type { Scheduler };
export { getScheduler };
