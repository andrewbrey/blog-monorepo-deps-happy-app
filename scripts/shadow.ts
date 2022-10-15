// @ts-nocheck (not actually including these deps in this demo project, don't bother type-checking it)

import { execaCommand } from "execa";
import { copyFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Except, JsonObject, PackageJson, SetRequired } from "type-fest";

export type ValidShadowDepType =
  | "dependencies"
  | "devDependencies"
  | "peerDependencies"
  | "optionalDependencies";
export type ShadowDeps = Partial<Record<ValidShadowDepType, string[]>>;
export type PJ = PackageJson & { shadow?: ShadowDeps };
export type RootPJ = SetRequired<
  Except<
    PackageJson,
    | "devDependencies"
    | "peerDependencies"
    | "optionalDependencies"
    | "bundledDependencies"
    | "bundleDependencies"
  >,
  "dependencies"
>;

export type ValidWorkspaceName = "app" | "ui";

const ROOT_PATH = join(__dirname, "..");
const ROOT_PACKAGE_PATH = join(ROOT_PATH, "package.json");
const ROOT_LOCKFILE_PATH = join(ROOT_PATH, "package-lock.json");
const WORKSPACES_PATH = join(ROOT_PATH, "packages");

async function ensureDir() {} /* stub - make sure a dir is present */
async function isDirEmpty() {} /* stub - make sure a dir is empty */
async function readJson() {} /* stub - typed json read from disk */
async function writeJson() {} /* stub - write pretty json to disk */

type ShadowDepInstallConfig = {
  ws: ValidWorkspaceName;
  shadowRoot: string;
  onlyProdDeps?: boolean;
  includeWorkspaceDeps?: boolean;
  pjsonMerge?: JsonObject;
};

export async function installShadowPackage(cfg: ShadowDepInstallConfig) {
  if (!(await isDirEmpty(cfg.shadowRoot)))
    throw new Error(
      "Shadow package installation can only be run in empty directories!"
    );

  const pjsonPath = join(cfg.shadowRoot, "package.json");
  const lockFilePath = join(cfg.shadowRoot, "package-lock.json");
  await ensureDir(cfg.shadowRoot);

  let pjson = await genConcretePackage(cfg.ws, cfg.includeWorkspaceDeps);

  if (cfg.pjsonMerge) {
    pjson = Object.assign(pjson, cfg.pjsonMerge);
  }

  await writeJson(pjsonPath, pjson);
  await copyFile(ROOT_LOCKFILE_PATH, lockFilePath);

  let command = `npm ci --ignore-scripts --bin-links=false`;
  if (cfg.onlyProdDeps) command += ` --omit=dev`;
  await execaCommand(command, { cwd: cfg.shadowRoot });

  // Now that modules are installed with a strict `no-hoist` workspace
  // configuration (safety measure put in place by `genConcretePackage`)
  // we want to remove that key from the package and resave the pjson
  // (and beautify it, because why not) so that when it's used as a
  // standalone module, node won't complain about the workspaces key
  delete pjson.workspaces;
  await writeJson(pjsonPath, pjson);
  await execaCommand(
    `npx prettier --ignore-path ./fake-dir --write ${pjsonPath}`,
    { cwd: ROOT_PATH }
  );

  console.log(`Shadow package installed to ${cfg.shadowRoot}`);

  return { pjson, pjsonPath, lockFilePath };
}

export async function genConcretePackage(
  ws: ValidWorkspaceName,
  includeWorkspaceDeps = false
) {
  const validWorkspaces = await readdir(WORKSPACES_PATH, { encoding: "utf-8" });

  if (!validWorkspaces.includes(ws))
    throw new Error(`No workspace named [ ${ws} ] is known.`);

  const rootPkg = await readJson<RootPJ>(ROOT_PACKAGE_PATH);
  const targetPkgJSON = await readJson<PJ>(
    join(WORKSPACES_PATH, ws, "package.json")
  );

  const depTypes = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ] as const;
  for (const depType of depTypes) {
    const targetDepsOfType = targetPkgJSON[depType] ?? {};
    const targetDepsOfTypeWithVersion = targetDepsOfType
      ? Object.fromEntries(
          Object.entries(targetDepsOfType).map(([k, v]) => {
            if (!k.startsWith("@abc/")) {
              throw new Error(
                `Concrete "${depType}" [${k}] declared for [${ws}] project which is not part of this workspace!`
              );
            }

            if (v !== "*") {
              throw new Error(
                `Concrete "${depType}" entry [${k}] declared for [${ws}] project which doesn't use a wildcard version!`
              );
            }

            return [k, rootPkg.dependencies[k] ?? v];
          })
        )
      : {};

    const targetShadowDepsOfType = targetPkgJSON.shadow?.[depType] ?? [];
    const targetShadowDepsOfTypeWithVersion = targetShadowDepsOfType
      ? Object.fromEntries(
          targetShadowDepsOfType.sort().map((k) => {
            const rootVersion = rootPkg?.dependencies[k];

            if (!rootVersion) {
              throw new Error(
                `Shadow "${depType}" entry [${k}] declared for [${ws}] project, but missing in root package.json`
              );
            }

            return [k, rootVersion];
          })
        )
      : {};

    targetPkgJSON[depType] = {
      ...(includeWorkspaceDeps ? targetDepsOfTypeWithVersion : {}),
      ...targetShadowDepsOfTypeWithVersion,
    };
  }

  targetPkgJSON.workspaces = { nohoist: ["**"] };
  delete targetPkgJSON.shadow;
  delete targetPkgJSON.scripts;

  return targetPkgJSON;
}
