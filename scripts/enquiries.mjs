import { registerHooks } from "node:module";
import { readdir } from "node:fs/promises";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./delicent-enquiry")
      return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});
const { enquiryDirectory } = await import("../lib/delicent-enquiry.ts");
const { enquiryEmailConfigured, readEnquiryEmailStatus, sendEnquiryEmail } =
  await import("../lib/delicent-email.ts");

const [command = "status"] = process.argv.slice(2);
if (!["status", "retry-pending"].includes(command)) {
  console.error("Usage: npm run enquiries -- status | retry-pending");
  process.exitCode = 1;
} else if (command === "retry-pending" && !enquiryEmailConfigured()) {
  console.error("Configure Postfix and set DELICENT_EMAIL_ENABLED=true first. Enquiries remain saved.");
  process.exitCode = 1;
} else {
  const references = await readdir(enquiryDirectory()).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const reference of references.filter((name) => /^DEL-[A-F0-9]{16}$/.test(name))) {
    try {
      const status = command === "retry-pending"
        ? await sendEnquiryEmail(reference)
        : await readEnquiryEmailStatus(reference);
      console.log(`${reference}: ${status.status} (${status.attempts} attempts)`);
      if (command === "retry-pending" && status.status !== "queued") process.exitCode = 1;
    } catch {
      console.error(`${reference}: could not process notification`);
      process.exitCode = 1;
    }
  }
}
