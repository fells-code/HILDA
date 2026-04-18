declare module "node:fs/promises" {
  import fs from "fs/promises";
  export = fs;
}

declare module "node:path" {
  import path from "path";
  export = path;
}
