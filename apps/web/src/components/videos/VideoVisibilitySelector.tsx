"use client";

import { useState } from "react";
import { updateVideoVisibility } from "@/lib/api/video-visibility";
import {
  isVisibilityEditable,
  visibilityDisabledReason,
} from "@/lib/video-editability";

type Visibility = 'PUBLIC' | 'UNLISTED' | 'PRIVATE';

type Props = {
  videoId: string;
  value: Visibility;
  status: string;
  onUpdate?: () => void;
};

const options: {
  value: Visibility;
  title: string;
  description: string;
}[] = [
  {
    value: 'PUBLIC',
    title: 'Public',
    description: 'Anyone can watch. Appears in listings and discovery.',
  },
  {
    value: 'UNLISTED',
    title: 'Unlisted',
    description: 'Anyone with the link can watch. Hidden from listings and search.',
  },
  {
    value: 'PRIVATE',
    title: 'Private',
    description: 'Only you and admins can access it.',
  },
];

export function VideoVisibilitySelector({ videoId, value, status, onUpdate }: Props) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEdit = isVisibilityEditable(status);
  const disabledReason = visibilityDisabledReason(status);

  const handleChange = async (newVisibility: Visibility) => {
    if (!canEdit || newVisibility === value) return;

    setUpdating(true);
    setError(null);

    try {
      await updateVideoVisibility(videoId, newVisibility);
      onUpdate?.();
    } catch (e: any) {
      setError(e.message || 'Failed to update visibility');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Visibility</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Control how people can access this video after publication.
        </p>
        {!canEdit && disabledReason ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            {disabledReason}
          </p>
        ) : null}
      </div>

      <div className={`space-y-2 ${!canEdit ? "opacity-60" : ""}`}>
        {options.map((option) => {
          const checked = value === option.value;
          const optionDisabled = !canEdit || updating;

          return (
            <label
              key={option.value}
              className={`block rounded-xl border p-3 transition ${
                checked
                  ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'hover:border-gray-400'
              } ${optionDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name={`video-visibility-${videoId}`}
                  className="mt-1"
                  checked={checked}
                  onChange={() => handleChange(option.value)}
                  disabled={optionDisabled}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{option.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
