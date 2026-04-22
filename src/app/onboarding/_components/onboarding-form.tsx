'use client';

import { useActionState, useState, useTransition } from "react";
import {
  AGE_RANGE_OPTIONS,
  GENDER_OPTIONS,
} from "@/lib/auth/profile-options";
import {
  completeOnboarding,
  saveOnboardingProfileDraft,
  type OnboardingDraftResult,
  type OnboardingFormState,
} from "@/actions/auth";
import OnboardingFormHeader from "./onboarding-form-header";
import PassportPreviewStep from "./passport-preview-step";
import PhotoUploadStep from "./photo-upload-step";
import ProfileStep from "./profile-step";
import { useOnboardingPhotos } from "./use-onboarding-photos";

type OnboardingFormProps = {
  defaultValues: {
    ageRange: string;
    displayName: string;
    gender: string;
  };
  initialPhotoPaths: string[];
  userEmail: string;
  userId: string;
};

type Step = 0 | 1 | 2;
type ProfileValues = OnboardingFormProps["defaultValues"];
type ProfileField = keyof ProfileValues;

const INITIAL_STATE: OnboardingFormState = {
  error: undefined,
  fieldErrors: {},
};
const EMPTY_PHOTO_ERROR = "얼굴 사진을 먼저 업로드해 주세요.";

function formatIssueDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function toLabelMap(
  options: ReadonlyArray<{ label: string; value: string }>,
) {
  return Object.fromEntries(
    options.map((option) => [option.value, option.label]),
  ) as Record<string, string>;
}

const GENDER_LABELS = toLabelMap(GENDER_OPTIONS);
const AGE_RANGE_LABELS = toLabelMap(AGE_RANGE_OPTIONS);

function getPassengerName({
  displayName,
  fallbackEmail,
}: {
  displayName: string;
  fallbackEmail: string;
}) {
  const trimmedName = displayName.trim();

  if (trimmedName.length > 0) {
    return trimmedName;
  }

  const [localPart] = fallbackEmail.split("@");
  return localPart || "traveler";
}

function getInitialStep({
  profile,
  initialPhotoPaths,
}: {
  initialPhotoPaths: string[];
  profile: ProfileValues;
}): Step {
  if (initialPhotoPaths.length === 0) {
    return 0;
  }

  if (
    profile.displayName.trim().length > 0 &&
    profile.gender.trim().length > 0 &&
    profile.ageRange.trim().length > 0
  ) {
    return 2;
  }

  return 1;
}

export default function OnboardingForm({
  defaultValues,
  initialPhotoPaths,
  userEmail,
  userId,
}: OnboardingFormProps) {
  const [state, action, pending] = useActionState(
    completeOnboarding,
    INITIAL_STATE,
  );
  const [profile, setProfile] = useState(defaultValues);
  const [step, setStep] = useState<Step>(() =>
    getInitialStep({
      initialPhotoPaths,
      profile: defaultValues,
    }),
  );
  const [furthestStepReached, setFurthestStepReached] = useState<Step>(() =>
    getInitialStep({
      initialPhotoPaths,
      profile: defaultValues,
    }),
  );
  const [draftState, setDraftState] = useState<OnboardingDraftResult>({});
  const [isSavingDraft, startSavingDraft] = useTransition();
  const {
    handlePhotoSelection,
    handleRemovePhoto,
    isUploadingPhotos,
    openFilePicker,
    photoFeedback,
    photos,
    photosAreReady,
    primaryPhoto,
    selectedPhotoCount,
    uploadPendingPhotos,
    uploadInputRef,
  } = useOnboardingPhotos({ initialPhotoPaths, userId });

  const profileFieldErrors = {
    ageRange: draftState.fieldErrors?.ageRange ?? state.fieldErrors?.ageRange,
    displayName:
      draftState.fieldErrors?.displayName ?? state.fieldErrors?.displayName,
    gender: draftState.fieldErrors?.gender ?? state.fieldErrors?.gender,
  };
  const hasProfileFieldErrors = Boolean(
    profileFieldErrors.displayName ||
      profileFieldErrors.gender ||
      profileFieldErrors.ageRange,
  );
  const photoError =
    state.fieldErrors?.photos === EMPTY_PHOTO_ERROR && photos.length > 0
      ? undefined
      : state.fieldErrors?.photos;
  const currentStep = photoError ? 0 : step;
  const maxSelectableStep = photoError ? 0 : furthestStepReached;
  const profileIsReady =
    profile.displayName.trim().length > 0 &&
    profile.gender.length > 0 &&
    profile.ageRange.length > 0;
  const passengerName = getPassengerName({
    displayName: profile.displayName,
    fallbackEmail: userEmail,
  });
  const issueDate = formatIssueDate();

  function handleProfileFieldChange(field: ProfileField, value: string) {
    setProfile((currentProfile) => ({
      ...currentProfile,
      [field]: value,
    }));
    setDraftState((currentState) => ({
      ...currentState,
      error: undefined,
      fieldErrors: {
        ...currentState.fieldErrors,
        [field]: undefined,
      },
    }));
  }

  function handleProfileNextStep() {
    startSavingDraft(async () => {
      const nextDraftState = await saveOnboardingProfileDraft(profile);

      setDraftState(nextDraftState);

      if (!nextDraftState.error && !nextDraftState.fieldErrors) {
        setStep(2);
        setFurthestStepReached(2);
      }
    });
  }

  async function handlePhotoNextStep() {
    const uploadSucceeded = await uploadPendingPhotos();

    if (uploadSucceeded) {
      setStep(1);
      setFurthestStepReached((currentStep) =>
        currentStep < 1 ? 1 : currentStep,
      );
    }
  }

  function handleStepSelect(targetStep: number) {
    if (targetStep > maxSelectableStep) {
      return;
    }

    setStep(targetStep as Step);
  }

  return (
    <form
      action={action}
      className="bg-paper relative overflow-hidden rounded-[32px] shadow-[0_24px_60px_-20px_rgba(0,0,0,.18),0_4px_16px_rgba(0,0,0,.07)]"
    >
      <input name="displayName" type="hidden" value={profile.displayName} />
      <input name="gender" type="hidden" value={profile.gender} />
      <input name="ageRange" type="hidden" value={profile.ageRange} />

      <OnboardingFormHeader
        currentStep={currentStep}
        maxSelectableStep={maxSelectableStep}
        onStepSelect={handleStepSelect}
        passengerName={passengerName}
        photoCount={selectedPhotoCount}
      />

      <div className="space-y-7 px-6 py-6 lg:px-7">
        {currentStep === 0 ? (
          <PhotoUploadStep
            onNextStep={() => {
              void handlePhotoNextStep();
            }}
            onOpenFilePicker={openFilePicker}
            onPhotoSelection={handlePhotoSelection}
            onRemovePhoto={handleRemovePhoto}
            photoError={photoError}
            photoFeedback={photoFeedback}
            photos={photos}
            photosAreReady={photosAreReady}
            selectedPhotoCount={selectedPhotoCount}
            uploadPending={isUploadingPhotos}
            uploadInputRef={uploadInputRef}
          />
        ) : null}

        {currentStep === 1 ? (
          <ProfileStep
            draftError={draftState.error}
            errors={profileFieldErrors}
            onFieldChange={handleProfileFieldChange}
            onNextStep={handleProfileNextStep}
            onPreviousStep={() => {
              setStep(0);
            }}
            profile={profile}
            profileIsReady={profileIsReady}
            savePending={isSavingDraft}
          />
        ) : null}

        {currentStep === 2 ? (
          <PassportPreviewStep
            ageRangeLabel={AGE_RANGE_LABELS[profile.ageRange] ?? "미입력"}
            genderLabel={GENDER_LABELS[profile.gender] ?? "미입력"}
            hasProfileFieldErrors={hasProfileFieldErrors}
            issueDate={issueDate}
            onPreviousStep={() => {
              setStep(1);
            }}
            passengerName={passengerName}
            pending={pending}
            photoError={photoError}
            primaryPhoto={primaryPhoto}
            serverError={state.error}
          />
        ) : null}
      </div>
    </form>
  );
}
