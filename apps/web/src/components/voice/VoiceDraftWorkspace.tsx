/**
 * T-16.5: Voice draft UI — split pane in Creator workspace
 * Left: scrollable transcript with timestamps
 * Right: AI article preview
 * Highlighted diffs in yellow
 */

'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { TranscriptSegment, StructuredTranscript } from '@chiselgrid/types';
import type { ContentBlock } from '@chiselgrid/types';

interface VoiceDraftWorkspaceProps {
  voiceId: string;
  transcript: {
    fullText: string;
    segments: TranscriptSegment[];
    languageCode: string;
  };
  structuredTranscript?: StructuredTranscript;
  articleBlocks?: ContentBlock[];
  onApprove?: () => void;
  onReject?: (feedback: string) => void;
}

export function VoiceDraftWorkspace({
  voiceId,
  transcript,
  structuredTranscript,
  articleBlocks,
  onApprove,
  onReject,
}: VoiceDraftWorkspaceProps) {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [showDiffs, setShowDiffs] = useState(true);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Group segments into sentences for readable display
  const sentences = useMemo(() => {
    const result: Array<{
      text: string;
      startTime: number;
      endTime: number;
      confidence: number;
    }> = [];

    let current = { text: '', startTime: 0, endTime: 0, confidenceSum: 0, count: 0 };

    for (const seg of transcript.segments) {
      if (seg.type === 'punctuation') {
        current.text += seg.content;
        if ('.!?'.includes(seg.content)) {
          result.push({
            text: current.text.trim(),
            startTime: current.startTime,
            endTime: current.endTime,
            confidence: current.count > 0 ? current.confidenceSum / current.count : 0,
          });
          current = { text: '', startTime: 0, endTime: 0, confidenceSum: 0, count: 0 };
        }
      } else {
        if (!current.text) {
          current.startTime = seg.startTime;
        }
        current.text += (current.text ? ' ' : '') + seg.content;
        current.endTime = seg.endTime;
        current.confidenceSum += seg.confidence;
        current.count++;
      }
    }

    // Push remaining text
    if (current.text.trim()) {
      result.push({
        text: current.text.trim(),
        startTime: current.startTime,
        endTime: current.endTime,
        confidence: current.count > 0 ? current.confidenceSum / current.count : 0,
      });
    }

    return result;
  }, [transcript.segments]);

  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Find words that appear in the article but not in the transcript (additions)
  const articleFullText = useMemo(() => {
    if (!articleBlocks) return '';
    return articleBlocks
      .filter((b): b is ContentBlock & { content: string } => 'content' in b)
      .map((b) => b.content)
      .join(' ');
  }, [articleBlocks]);

  const handleReject = useCallback(() => {
    if (rejectFeedback.trim()) {
      onReject?.(rejectFeedback);
      setShowRejectModal(false);
      setRejectFeedback('');
    }
  }, [rejectFeedback, onReject]);

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Voice Draft
          </h2>
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {transcript.languageCode}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {voiceId.slice(0, 8)}...
          </span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={showDiffs}
              onChange={(e) => setShowDiffs(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show diffs
          </label>
          {onApprove && (
            <button
              onClick={onApprove}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
          )}
          {onReject && (
            <button
              onClick={() => setShowRejectModal(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
          )}
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Transcript */}
        <div
          ref={transcriptRef}
          className="w-1/2 overflow-y-auto border-r border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Transcript
          </h3>

          {/* Structured sections if available */}
          {structuredTranscript ? (
            <div className="space-y-6">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {structuredTranscript.fillerWordsRemoved} filler words removed
              </div>
              {structuredTranscript.sections.map((section, idx) => (
                <div key={idx} className="space-y-2">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {section.title}
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {section.content}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {section.keyPoints.map((point, pidx) => (
                      <span
                        key={pidx}
                        className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatTime(section.startTime)} - {formatTime(section.endTime)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            /* Raw transcript with timestamps */
            <div className="space-y-3">
              {sentences.map((sentence, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 p-2 rounded transition-colors cursor-pointer ${
                    activeSegmentIndex === idx
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => setActiveSegmentIndex(idx)}
                >
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono whitespace-nowrap pt-1">
                    {formatTime(sentence.startTime)}
                  </span>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed flex-1">
                    {sentence.text}
                  </p>
                  {sentence.confidence < 0.8 && (
                    <span className="text-xs text-amber-500 whitespace-nowrap pt-1">
                      {Math.round(sentence.confidence * 100)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Article Preview */}
        <div className="w-1/2 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            AI Article Preview
          </h3>

          {articleBlocks ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {articleBlocks.map((block, idx) => (
                <ArticleBlockPreview
                  key={idx}
                  block={block}
                  showDiffs={showDiffs}
                  transcriptText={transcript.fullText}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-600">
              <div className="text-center">
                <div className="text-4xl mb-4">...</div>
                <p className="text-sm">Article is being generated from your transcript</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Reject Draft
            </h3>
            <textarea
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              placeholder="Provide feedback for revision..."
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectFeedback.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                Reject with Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Article Block Preview with diff highlighting ---

function ArticleBlockPreview({
  block,
  showDiffs,
  transcriptText,
}: {
  block: ContentBlock;
  showDiffs: boolean;
  transcriptText: string;
}) {
  const transcriptLower = transcriptText.toLowerCase();

  function highlightAdditions(text: string): React.ReactNode {
    if (!showDiffs) return text;

    // Split into sentences and check which ones have content not in transcript
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences.map((sentence, idx) => {
      // Check if key phrases from this sentence appear in the transcript
      const words = sentence.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      const matchCount = words.filter((w) => transcriptLower.includes(w)).length;
      const matchRatio = words.length > 0 ? matchCount / words.length : 1;

      // If less than 30% of significant words match, it's likely an AI addition
      if (matchRatio < 0.3 && words.length > 3) {
        return (
          <span key={idx}>
            <mark className="bg-yellow-200 dark:bg-yellow-900/40 px-0.5 rounded">
              {sentence}
            </mark>{' '}
          </span>
        );
      }
      return <span key={idx}>{sentence} </span>;
    });
  }

  switch (block.type) {
    case 'heading':
      const Tag = `h${block.level}` as keyof JSX.IntrinsicElements;
      return <Tag>{block.content}</Tag>;

    case 'text':
      return <p>{highlightAdditions(block.content)}</p>;

    case 'code':
      return (
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
          <code>{block.content}</code>
        </pre>
      );

    case 'callout':
      const variantColors = {
        info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
        warning: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
        danger: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
      };
      return (
        <div className={`p-4 border-l-4 rounded-r-lg ${variantColors[block.variant]}`}>
          {highlightAdditions(block.content)}
        </div>
      );

    case 'diagram':
      return (
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <pre className="text-xs text-gray-500">{block.content}</pre>
          {block.caption && (
            <p className="text-xs text-gray-500 mt-2 italic">{block.caption}</p>
          )}
        </div>
      );

    default:
      return null;
  }
}
