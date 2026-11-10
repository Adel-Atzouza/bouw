import { projectTypes } from "./delicent-services.mjs";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, open, readFile, rename, rm } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

export type Enquiry = {
  requestId: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  project: string;
  message: string;
};
// Retain the previous combined choice for enquiries already open in a browser.
export const enquiryProjects = [...projectTypes, "Dakkapel of dakopbouw"];

export function parseEnquiry(input: unknown): Enquiry | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  const limits: Record<keyof Enquiry, number> = {
    requestId: 36,
    name: 150,
    email: 254,
    phone: 40,
    location: 150,
    project: 100,
    message: 4000,
  };
  const result = {} as Enquiry;
  for (const [key, limit] of Object.entries(limits) as [
    keyof Enquiry,
    number,
  ][]) {
    if (key === "phone" && raw[key] === undefined) {
      result.phone = "";
      continue;
    }
    if (typeof raw[key] !== "string" || raw[key].length > limit) return null;
    result[key] = raw[key].trim();
  }
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      result.requestId,
    ) ||
    !result.name ||
    !result.location ||
    result.message.length < 10 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) ||
    !enquiryProjects.includes(result.project) ||
    (raw.website !== undefined && raw.website !== "")
  )
    return null;
  return result;
}

export function enquiryDirectory() {
  const root = resolve(
    /* turbopackIgnore: true */
    process.env.DELICENT_ENQUIRY_DIR?.trim() ||
      join(process.cwd(), ".data", "delicent"),
  );
  for (const exposed of ["public", ".next", "out"]) {
    const directory = resolve(
      /* turbopackIgnore: true */ process.cwd(),
      exposed,
    );
    if (root === directory || root.startsWith(`${directory}${sep}`))
      throw new Error("Enquiry storage must not be publicly served.");
  }
  return root;
}

export async function saveEnquiry(enquiry: Enquiry) {
  const root = enquiryDirectory();
  const reference = `DEL-${createHash("sha256").update(JSON.stringify(enquiry)).digest("hex").slice(0, 16).toUpperCase()}`;
  const destination = join(root, reference);
  await mkdir(root, { recursive: true, mode: 0o700 });
  try {
    const existing = JSON.parse(
      await readFile(join(destination, "enquiry.json"), "utf8"),
    );
    return { reference, receivedAt: existing.receivedAt as string };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const staging = await mkdtemp(join(root, ".pending-"));
  const receivedAt = new Date().toISOString();
  const { requestId: _requestId, ...details } = enquiry;
  void _requestId;
  try {
    const file = await open(join(staging, "enquiry.json"), "wx", 0o600);
    try {
      await file.writeFile(
        JSON.stringify(
          { version: 1, reference, receivedAt, ...details },
          null,
          2,
        ),
      );
      await file.sync();
    } finally {
      await file.close();
    }
    const directory = await open(staging, "r");
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
    try {
      await rename(staging, destination);
    } catch (error) {
      if (
        !["EEXIST", "ENOTEMPTY"].includes(
          (error as NodeJS.ErrnoException).code || "",
        )
      )
        throw error;
      const existing = JSON.parse(
        await readFile(join(destination, "enquiry.json"), "utf8"),
      );
      return { reference, receivedAt: existing.receivedAt as string };
    }
    // Runtime data lives on a persistent volume; it must not be bundled.
    const parent = await open(/* turbopackIgnore: true */ root, "r");
    try {
      await parent.sync();
    } finally {
      await parent.close();
    }
    return { reference, receivedAt };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
