'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStrings } from '@/contexts/LanguageContext';
import { SmartPageHeader } from '@/components/navigation/SmartPageHeader';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getUserSocialProfile, 
  getPendingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  followUser,
  unfollowUser,
  sendFriendRequest,
  type Friend,
  type FriendRequest,
  type UserSocialProfile
} from '@/utils/socialFeatures';
import { collection, query, where, getDocs, doc, getDoc, limit as fbLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

type Tab = 'friends' | 'requests' | 'find' | 'following';

interface UserSearchResult {
  id: string;
  displayName: string;
  photoURL?: string;
  email: string;
  isFriend: boolean;
  hasRequest: boolean;
  isFollowing?: boolean;
}

export function FriendsPage() {
  const { user } = useAuth();
  const strings = useStrings();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [socialProfile, setSocialProfile] = useState<UserSocialProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);
  const [followers, setFollowers] = useState<string[]>([]);
  const [followingUserDetails, setFollowingUserDetails] = useState<UserSearchResult[]>([]);
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: '',
    isDestructive: false,
    onConfirm: () => {},
    onCancel: () => {},
    loading: false
  });

  useEffect(() => {
    if (user) {
      loadSocialData();
    } else {
      router.push('/account');
    }
  }, [user]);

  // Helper function to show dialog
  const showDialog = (title: string, message: string, isError: boolean = false) => {
    setDialogConfig({
      title,
      message,
      confirmText: 'OK',
      cancelText: '',
      isDestructive: isError,
      onConfirm: () => setDialogOpen(false),
      onCancel: () => setDialogOpen(false),
      loading: false
    });
    setDialogOpen(true);
  };

  const loadSocialData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load user's social profile
      const profile = await getUserSocialProfile(user.uid);
      setSocialProfile(profile);
      setFriends(profile?.friends || []);
      setFollowingUsers(profile?.following || []);
      setFollowers(profile?.followers || []);

      // Load pending friend requests
      const requests = await getPendingFriendRequests(user.uid);
      setFriendRequests(requests);
      
      // Load following user details
      if (profile?.following && profile.following.length > 0) {
        await loadFollowingDetails(profile.following);
      }
    } catch (error) {
      console.error('Error loading social data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadFollowingDetails = async (userIds: string[]) => {
    const details: UserSearchResult[] = [];
    
    for (const userId of userIds) {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          details.push({
            id: userId,
            displayName: userData.displayName || userData.email?.split('@')[0] || 'Anonymous',
            photoURL: userData.photoURL || userData.avatar,
            email: userData.email,
            isFriend: friends.some(f => f.userId === userId),
            hasRequest: false,
            isFollowing: true
          });
        }
      } catch (error) {
        console.error(`Error loading user details for ${userId}:`, error);
      }
    }
    
    setFollowingUserDetails(details);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !user) return;
    
    setSearching(true);
    try {
      // Search users by display name or email
      const usersRef = collection(db, 'users');
      
      // Search by email (exact match)
      const emailQuery = query(
        usersRef,
        where('email', '==', searchQuery.toLowerCase()),
        fbLimit(10)
      );
      
      const emailSnapshot = await getDocs(emailQuery);
      const results: UserSearchResult[] = [];
      
      for (const doc of emailSnapshot.docs) {
        if (doc.id === user.uid) continue; // Skip self
        
        const userData = doc.data();
        const isFriend = friends.some(f => f.userId === doc.id);
        const hasRequest = friendRequests.some(r => 
          (r.fromUserId === doc.id || r.toUserId === doc.id) && r.status === 'pending'
        );
        const isFollowing = followingUsers.includes(doc.id);
        
        results.push({
          id: doc.id,
          displayName: userData.displayName || userData.email?.split('@')[0] || 'Anonymous',
          photoURL: userData.photoURL,
          email: userData.email,
          isFriend,
          hasRequest,
          isFollowing
        });
      }
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUser: UserSearchResult) => {
    if (!user) return;
    
    try {
      await sendFriendRequest(
        user.uid,
        user.displayName || user.email || 'Anonymous',
        user.photoURL || null,
        targetUser.id,
        targetUser.displayName,
        targetUser.photoURL || null
      );
      
      showDialog('Success', 'Friend request sent!');
      // Refresh search results
      handleSearch();
    } catch (error) {
      console.error('Error sending friend request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send friend request';
      showDialog(
        errorMessage.includes('Check your Requests tab') ? 'Info' : 'Error',
        errorMessage === 'Friend request already sent' ? 'You already sent a friend request to this user' :
        errorMessage === 'Already friends' ? 'You are already friends with this user' :
        errorMessage.includes('Check your Requests tab') ? errorMessage :
        'Failed to send friend request. Please try again.',
        !errorMessage.includes('Check your Requests tab')
      );
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      await loadSocialData();
      showDialog('Success', 'Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      showDialog('Error', 'Failed to accept friend request. Please try again.', true);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      await loadSocialData();
      showDialog('Info', 'Friend request declined');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      showDialog('Error', 'Failed to decline friend request. Please try again.', true);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!user || !confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      await removeFriend(user.uid, friendId);
      await loadSocialData();
      showDialog('Info', 'Friend removed');
    } catch (error) {
      console.error('Error removing friend:', error);
      showDialog('Error', 'Failed to remove friend. Please try again.', true);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    if (!user) return;
    
    try {
      await followUser(user.uid, targetUserId);
      setFollowingUsers([...followingUsers, targetUserId]);
      
      // Add to following details if we have their info
      const userInSearch = searchResults.find(u => u.id === targetUserId);
      if (userInSearch) {
        setFollowingUserDetails([...followingUserDetails, { ...userInSearch, isFollowing: true }]);
      }
      
      // Update search results if visible
      setSearchResults(searchResults.map(u => 
        u.id === targetUserId ? { ...u, isFollowing: true } : u
      ));
      showDialog('Success', 'Following user!');
    } catch (error) {
      console.error('Error following user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to follow user';
      showDialog(
        'Error',
        errorMessage === 'Already following this user' ? 'You are already following this user' :
        'Failed to follow user. Please try again.',
        true
      );
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!user) return;
    
    try {
      await unfollowUser(user.uid, targetUserId);
      setFollowingUsers(followingUsers.filter(id => id !== targetUserId));
      // Update following user details
      setFollowingUserDetails(followingUserDetails.filter(u => u.id !== targetUserId));
      // Update search results if visible
      setSearchResults(searchResults.map(u => 
        u.id === targetUserId ? { ...u, isFollowing: false } : u
      ));
      showDialog('Info', 'Unfollowed user');
    } catch (error) {
      console.error('Error unfollowing user:', error);
      showDialog('Error', 'Failed to unfollow user. Please try again.', true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-nav-padding">
        {/* Header */}
        <SmartPageHeader 
          title="👥 Friends"
          description="Connect with other learners"
        />

        {/* Tabs */}
        <div className="px-4 pb-4">
          <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-shrink-0 px-3 py-2 rounded-md transition-colors text-sm ${
                activeTab === 'friends'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Friends ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex-shrink-0 px-3 py-2 rounded-md transition-colors relative text-sm ${
                activeTab === 'requests'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Requests
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {friendRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('find')}
              className={`flex-shrink-0 px-3 py-2 rounded-md transition-colors text-sm ${
                activeTab === 'find'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Find
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-shrink-0 px-3 py-2 rounded-md transition-colors text-sm ${
                activeTab === 'following'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Following ({followingUsers.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4">
          <AnimatePresence mode="wait">
            {/* Friends List */}
            {activeTab === 'friends' && (
              <motion.div
                key="friends"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="bg-card rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">No friends yet. Find and connect with other learners!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.userId}
                        className="bg-card rounded-lg p-4 flex items-center gap-3 border border-border"
                      >
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {friend.photoURL ? (
                            <img 
                              src={friend.photoURL} 
                              alt={friend.displayName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-lg">👤</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{friend.displayName}</p>
                          <p className="text-sm text-muted-foreground">
                            Friends since {new Date(friend.addedAt.toDate()).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveFriend(friend.userId)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Friend Requests */}
            {activeTab === 'requests' && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : friendRequests.length === 0 ? (
                  <div className="bg-card rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">No pending friend requests</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friendRequests.map((request) => (
                      <div
                        key={request.id}
                        className="bg-card rounded-lg p-4 border border-border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {request.fromUserPhoto ? (
                              <img 
                                src={request.fromUserPhoto} 
                                alt={request.fromUserName}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-lg">👤</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{request.fromUserName}</p>
                            <p className="text-sm text-muted-foreground">Wants to be your friend</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleAcceptRequest(request.id)}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request.id)}
                            className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Find Friends */}
            {activeTab === 'find' && (
              <motion.div
                key="find"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="bg-card rounded-lg p-4 mb-4 border border-border">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search by email address..."
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={searching || !searchQuery.trim()}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {searching ? '...' : 'Search'}
                    </button>
                  </div>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="bg-card rounded-lg p-4 flex items-center gap-3 border border-border"
                      >
                        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                          {result.photoURL ? (
                            <img 
                              src={result.photoURL} 
                              alt={result.displayName}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className="text-lg">👤</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{result.displayName}</p>
                          <p className="text-sm text-muted-foreground truncate">{result.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Follow/Unfollow button */}
                          {result.isFollowing ? (
                            <button
                              onClick={() => handleUnfollow(result.id)}
                              className="px-3 py-1 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm whitespace-nowrap"
                            >
                              Following
                            </button>
                          ) : (
                            <button
                              onClick={() => handleFollow(result.id)}
                              className="px-3 py-1 bg-secondary text-secondary-foreground rounded-lg hover:opacity-90 transition-opacity text-sm whitespace-nowrap"
                            >
                              Follow
                            </button>
                          )}
                          
                          {/* Friend button - use icon on mobile */}
                          {result.isFriend ? (
                            <span className="text-sm text-muted-foreground hidden sm:inline">Friends</span>
                          ) : result.hasRequest ? (
                            <span className="text-sm text-muted-foreground hidden sm:inline">Pending</span>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(result)}
                              className="bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                              title="Add Friend"
                            >
                              <span className="px-3 py-1 hidden sm:inline-block text-sm">Add Friend</span>
                              <span className="w-8 h-8 flex sm:hidden items-center justify-center text-lg">+</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Following Tab */}
            {activeTab === 'following' && (
              <motion.div
                key="following"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : followingUsers.length === 0 ? (
                  <div className="bg-card rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">You're not following anyone yet. Find users to follow!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm text-muted-foreground">
                        <strong>Following:</strong> {followingUsers.length} users | <strong>Followers:</strong> {followers.length} users
                      </p>
                    </div>
                    <div className="space-y-2">
                      {followingUserDetails.map((user) => (
                        <div
                          key={user.id}
                          className="bg-card rounded-lg p-4 flex items-center gap-3 border border-border"
                        >
                          <div className="w-12 h-12 flex-shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {user.photoURL ? (
                              <img 
                                src={user.photoURL} 
                                alt={user.displayName}
                                className={`w-full h-full ${user.photoURL.includes('.svg') || user.photoURL.includes('flat-icons') ? 'object-contain p-1' : 'object-cover'}`}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-lg">👤</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{user.displayName}</p>
                            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleUnfollow(user.id)}
                              className="px-3 py-1 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm whitespace-nowrap"
                            >
                              Following
                            </button>
                            {user.isFriend && (
                              <span className="text-sm text-muted-foreground">Friends</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={dialogOpen}
        title={dialogConfig.title}
        message={dialogConfig.message}
        confirmText={dialogConfig.confirmText}
        cancelText={dialogConfig.cancelText}
        isDestructive={dialogConfig.isDestructive}
        onConfirm={dialogConfig.onConfirm}
        onCancel={dialogConfig.onCancel}
        loading={dialogConfig.loading}
      />
    </div>
  );
}