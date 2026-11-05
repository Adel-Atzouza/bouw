import { forwardStoredIntake, intakeDirectory, listStoredIntakes, readDelivery, readStoredIntake } from "../lib/intake-server.ts";

const [command = "list", reference] = process.argv.slice(2);
if (command === "list") {
  const records = await listStoredIntakes();
  console.log(`Opgeslagen aanvragen: ${intakeDirectory()}`);
  console.table(await Promise.all(records.map(async (record) => ({
    kenmerk: record.reference,
    ontvangen: record.receivedAt,
    naam: record.answers["contact.name"],
    email: record.answers["contact.email"],
    bijlagen: record.attachments.length,
    doorgestuurd: (await readDelivery(record.reference)).status === "delivered" ? "ja" : "nog niet",
  }))));
} else if (command === "show" && reference) {
  const record = await readStoredIntake(reference);
  if (!record) { console.error("Aanvraag niet gevonden."); process.exitCode = 1; }
  else console.log(JSON.stringify({ ...record, delivery: await readDelivery(reference) }, null, 2));
} else if (command === "retry-pending") {
  if (!process.env.INTAKE_WEBHOOK_URL || !process.env.INTAKE_WEBHOOK_TOKEN) {
    console.error("Stel eerst INTAKE_WEBHOOK_URL en INTAKE_WEBHOOK_TOKEN in. Uw aanvragen blijven opgeslagen.");
    process.exitCode = 1;
  } else {
    for (const record of await listStoredIntakes()) {
      if ((await readDelivery(record.reference)).status === "delivered") continue;
      await forwardStoredIntake(record);
      const result = await readDelivery(record.reference);
      console.log(`${record.reference}: ${result.status}`);
      if (result.status !== "delivered") process.exitCode = 1;
    }
  }
} else {
  console.error("Gebruik: npm run intakes -- list | show BAH-… | retry-pending");
  process.exitCode = 1;
}
