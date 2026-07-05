import { defineType, defineField } from "sanity";

export const creatorSpotlightSchema = defineType({
  name: "creatorSpotlight",
  title: "Creator Spotlight",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "providerSlug",
      title: "Provider Slug",
      type: "string",
      description: "Links to provider_profiles.slug",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "introText",
      title: "Intro Text",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "blockContent",
    }),
    defineField({
      name: "publishedAt",
      title: "Published At",
      type: "datetime",
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "providerSlug",
    },
  },
});
