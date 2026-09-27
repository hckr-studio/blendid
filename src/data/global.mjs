export default {
  meta: {
    title: "Blendid!",
    url: "https://www.example.com/",
    description: "Awesome new static website. Such beauty. Such speed.",
    lang: "en",
    generator: "@hckr_/blendid - static site generator and assets pipeline"
  },
  get date() {
    return Temporal.ZonedDateTime.from(
      "2026-08-27T17:00:00+02:00[Europe/Prague]"
    );
  }
};
