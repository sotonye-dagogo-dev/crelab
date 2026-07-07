"use client";

import { Star } from "lucide-react";
import type { IReview } from "@/types";

interface ReviewWithMeta extends IReview {
  reviewerName: string;
  reviewerAvatar: string | null;
  verifiedBooking: boolean;
}

interface ReviewsSectionProps {
  reviews: ReviewWithMeta[];
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  if (reviews.length === 0) return null;

  const avgRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-[family-name:var(--font-display)] font-bold text-[18px] text-[var(--color-text-primary)]">
          Reviews
        </h2>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={14}
              fill={star <= Math.round(avgRating) ? "var(--color-accent)" : "var(--color-border)"}
              color="var(--color-accent)"
              strokeWidth={1}
            />
          ))}
          <span className="text-[13px] text-[var(--color-text-secondary)] ml-1">
            {avgRating.toFixed(1)} ({reviews.length})
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-[8px] bg-[var(--color-surface-raised)] flex items-center justify-center text-[13px] font-semibold text-[var(--color-text-secondary)] shrink-0">
                {review.reviewerName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[13px] text-[var(--color-text-primary)]">
                    {review.reviewerName}
                  </span>
                  {review.verifiedBooking && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-[rgba(74,222,128,0.1)] text-[10px] font-medium text-[var(--color-success)]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      Verified Booking
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={12}
                      fill={star <= review.rating ? "var(--color-accent)" : "var(--color-border)"}
                      color="var(--color-accent)"
                      strokeWidth={1}
                    />
                  ))}
                </div>
                {review.body && (
                  <p className="text-[13px] text-[var(--color-text-secondary)] mt-2">
                    {review.body}
                  </p>
                )}
                <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1.5">
                  {new Date(review.createdAt).toLocaleDateString("en-NG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
