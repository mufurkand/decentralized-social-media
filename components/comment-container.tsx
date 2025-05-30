"use client";

import { useState, useEffect, useCallback } from "react";
import Comment from "./comment";
import { SendHorizonal, Settings } from "lucide-react";
import blockchainService from "@/lib/blockchain/contracts";
import { useBlockchain } from "@/lib/blockchain/BlockchainContext";

interface Comment {
  id: number;
  postId: number;
  author: string;
  content: string;
  timestamp: number;
  likesCount: number;
  isDeleted: boolean;
  isLikedByUser?: boolean;
}

interface CommentContainerProps {
  showCommentInput?: boolean;
  postId?: number;
  user?: string;
}

export default function CommentContainer({
  showCommentInput = true,
  postId,
  user,
}: CommentContainerProps) {
  const { isConnected, userAddress } = useBlockchain();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (postId === undefined) return;

    try {
      setLoading(true);
      const commentIds = await blockchainService.getPostComments(postId);

      if (!commentIds || commentIds.length === 0) {
        setComments([]);
        return;
      }

      const commentPromises = commentIds.map(async (id: number) => {
        try {
          const comment = await blockchainService.getComment(id);
          if (!comment) return null;

          let isLikedByUser = false;
          if (userAddress) {
            try {
              isLikedByUser = await blockchainService.hasLikedComment(
                userAddress,
                id
              );
            } catch (error) {
              console.error(
                `Error checking like status for comment ${id}:`,
                error
              );
            }
          }

          return comment ? { id, ...comment, isLikedByUser } : null;
        } catch (error) {
          console.error(`Error loading comment ${id}:`, error);
          return null;
        }
      });

      const commentResults = await Promise.all(commentPromises);
      setComments(
        commentResults.filter(
          (comment) => comment && !comment.isDeleted
        ) as Comment[]
      );
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  }, [postId, userAddress]);

  const loadUserComments = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await blockchainService.getCommentsByUser(user, 0, 50);

      if (!result.commentIds || result.commentIds.length === 0) {
        setComments([]);
        return;
      }

      const commentPromises = result.commentIds.map(async (id: number) => {
        try {
          const comment = await blockchainService.getComment(id);
          if (!comment) return null;

          let isLikedByUser = false;
          if (userAddress) {
            try {
              isLikedByUser = await blockchainService.hasLikedComment(
                userAddress,
                id
              );
            } catch (error) {
              console.error(
                `Error checking like status for comment ${id}:`,
                error
              );
            }
          }

          return comment ? { id, ...comment, isLikedByUser } : null;
        } catch (error) {
          console.error(`Error loading comment ${id}:`, error);
          return null;
        }
      });

      const commentResults = await Promise.all(commentPromises);
      setComments(
        commentResults.filter(
          (comment) => comment && !comment.isDeleted
        ) as Comment[]
      );
    } catch (error) {
      console.error("Error loading user comments:", error);
    } finally {
      setLoading(false);
    }
  }, [user, userAddress]);
  useEffect(() => {
    if (isConnected) {
      if (user) {
        // Load comments by user takes priority if both are provided
        loadUserComments();
      } else if (postId !== undefined) {
        // Load comments for a specific post
        loadComments();
      }
    }
  }, [isConnected, postId, user, loadComments, loadUserComments]);

  const handleAddComment = async () => {
    if (!isConnected) {
      alert("Please connect to MetaMask first");
      return;
    }

    if (!commentContent.trim()) {
      alert("Please enter a comment");
      return;
    }

    if (postId === undefined) {
      alert("Post ID is required");
      return;
    }

    try {
      setLoadingAction("add-comment");
      const commentId = await blockchainService.createComment(
        postId,
        commentContent
      );

      if (commentId !== null) {
        // Clear input
        setCommentContent("");

        // Get the new comment and add it to state
        const newComment = await blockchainService.getComment(commentId);
        if (newComment) {
          setComments([...comments, { id: commentId, ...newComment, isLikedByUser: false }]);
        } else {
          // If we couldn't fetch the new comment, create a locally constructed comment
          // This is particularly useful for the first comment by new users
          const localComment: Comment = {
            id: commentId,
            postId: postId,
            author: userAddress || "",
            content: commentContent,
            timestamp: Math.floor(Date.now() / 1000), // Current timestamp in seconds
            likesCount: 0,
            isDeleted: false,
            isLikedByUser: false
          };
          
          setComments([...comments, localComment]);
          
          // Also trigger a reload after a slight delay to ensure data consistency
          setTimeout(() => {
            loadComments();
          }, 2000);
        }
      }
    } catch (error) {
      console.error("Error adding comment:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoadingAction(null);
    }
  };
  const handleLikeComment = async (
    commentId: number,
    alreadyLiked: boolean
  ) => {
    if (!isConnected) {
      alert("Please connect to MetaMask first");
      return;
    }

    try {
      setLoadingAction(`like-comment-${commentId}`);

      if (alreadyLiked) {
        // Unlike the comment
        await blockchainService.unlikeComment(commentId);

        // Update comment in local state
        setComments(
          comments.map((comment) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likesCount: Math.max(0, comment.likesCount - 1),
                isLikedByUser: false,
              };
            }
            return comment;
          })
        );
      } else {
        // Like the comment
        await blockchainService.likeComment(commentId);

        // Update comment in local state
        setComments(
          comments.map((comment) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likesCount: comment.likesCount + 1,
                isLikedByUser: true,
              };
            }
            return comment;
          })
        );
      }
    } catch (error) {
      console.error(
        `Error ${alreadyLiked ? "unliking" : "liking"} comment:`,
        error
      );
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!isConnected) {
      alert("Please connect to MetaMask first");
      return;
    }

    try {
      setLoadingAction(`delete-comment-${commentId}`);
      const success = await blockchainService.deleteComment(commentId);

      if (success) {
        // Remove the comment from the UI
        setComments(comments.filter((comment) => comment.id !== commentId));
      } else {
        alert("Failed to delete the comment. Please try again.");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="flex flex-col flex-6 gap-6">
      {showCommentInput && !user && (
        <div className="flex gap-2 items-end">
          <textarea
            className="bg-theme-primary-muted rounded-lg flex-grow resize-none h-36 p-2"
            name="comment"
            id="comment"
            placeholder="Write a comment..."
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
          ></textarea>
          <div className="flex flex-col gap-2 bg-theme-secondary-muted p-2 rounded-lg">
            <button className="bg-theme-accent p-1 rounded-full">
              <Settings />
            </button>
            <button
              className="bg-theme-accent p-1 rounded-full"
              onClick={handleAddComment}
              disabled={loadingAction === "add-comment"}
            >
              <SendHorizonal />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p>Loading comments...</p>
      ) : comments.length > 0 ? (
        comments.map((comment) => (
          <Comment
            key={comment.id}
            id={comment.id}
            author={comment.author}
            content={comment.content}
            timestamp={comment.timestamp}
            likesCount={comment.likesCount}
            isLikedByUser={comment.isLikedByUser || false}
            onLike={handleLikeComment}
            onDelete={handleDeleteComment}
            loading={
              loadingAction === `like-comment-${comment.id}` ||
              loadingAction === `delete-comment-${comment.id}`
            }
          />
        ))
      ) : (
        <p>{user ? `No comments from this user yet` : `No comments yet`}</p>
      )}
    </div>
  );
}
