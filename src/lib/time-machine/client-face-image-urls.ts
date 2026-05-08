"use client";

import { createClient } from "@/lib/supabase/client";

const FACE_IMAGE_BUCKET = "face-images";
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;
const MAX_LOADING_PHOTO_COUNT = 10;

function isSignedUrl(value: string | null): value is string {
  return typeof value === "string" && value.length > 0;
}

export async function getCurrentUserFaceImageUrlsFromBrowser() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return [];
  }

  const { data: faceImages, error: faceImagesError } = await supabase
    .from("profile_face_images")
    .select("storage_path")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(MAX_LOADING_PHOTO_COUNT);

  if (faceImagesError || !faceImages?.length) {
    return [];
  }

  const signedUrls = await Promise.all(
    faceImages.map(async ({ storage_path: storagePath }) => {
      const { data, error } = await supabase.storage
        .from(FACE_IMAGE_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRES_IN_SECONDS);

      if (error || !data.signedUrl) {
        return null;
      }

      return data.signedUrl;
    }),
  );

  return signedUrls.filter(isSignedUrl);
}
