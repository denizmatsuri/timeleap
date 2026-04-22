'use client';

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { TablesInsert } from "@/types/database.types";

export type PhotoItemState = {
  fileName: string;
  id: string;
  previewUrl: string | null;
  storagePath: string | null;
};

type SelectedPhoto = PhotoItemState & {
  file: File | null;
};

type PhotoValidationResult =
  | {
      error: string;
    }
  | {
      photo: SelectedPhoto;
    };

const MIN_PHOTO_COUNT = 1;
const MAX_PHOTO_COUNT = 10;
const FACE_IMAGE_BUCKET = "face-images";
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function createPhotoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createUploadedPhoto(storagePath: string): SelectedPhoto {
  return {
    file: null,
    fileName: storagePath.split("/").at(-1) ?? "saved-photo",
    id: `stored-${storagePath}`,
    previewUrl: null,
    storagePath,
  };
}

function createDraftPhoto(file: File, previewUrl: string): SelectedPhoto {
  return {
    file,
    fileName: file.name,
    id: createPhotoId(),
    previewUrl,
    storagePath: null,
  };
}

function sanitizeFileBaseName(fileName: string) {
  const [baseName] = fileName.split(".");
  const sanitizedBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitizedBaseName || "face-photo";
}

function getFileExtension(file: File) {
  const [, rawExtension = ""] = file.name.split(/\.(?=[^.]+$)/);

  if (/^[a-z0-9]+$/i.test(rawExtension)) {
    return rawExtension.toLowerCase();
  }

  const mimeExtension = file.type.split("/")[1]?.toLowerCase();

  if (mimeExtension === "jpeg") {
    return "jpg";
  }

  if (mimeExtension && /^[a-z0-9]+$/.test(mimeExtension)) {
    return mimeExtension;
  }

  return "jpg";
}

function createFaceImageStoragePath(userId: string, file: File) {
  const storageKey = createPhotoId();
  const fileBaseName = sanitizeFileBaseName(file.name);
  const extension = getFileExtension(file);

  return `${userId}/${storageKey}-${fileBaseName}.${extension}`;
}

function revokePreviewUrl(previewUrl: string | null) {
  if (previewUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(previewUrl);
  }
}

function loadImage(src: string) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({ height: image.naturalHeight, width: image.naturalWidth });
    };

    image.onerror = () => {
      reject(new Error("이미지를 읽을 수 없습니다."));
    };

    image.src = src;
  });
}

async function validateSelectedFile(
  file: File,
): Promise<PhotoValidationResult> {
  if (!file.type.startsWith("image/")) {
    return { error: "이미지 파일만 업로드할 수 있어요." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "이미지는 10MB 이하로 올려 주세요." };
  }

  const previewUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(previewUrl);

    if (image.width < 512 || image.height < 512) {
      revokePreviewUrl(previewUrl);

      return { error: "최소 512px 이상의 선명한 사진이 필요해요." };
    }

    return { photo: createDraftPhoto(file, previewUrl) };
  } catch {
    revokePreviewUrl(previewUrl);

    return { error: "사진을 읽을 수 없어요. 다른 파일을 선택해 주세요." };
  }
}

function formatSelectionFeedback({
  omittedCount,
  validationMessage,
}: {
  omittedCount: number;
  validationMessage: string;
}) {
  if (validationMessage) {
    return validationMessage;
  }

  if (omittedCount > 0) {
    return `일부 사진은 제외됐어요. ${omittedCount}장을 반영하지 않았습니다.`;
  }

  return "";
}

function toPhotoItem(photo: SelectedPhoto): PhotoItemState {
  return {
    fileName: photo.fileName,
    id: photo.id,
    previewUrl: photo.previewUrl,
    storagePath: photo.storagePath,
  };
}

export function useOnboardingPhotos({
  initialPhotoPaths,
  userId,
}: {
  initialPhotoPaths: string[];
  userId: string;
}) {
  const [photos, setPhotos] = useState<SelectedPhoto[]>(() =>
    initialPhotoPaths.map(createUploadedPhoto),
  );
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoFeedback, setPhotoFeedback] = useState("");
  const [supabase] = useState(createSupabaseClient);
  const photosRef = useRef(photos);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => {
    return () => {
      photosRef.current.forEach((photo) => {
        revokePreviewUrl(photo.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    const photosToResolve = photos.filter(
      (photo) => photo.storagePath && photo.previewUrl === null,
    );

    if (photosToResolve.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      photosToResolve.map(async (photo) => {
        const { data, error } = await supabase.storage
          .from(FACE_IMAGE_BUCKET)
          .createSignedUrl(photo.storagePath ?? "", 60 * 60);

        if (cancelled || error || !data.signedUrl) {
          return;
        }

        setPhotos((currentPhotos) =>
          currentPhotos.map((currentPhoto) =>
            currentPhoto.id === photo.id
              ? { ...currentPhoto, previewUrl: data.signedUrl }
              : currentPhoto,
          ),
        );
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [photos, supabase]);

  const selectedPhotoCount = photos.length;
  const photosAreReady =
    selectedPhotoCount >= MIN_PHOTO_COUNT &&
    selectedPhotoCount <= MAX_PHOTO_COUNT;
  const primaryPhoto = photos[0]?.previewUrl ?? null;

  async function createPhotoRecord(storagePath: string) {
    const payload: TablesInsert<"profile_face_images"> = {
      storage_path: storagePath,
      user_id: userId,
    };
    const { error } = await supabase
      .from("profile_face_images")
      .insert(payload);

    if (error) {
      throw error;
    }
  }

  async function uploadPhotoFile(file: File) {
    const storagePath = createFaceImageStoragePath(userId, file);
    const { error: uploadError } = await supabase.storage
      .from(FACE_IMAGE_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    try {
      await createPhotoRecord(storagePath);
    } catch {
      await supabase.storage.from(FACE_IMAGE_BUCKET).remove([storagePath]);
      throw new Error("Failed to create photo record");
    }

    return storagePath;
  }

  async function removeUploadedPhoto(storagePath: string) {
    const { error: recordDeleteError } = await supabase
      .from("profile_face_images")
      .delete()
      .eq("user_id", userId)
      .eq("storage_path", storagePath);

    if (recordDeleteError) {
      setPhotoFeedback("사진 정보를 정리하지 못했어요. 다시 시도해 주세요.");
      return false;
    }

    const { error: storageDeleteError } = await supabase.storage
      .from(FACE_IMAGE_BUCKET)
      .remove([storagePath]);

    if (storageDeleteError) {
      setPhotoFeedback(
        "삭제한 사진 파일을 정리하지 못했어요. 다시 시도해 주세요.",
      );
    }

    return true;
  }

  async function handlePhotoSelection(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);

    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const remainingCapacity = MAX_PHOTO_COUNT - photosRef.current.length;

    if (remainingCapacity <= 0) {
      setPhotoFeedback("추가로 반영할 수 있는 사진이 없어요.");
      return;
    }

    const acceptedFiles = files.slice(0, remainingCapacity);
    const omittedCount = files.length - acceptedFiles.length;
    const nextPhotos: SelectedPhoto[] = [];
    let validationMessage = "";

    for (const file of acceptedFiles) {
      const result = await validateSelectedFile(file);

      if ("error" in result) {
        validationMessage ||= result.error;
        continue;
      }

      nextPhotos.push(result.photo);
    }

    if (nextPhotos.length > 0) {
      setPhotos((currentPhotos) => [...currentPhotos, ...nextPhotos]);
    }

    setPhotoFeedback(
      formatSelectionFeedback({
        omittedCount,
        validationMessage,
      }),
    );
  }

  async function uploadPendingPhotos() {
    const currentPhotos = photosRef.current;

    if (currentPhotos.length < MIN_PHOTO_COUNT) {
      setPhotoFeedback("얼굴 사진을 먼저 업로드해 주세요.");
      return false;
    }

    if (currentPhotos.length > MAX_PHOTO_COUNT) {
      setPhotoFeedback("사진 구성을 다시 확인해 주세요.");
      return false;
    }

    const draftPhotos = currentPhotos.filter(
      (photo) => photo.file !== null,
    );

    if (draftPhotos.length === 0) {
      setPhotoFeedback("");
      return true;
    }

    setPhotoFeedback("");
    setIsUploadingPhotos(true);

    try {
      for (const draftPhoto of draftPhotos) {
        try {
          const storagePath = await uploadPhotoFile(draftPhoto.file as File);

          setPhotos((currentPhotos) =>
            currentPhotos.map((photo) =>
              photo.id === draftPhoto.id
                ? { ...photo, file: null, storagePath }
                : photo,
            ),
          );
        } catch {
          setPhotoFeedback("사진을 업로드하지 못했어요. 다시 시도해 주세요.");
          return false;
        }
      }

      return true;
    } finally {
      setIsUploadingPhotos(false);
    }
  }

  async function handleRemovePhoto(photo: PhotoItemState) {
    if (isUploadingPhotos) {
      setPhotoFeedback("사진 업로드가 끝난 뒤 삭제할 수 있어요.");
      return;
    }

    if (!photo.storagePath) {
      revokePreviewUrl(photo.previewUrl);
      setPhotos((currentPhotos) =>
        currentPhotos.filter((currentPhoto) => currentPhoto.id !== photo.id),
      );
      setPhotoFeedback("");
      return;
    }

    const removed = await removeUploadedPhoto(photo.storagePath);

    if (!removed) {
      return;
    }

    revokePreviewUrl(photo.previewUrl);
    setPhotos((currentPhotos) =>
      currentPhotos.filter((currentPhoto) => currentPhoto.id !== photo.id),
    );
    setPhotoFeedback("");
  }

  function openFilePicker() {
    uploadInputRef.current?.click();
  }

  return {
    handlePhotoSelection,
    handleRemovePhoto,
    isUploadingPhotos,
    openFilePicker,
    photoFeedback,
    photos: photos.map(toPhotoItem),
    photosAreReady,
    primaryPhoto,
    selectedPhotoCount,
    uploadPendingPhotos,
    uploadInputRef,
  };
}
