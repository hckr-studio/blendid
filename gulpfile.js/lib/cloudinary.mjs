export async function defineLqipProperty(cloudinary) {
  try {
    await cloudinary.api.metadata_field_by_field_id("lqip");
  } catch (err) {
    await cloudinary.api.add_metadata_field({
      external_id: "lqip",
      label: "lqip",
      type: "integer"
    });
  }
}
