import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, serverTimestamp, query, where, orderBy, limit, Timestamp, arrayUnion, arrayRemove, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  toUserId: string;
  toUserName: string;
  toUserPhoto?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Friend {
  userId: string;
  displayName: string;
  photoURL?: string;
  addedAt: Timestamp;
}

export interface UserSocialProfile {
  userId: string;
  followers: string[]; // Array of user IDs
  following: string[]; // Array of user IDs
  friends: Friend[];
  friendRequests: string[]; // Array of request IDs
  isPublic: boolean;
  allowChallenges: boolean;
  lastUpdated: Timestamp;
}

export interface Challenge {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  toUserId: string;
  toUserName: string;
  toUserPhoto?: string;
  type: 'daily-streak' | 'total-activities' | 'accuracy' | 'specific-game';
  duration: 'day' | 'week' | 'month';
  targetValue?: number; // For specific targets
  gameType?: string; // For specific game challenges
  status: 'pending' | 'active' | 'completed' | 'declined';
  winner?: string; // User ID of winner
  startDate?: Timestamp;
  endDate?: Timestamp;
  createdAt: Timestamp;
  fromUserProgress?: number;
  toUserProgress?: number;
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(
  fromUserId: string,
  fromUserName: string,
  fromUserPhoto: string | undefined,
  toUserId: string,
  toUserName: string,
  toUserPhoto: string | undefined
): Promise<string> {
  // Check if request already exists
  const existingRequest = await checkExistingFriendRequest(fromUserId, toUserId);
  if (existingRequest) {
    // Check if it's from the other user
    const q = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', toUserId),
      where('toUserId', '==', fromUserId),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      throw new Error('This user already sent you a friend request. Check your Requests tab!');
    }
    throw new Error('Friend request already sent');
  }

  // Check if already friends
  const areFriends = await checkIfFriends(fromUserId, toUserId);
  if (areFriends) {
    throw new Error('Already friends');
  }

  const requestId = `${fromUserId}_${toUserId}_${Date.now()}`;
  const request: FriendRequest = {
    id: requestId,
    fromUserId,
    fromUserName,
    fromUserPhoto: fromUserPhoto || null,
    toUserId,
    toUserName,
    toUserPhoto: toUserPhoto || null,
    status: 'pending',
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };

  // Save friend request
  await setDoc(doc(db, 'friendRequests', requestId), request);

  // Ensure both users have social profiles
  await getUserSocialProfile(fromUserId);
  await getUserSocialProfile(toUserId);

  // Update both users' social profiles (use setDoc with merge to handle non-existent docs)
  await setDoc(doc(db, 'userSocial', fromUserId), {
    friendRequests: arrayUnion(requestId),
    lastUpdated: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, 'userSocial', toUserId), {
    friendRequests: arrayUnion(requestId),
    lastUpdated: serverTimestamp()
  }, { merge: true });

  return requestId;
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
  if (!requestDoc.exists()) {
    throw new Error('Friend request not found');
  }

  const request = requestDoc.data() as FriendRequest;
  if (request.status !== 'pending') {
    throw new Error('Friend request already processed');
  }

  // Update request status
  await updateDoc(doc(db, 'friendRequests', requestId), {
    status: 'accepted',
    updatedAt: serverTimestamp()
  });

  // Add friends to both users
  const fromUserFriend: Friend = {
    userId: request.toUserId,
    displayName: request.toUserName,
    photoURL: request.toUserPhoto,
    addedAt: serverTimestamp() as Timestamp
  };

  const toUserFriend: Friend = {
    userId: request.fromUserId,
    displayName: request.fromUserName,
    photoURL: request.fromUserPhoto,
    addedAt: serverTimestamp() as Timestamp
  };

  // Ensure both users have social profiles
  await getUserSocialProfile(request.fromUserId);
  await getUserSocialProfile(request.toUserId);

  await setDoc(doc(db, 'userSocial', request.fromUserId), {
    friends: arrayUnion(fromUserFriend),
    lastUpdated: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, 'userSocial', request.toUserId), {
    friends: arrayUnion(toUserFriend),
    lastUpdated: serverTimestamp()
  }, { merge: true });
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  const requestDoc = await getDoc(doc(db, 'friendRequests', requestId));
  if (!requestDoc.exists()) {
    throw new Error('Friend request not found');
  }

  const request = requestDoc.data() as FriendRequest;

  // Update request status
  await updateDoc(doc(db, 'friendRequests', requestId), {
    status: 'rejected',
    updatedAt: serverTimestamp()
  });

  // Ensure both users have social profiles
  await getUserSocialProfile(request.fromUserId);
  await getUserSocialProfile(request.toUserId);

  // Remove from both users' pending requests
  await setDoc(doc(db, 'userSocial', request.fromUserId), {
    friendRequests: arrayRemove(requestId),
    lastUpdated: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, 'userSocial', request.toUserId), {
    friendRequests: arrayRemove(requestId),
    lastUpdated: serverTimestamp()
  }, { merge: true });
}

/**
 * Follow a user
 */
export async function followUser(followerId: string, targetUserId: string): Promise<void> {
  // Check if already following
  const socialProfile = await getUserSocialProfile(followerId);
  if (socialProfile?.following.includes(targetUserId)) {
    throw new Error('Already following this user');
  }

  // Ensure target user has social profile
  await getUserSocialProfile(targetUserId);

  // Update follower's following list
  await setDoc(doc(db, 'userSocial', followerId), {
    following: arrayUnion(targetUserId),
    lastUpdated: serverTimestamp()
  }, { merge: true });

  // Update target's followers list
  await setDoc(doc(db, 'userSocial', targetUserId), {
    followers: arrayUnion(followerId),
    lastUpdated: serverTimestamp()
  }, { merge: true });
}

/**
 * Unfollow a user
 */
export async function unfollowUser(followerId: string, targetUserId: string): Promise<void> {
  // Update follower's following list
  await setDoc(doc(db, 'userSocial', followerId), {
    following: arrayRemove(targetUserId),
    lastUpdated: serverTimestamp()
  }, { merge: true });

  // Update target's followers list
  await setDoc(doc(db, 'userSocial', targetUserId), {
    followers: arrayRemove(followerId),
    lastUpdated: serverTimestamp()
  }, { merge: true });
}

/**
 * Get user's social profile
 */
export async function getUserSocialProfile(userId: string): Promise<UserSocialProfile | null> {
  const profileDoc = await getDoc(doc(db, 'userSocial', userId));
  if (!profileDoc.exists()) {
    // Create default profile
    const defaultProfile: UserSocialProfile = {
      userId,
      followers: [],
      following: [],
      friends: [],
      friendRequests: [],
      isPublic: true,
      allowChallenges: true,
      lastUpdated: serverTimestamp() as Timestamp
    };
    await setDoc(doc(db, 'userSocial', userId), defaultProfile);
    return defaultProfile;
  }
  return profileDoc.data() as UserSocialProfile;
}

/**
 * Get pending friend requests for a user
 */
export async function getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
  const q = query(
    collection(db, 'friendRequests'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as FriendRequest);
}

/**
 * Check if two users are friends
 */
export async function checkIfFriends(userId1: string, userId2: string): Promise<boolean> {
  const profile = await getUserSocialProfile(userId1);
  if (!profile) return false;
  return profile.friends.some(friend => friend.userId === userId2);
}

/**
 * Check if a friend request already exists
 */
export async function checkExistingFriendRequest(fromUserId: string, toUserId: string): Promise<boolean> {
  // Check if current user already sent a request
  const q1 = query(
    collection(db, 'friendRequests'),
    where('fromUserId', '==', fromUserId),
    where('toUserId', '==', toUserId),
    where('status', '==', 'pending')
  );
  
  const snapshot1 = await getDocs(q1);
  if (!snapshot1.empty) {
    return true;
  }
  
  // Also check if the other user already sent a request to us
  const q2 = query(
    collection(db, 'friendRequests'),
    where('fromUserId', '==', toUserId),
    where('toUserId', '==', fromUserId),
    where('status', '==', 'pending')
  );
  
  const snapshot2 = await getDocs(q2);
  return !snapshot2.empty;
}

/**
 * Remove a friend
 */
export async function removeFriend(userId: string, friendId: string): Promise<void> {
  const userProfile = await getUserSocialProfile(userId);
  const friendProfile = await getUserSocialProfile(friendId);
  
  if (!userProfile || !friendProfile) {
    throw new Error('User profiles not found');
  }

  // Remove from user's friends list
  const updatedUserFriends = userProfile.friends.filter(f => f.userId !== friendId);
  await setDoc(doc(db, 'userSocial', userId), {
    friends: updatedUserFriends,
    lastUpdated: serverTimestamp()
  }, { merge: true });

  // Remove from friend's friends list
  const updatedFriendFriends = friendProfile.friends.filter(f => f.userId !== userId);
  await setDoc(doc(db, 'userSocial', friendId), {
    friends: updatedFriendFriends,
    lastUpdated: serverTimestamp()
  }, { merge: true });
}

/**
 * Create a challenge
 */
export async function createChallenge(
  fromUserId: string,
  fromUserName: string,
  fromUserPhoto: string | undefined,
  toUserId: string,
  toUserName: string,
  toUserPhoto: string | undefined,
  type: Challenge['type'],
  duration: Challenge['duration'],
  targetValue?: number,
  gameType?: string
): Promise<string> {
  // Check if users are friends
  const areFriends = await checkIfFriends(fromUserId, toUserId);
  if (!areFriends) {
    throw new Error('Can only challenge friends');
  }

  // Check if target allows challenges
  const targetProfile = await getUserSocialProfile(toUserId);
  if (!targetProfile?.allowChallenges) {
    throw new Error('User does not accept challenges');
  }

  const challengeId = `${fromUserId}_${toUserId}_${Date.now()}`;
  const challenge: Challenge = {
    id: challengeId,
    fromUserId,
    fromUserName,
    fromUserPhoto,
    toUserId,
    toUserName,
    toUserPhoto,
    type,
    duration,
    targetValue,
    gameType,
    status: 'pending',
    createdAt: serverTimestamp() as Timestamp,
    fromUserProgress: 0,
    toUserProgress: 0
  };

  await setDoc(doc(db, 'challenges', challengeId), challenge);
  return challengeId;
}

/**
 * Accept a challenge
 */
export async function acceptChallenge(challengeId: string): Promise<void> {
  const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
  if (!challengeDoc.exists()) {
    throw new Error('Challenge not found');
  }

  const challenge = challengeDoc.data() as Challenge;
  if (challenge.status !== 'pending') {
    throw new Error('Challenge already processed');
  }

  // Calculate end date based on duration
  const now = new Date();
  let endDate = new Date();
  
  switch (challenge.duration) {
    case 'day':
      endDate.setDate(now.getDate() + 1);
      break;
    case 'week':
      endDate.setDate(now.getDate() + 7);
      break;
    case 'month':
      endDate.setMonth(now.getMonth() + 1);
      break;
  }

  await updateDoc(doc(db, 'challenges', challengeId), {
    status: 'active',
    startDate: serverTimestamp(),
    endDate: Timestamp.fromDate(endDate)
  });
}

/**
 * Decline a challenge
 */
export async function declineChallenge(challengeId: string): Promise<void> {
  await updateDoc(doc(db, 'challenges', challengeId), {
    status: 'declined'
  });
}

/**
 * Get active challenges for a user
 */
export async function getActiveChallenges(userId: string): Promise<Challenge[]> {
  const q1 = query(
    collection(db, 'challenges'),
    where('fromUserId', '==', userId),
    where('status', '==', 'active')
  );
  
  const q2 = query(
    collection(db, 'challenges'),
    where('toUserId', '==', userId),
    where('status', '==', 'active')
  );
  
  const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  
  const challenges = [
    ...snapshot1.docs.map(doc => doc.data() as Challenge),
    ...snapshot2.docs.map(doc => doc.data() as Challenge)
  ];
  
  return challenges;
}

/**
 * Update challenge progress
 */
export async function updateChallengeProgress(
  challengeId: string,
  userId: string,
  progress: number
): Promise<void> {
  const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
  if (!challengeDoc.exists()) {
    throw new Error('Challenge not found');
  }

  const challenge = challengeDoc.data() as Challenge;
  
  if (userId === challenge.fromUserId) {
    await updateDoc(doc(db, 'challenges', challengeId), {
      fromUserProgress: progress
    });
  } else if (userId === challenge.toUserId) {
    await updateDoc(doc(db, 'challenges', challengeId), {
      toUserProgress: progress
    });
  }
}