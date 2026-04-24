type GenerateImagePromptInput = {
  ageRange?: string | null;
  city: string;
  countryEnglishName: string;
  countryName: string;
  eraHeadline: string;
  eraTitle: string;
  eraYear: string;
  gender?: string | null;
  mood: string;
  motifs: readonly string[];
  referenceImageCount: number;
  sceneNote: string;
  sceneTitle: string;
  soundtrack: string;
  texture: string;
  wardrobe: string;
};

export function buildGenerateImagePrompt({
  ageRange,
  city,
  countryEnglishName,
  countryName,
  eraHeadline,
  eraTitle,
  eraYear,
  gender,
  mood,
  motifs,
  referenceImageCount,
  sceneNote,
  sceneTitle,
  soundtrack,
  texture,
  wardrobe,
}: GenerateImagePromptInput) {
  const optionalProfileHints = [gender, ageRange].filter(Boolean).join(", ");

  return `
Create one vertical 4:5 hero photograph for a time-travel diary.

The reference images show the same real person. Preserve identity, facial structure, skin tone, overall likeness, and hair silhouette from the ${referenceImageCount} reference image(s). Do not create a different person.

Setting:
- Country: ${countryName} (${countryEnglishName})
- City: ${city}
- Year: ${eraYear}
- Era title: ${eraTitle}
- Era headline: ${eraHeadline}
- Scene: ${sceneTitle}
- Scene detail: ${sceneNote}
- Mood: ${mood}
- Wardrobe: ${wardrobe}
- Texture and material cues: ${texture}
- Background motifs: ${motifs.join(", ")}
- Sound and atmosphere cue: ${soundtrack}
${optionalProfileHints ? `- Subject hints: ${optionalProfileHints}` : ""}

Direction:
- The image should feel like a premium travel diary hero frame, not a movie poster.
- Use believable documentary-meets-editorial photography.
- Show a single main subject in the scene, naturally integrated into the historical setting.
- The subject should look like they truly belong in ${eraYear} ${city}.
- Keep the frame elegant, cinematic, and emotionally readable at first glance.
- Favor natural posing, period-correct styling, realistic lighting, and rich environmental detail.
- Use historically plausible signage, architecture, props, and clothing for ${eraYear} ${countryName}.

Hard constraints:
- No modern smartphones, tablets, LEDs, modern cars, modern fashion branding, or futuristic objects.
- No text overlays, subtitles, posters with readable English marketing copy, watermarks, or borders.
- No duplicate faces, no extra people crowding the foreground, no collage layout.
- Avoid exaggerated fantasy, cosplay, plastic skin, uncanny face swaps, or cartoon styling.

Return the best single hero image for this diary entry.
`.trim();
}
