"use client";

import { FormEvent, useEffect, useState } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
import { api } from "@/lib/client/api";
import type { Comment, Photo } from "@/lib/types";

type Props = {
  photo: Photo;
  badge?: string;
  onChanged?: (photo: Photo) => void;
  extra?: React.ReactNode;
};

export default function PhotoCard({ photo, badge, onChanged, extra }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    api<{ comments: Comment[] }>(`/api/photos/${photo.id}/comments`)
      .then((data) => setComments(data.comments))
      .catch(() => setComments([]));
  }, [open, photo.id]);

  async function toggleLike() {
    const data = await api<{ liked: boolean; likeCount: number }>(`/api/photos/${photo.id}/like`, {
      method: "POST",
    });
    onChanged?.({ ...photo, likedByMe: data.liked, likeCount: data.likeCount });
  }

  async function share() {
    const url = `${window.location.origin}/spots/${photo.spotId}?photo=${photo.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: photo.caption || "SkateSpotter", url });
        return;
      }
    } catch {
      /* fall through to copy */
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const data = await api<{ comment: Comment }>(`/api/photos/${photo.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: draft }),
      });
      setComments((list) => [...list, data.comment]);
      setDraft("");
      onChanged?.({ ...photo, commentCount: photo.commentCount + 1 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-elev sm:rounded-3xl">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption || "Spot photo"}
          className="aspect-[4/5] w-full object-cover sm:aspect-square"
        />
        {badge ? (
          <div className="absolute left-3 top-3 rounded-full bg-gold px-3 py-1 font-display text-sm tracking-wide text-ink">
            {badge}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-1 px-1 py-1">
        <button
          type="button"
          onClick={toggleLike}
          className={`flex min-h-11 min-w-11 items-center gap-1.5 rounded-full px-3 text-sm ${
            photo.likedByMe ? "text-blaze" : "text-paper"
          }`}
        >
          <Heart size={20} fill={photo.likedByMe ? "currentColor" : "none"} />
          {photo.likeCount}
        </button>
        <button
          type="button"
          onClick={() =>
            setOpen((v) => {
              const next = !v;
              if (next) {
                queueMicrotask(() => {
                  document.getElementById(`comments-${photo.id}`)?.scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                  });
                });
              }
              return next;
            })
          }
          className="flex min-h-11 min-w-11 items-center gap-1.5 rounded-full px-3 text-sm text-paper"
        >
          <MessageCircle size={20} />
          {photo.commentCount}
        </button>
        <button
          type="button"
          onClick={share}
          className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-paper"
        >
          <Share2 size={20} />
          {copied ? "Copied" : "Share"}
        </button>
        <div className="ml-auto shrink-0">{extra}</div>
      </div>
      <div className="px-4 pb-4">
        <p className="text-sm text-mute">
          <span className="font-medium text-paper">{photo.createdByName}</span>
          {photo.caption ? ` ${photo.caption}` : ""}
        </p>
        {open ? (
          <div id={`comments-${photo.id}`} className="mt-3 space-y-2">
            {comments.map((comment) => (
              <p key={comment.id} className="text-sm">
                <span className="font-medium">{comment.userName}</span>{" "}
                <span className="text-mute">{comment.body}</span>
              </p>
            ))}
            {comments.length === 0 ? (
              <p className="text-sm text-mute">No comments yet.</p>
            ) : null}
            <form onSubmit={submitComment} className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a comment…"
                className="min-h-11 min-w-0 flex-1 rounded-full border border-line bg-ink px-4 text-base outline-none placeholder:text-mute"
              />
              <button
                disabled={busy}
                className="min-h-11 rounded-full bg-paper px-4 text-sm font-medium text-ink"
              >
                Post
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </article>
  );
}
