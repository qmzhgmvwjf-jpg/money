import React, { useEffect, useRef, useState } from "react";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { formatCurrency } from "../../utils/format";

function ShortFeedCard({ post, onOpenStore, onOrder }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsActive(entry.isIntersecting && entry.intersectionRatio >= 0.72);
      },
      { threshold: [0.3, 0.72, 1] }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  return (
    <article ref={containerRef} className="short-feed-card">
      <div className="short-feed-card__media">
        <video
          ref={videoRef}
          className="short-feed-card__video"
          src={post.video_url}
          poster={post.thumbnail_url || undefined}
          muted
          loop
          playsInline
          preload="metadata"
        />
        <div className="short-feed-card__overlay" />

        <div className="short-feed-card__badge-row">
          <Badge tone="primary">{post.feed_reason || "추천 피드"}</Badge>
          {post.event_label && <Badge tone="warning">{post.event_label}</Badge>}
        </div>

        <div className="short-feed-card__content">
          <div className="short-feed-card__meta">
            <p className="short-feed-card__eyebrow">{post.store_name}</p>
            <h3>{post.title}</h3>
            <p>{post.caption}</p>
            <div className="short-feed-card__tags">
              {post.menu_name && <Badge tone="secondary">{post.menu_name}</Badge>}
              {post.price ? <Badge tone="secondary">{formatCurrency(post.price)}</Badge> : null}
              <Badge tone="secondary">{post.views?.toLocaleString() || 0} views</Badge>
            </div>
          </div>

          <div className="short-feed-card__actions">
            <button
              type="button"
              className={`short-feed-card__icon-button ${liked ? "is-active" : ""}`}
              onClick={() => setLiked((value) => !value)}
            >
              <span>♥</span>
              <strong>{(post.likes || 0) + (liked ? 1 : 0)}</strong>
            </button>
            <button
              type="button"
              className={`short-feed-card__icon-button ${saved ? "is-active" : ""}`}
              onClick={() => setSaved((value) => !value)}
            >
              <span>★</span>
              <strong>{(post.saves || 0) + (saved ? 1 : 0)}</strong>
            </button>
            <div className="short-feed-card__icon-button">
              <span>💬</span>
              <strong>{post.comments || 0}</strong>
            </div>
            <div className="short-feed-card__icon-button">
              <span>↗</span>
              <strong>{post.shares || 0}</strong>
            </div>
          </div>
        </div>

        <div className="short-feed-card__footer">
          <Button variant="secondary" onClick={() => onOpenStore(post.store_id)}>
            가게 보기
          </Button>
          <Button onClick={() => onOrder(post.store_id)}>지금 주문하기</Button>
        </div>
      </div>
    </article>
  );
}

export default ShortFeedCard;
