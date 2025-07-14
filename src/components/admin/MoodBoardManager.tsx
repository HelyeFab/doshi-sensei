'use client';

import { useState, useEffect } from 'react';
import { useMoodBoards } from '@/hooks/useMoodBoards';
import { MoodBoard } from '@/types/moodBoard';
import Link from 'next/link';
import DeleteConfirmationModal from '@/components/admin/DeleteConfirmationModal';

interface MoodBoardManagerProps {
  searchQuery: string;
  filterJLPT: 'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
}

export function MoodBoardManager({ searchQuery, filterJLPT }: MoodBoardManagerProps) {
  const { moodBoards, loading, error, refreshMoodBoards, deleteMoodBoard, toggleMoodBoardStatus } = useMoodBoards();
  const [filteredBoards, setFilteredBoards] = useState<MoodBoard[]>([]);
  const [sortBy, setSortBy] = useState<'title' | 'jlpt' | 'updated' | 'kanji_count'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    boardId: string;
    boardTitle: string;
  }>({ isOpen: false, boardId: '', boardTitle: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter and search mood boards
  useEffect(() => {
    let filtered = moodBoards;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(board =>
        board.title.toLowerCase().includes(query) ||
        board.emoji.includes(query) ||
        board.description?.toLowerCase().includes(query) ||
        board.kanji.some(k => k.char.includes(query) || k.meaning?.toLowerCase().includes(query))
      );
    }

    // Apply JLPT filter
    if (filterJLPT !== 'all') {
      filtered = filtered.filter(board => board.jlpt === filterJLPT);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'jlpt':
          const jlptOrder = ['N5', 'N4', 'N3', 'N2', 'N1'];
          comparison = jlptOrder.indexOf(a.jlpt) - jlptOrder.indexOf(b.jlpt);
          break;
        case 'updated':
          comparison = new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
          break;
        case 'kanji_count':
          comparison = a.kanji.length - b.kanji.length;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredBoards(filtered);
  }, [moodBoards, searchQuery, filterJLPT, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleDeleteClick = (board: MoodBoard) => {
    setDeleteModal({
      isOpen: true,
      boardId: board.id,
      boardTitle: board.title
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.boardId) return;
    
    setIsDeleting(true);
    try {
      await deleteMoodBoard(deleteModal.boardId);
      await refreshMoodBoards();
      setDeleteModal({ isOpen: false, boardId: '', boardTitle: '' });
    } catch (error) {
      console.error('Failed to delete mood board:', error);
      // TODO: Show error notification
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, boardId: '', boardTitle: '' });
  };

  const handleToggleStatus = async (boardId: string, currentStatus: boolean) => {
    try {
      await toggleMoodBoardStatus(boardId, !currentStatus);
      await refreshMoodBoards();
    } catch (error) {
      console.error('Failed to toggle mood board status:', error);
      // TODO: Show error notification
    }
  };

  const getJLPTBadge = (jlpt: string) => {
    const colors = {
      'N5': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'N4': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'N3': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'N2': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'N1': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[jlpt as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {jlpt}
      </span>
    );
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex space-x-4">
              <div className="h-16 bg-muted rounded w-16"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Failed to Load Mood Boards
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={refreshMoodBoards}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg">
      {/* Table header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">
            Mood Boards ({filteredBoards.length})
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
                setSortBy(field);
                setSortOrder(order);
              }}
              className="px-3 py-1 border border-border rounded-lg bg-background text-foreground text-sm"
            >
              <option value="updated-desc">Latest Updated</option>
              <option value="updated-asc">Oldest Updated</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="jlpt-asc">JLPT Level (N5→N1)</option>
              <option value="jlpt-desc">JLPT Level (N1→N5)</option>
              <option value="kanji_count-desc">Most Kanji</option>
              <option value="kanji_count-asc">Least Kanji</option>
            </select>

            <button
              onClick={refreshMoodBoards}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              title="Refresh mood boards"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mood boards list */}
      {filteredBoards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🎨</div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No Mood Boards Found
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || filterJLPT !== 'all'
              ? 'Try adjusting your search or filters'
              : 'No mood boards have been created yet'
            }
          </p>
          <Link
            href="/admin/mood-boards/new"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create First Mood Board
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredBoards.map((board) => (
            <div key={board.id} className="p-6 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-4">
                {/* Board preview */}
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center text-2xl border border-border"
                  style={{ background: board.background || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                >
                  {board.emoji}
                </div>

                {/* Board info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-foreground mb-1">
                        {board.title}
                      </h4>
                      {board.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {board.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{board.kanji.length} kanji</span>
                        <span>•</span>
                        <span>{getJLPTBadge(board.jlpt)}</span>
                        <span>•</span>
                        <span>Updated {formatDate(board.updatedAt || board.createdAt)}</span>
                        <span>•</span>
                        <span className={board.isActive ? 'text-green-600' : 'text-red-600'}>
                          {board.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/mood-boards/${board.id}/edit`}
                        className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Edit
                      </Link>

                      <button
                        onClick={() => handleToggleStatus(board.id, board.isActive)}
                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                          board.isActive
                            ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200'
                        }`}
                      >
                        {board.isActive ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        onClick={() => handleDeleteClick(board)}
                        className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-lg hover:bg-red-200 dark:bg-red-900 dark:text-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Kanji preview */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {board.kanji.slice(0, 10).map((kanji, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center justify-center w-6 h-6 bg-muted rounded text-xs font-medium"
                        title={kanji.meaning || kanji.char}
                      >
                        {kanji.char}
                      </span>
                    ))}
                    {board.kanji.length > 10 && (
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-muted rounded text-xs text-muted-foreground">
                        +{board.kanji.length - 10}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Delete Confirmation Modal */}
    <DeleteConfirmationModal
      isOpen={deleteModal.isOpen}
      title="Delete Mood Board"
      message="Are you sure you want to delete this mood board?"
      itemName={deleteModal.boardTitle}
      onConfirm={handleDeleteConfirm}
      onCancel={handleDeleteCancel}
      isDeleting={isDeleting}
    />
  );
}
