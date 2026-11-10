// Only verified business details belong here. Empty settings are not rendered.
export const business = {
  name: "Dèlicent",
  email: process.env.NEXT_PUBLIC_DELICENT_EMAIL?.trim() || "",
  phone: process.env.NEXT_PUBLIC_DELICENT_PHONE?.trim() || "",
  address: process.env.NEXT_PUBLIC_DELICENT_ADDRESS?.trim() || "",
  kvk: process.env.NEXT_PUBLIC_DELICENT_KVK?.trim() || "",
  vat: process.env.NEXT_PUBLIC_DELICENT_VAT?.trim() || "",
};
export type Business = typeof business;
export { projectTypes } from "./delicent-services.mjs";
